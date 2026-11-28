const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');
const { currencyForRegion } = require('../utils/regions');
const { releaseCancelledPromo } = require('./promoRedemptions');
const states = ['created','confirmed','shipped','delivered','completed','cancelled'];
function parse(value, fallback) { try { const result=JSON.parse(value);return result && typeof result === 'object' ? result : fallback; } catch { return fallback; } }
function lineCents(item) { const value=Number.isFinite(item.lineTotal)?item.lineTotal:Number(item.price)*Number(item.qty);return Number.isFinite(value)?Math.round(value*100):0; }
function sellerItems(order,sellerId) { const items=parse(order.items,[]);return Array.isArray(items)?items.filter(item => item?.sellerId === sellerId):[]; }
function nextStatuses(status,pickup=false) { return ({created:['confirmed','cancelled'],confirmed:pickup?['delivered','cancelled']:['shipped','cancelled'],shipped:['delivered'],delivered:['completed'],completed:[],cancelled:[]})[status] || []; }
function aggregateStatus(rows) {
  const active = rows.filter(row => row.status !== 'cancelled');
  if (!active.length) return 'cancelled';
  for (const status of ['completed','delivered','shipped','confirmed']) if (active.every(row => states.indexOf(row.status) >= states.indexOf(status))) return status;
  return 'created';
}
async function insertFulfillments(db,orderId,items,createdAt) {
  for (const sellerId of new Set(items.map(item=>item.sellerId).filter(Boolean))) {
    await db.prepare('INSERT INTO order_fulfillments (orderId,sellerId,status,createdAt) VALUES (?,?,?,?)').run(orderId,sellerId,'created',createdAt);
  }
}
async function transition(db,order,row,status,changedBy,legacyAdmin=false) {
  const checkout = parse(order.checkoutData,{});
  if (!nextStatuses(row.status,!legacyAdmin && checkout.deliveryMethod === 'pickup').includes(status)) throw new AppError(409,'INVALID_STATUS_TRANSITION','This sale cannot move to the requested status');
  const now = Date.now();
  const changed = await db.prepare('UPDATE order_fulfillments SET status=?,updatedAt=? WHERE orderId=? AND sellerId=? AND status=?').run(status,now,order.id,row.sellerId,row.status);
  if (!changed.changes) throw new AppError(409,'INVALID_STATUS_TRANSITION','Sale status has already changed');
  if (status === 'cancelled') for (const item of sellerItems(order,row.sellerId)) {
    if (!Number.isInteger(item.qty) || item.qty <= 0) throw new AppError(409,'INVALID_ORDER_ITEMS','Cannot restore invalid quantities');
    await db.prepare('UPDATE products SET stock=stock+?,updatedAt=? WHERE id=?').run(item.qty,now,item.productId || item.id);
  }
  await db.prepare('INSERT INTO fulfillment_history (id,orderId,sellerId,status,changedBy,createdAt) VALUES (?,?,?,?,?,?)').run(uuidv4(),order.id,row.sellerId,status,changedBy,now);
}
async function synchronizeOrder(db,order,changedBy) {
  const rows = await db.prepare('SELECT sellerId,status,updatedAt FROM order_fulfillments WHERE orderId=?').all(order.id);
  const status = aggregateStatus(rows);
  await db.prepare('UPDATE orders SET status=?,updatedAt=? WHERE id=?').run(status,Date.now(),order.id);
  if (status === 'cancelled') await releaseCancelledPromo(db, order, changedBy);
  if (order.status !== status) await db.prepare('INSERT INTO order_status_history (id,orderId,status,changedBy,createdAt) VALUES (?,?,?,?,?)').run(uuidv4(),order.id,status,changedBy,Date.now());
  return rows;
}
async function changeSale({orderId,sellerId,actorId,status,buyerReceipt=false}) {
  const db=getDB();
  await db.transaction(async()=>{
    const order=await db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    const row=await db.prepare('SELECT * FROM order_fulfillments WHERE orderId=? AND sellerId=?').get(orderId,sellerId);
    if (!order || !row || (buyerReceipt ? order.userId !== actorId : sellerId !== actorId)) throw new AppError(404,'SALE_NOT_FOUND','Sale not found');
    if (buyerReceipt ? status !== 'completed' : status === 'completed') throw new AppError(403,'BUYER_CONFIRMATION_REQUIRED','Only the buyer can confirm receipt');
    await transition(db,order,row,status,actorId);
    await synchronizeOrder(db,order,actorId);
  }).immediate();
}
async function changeGlobalStatus({orderId,status,changedBy}) {
  const db=getDB();
  await db.transaction(async()=>{
    const order=await db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
    if (!order) throw new AppError(404,'ORDER_NOT_FOUND','Order not found');
    if (!nextStatuses(order.status).includes(status)) throw new AppError(409,'INVALID_STATUS_TRANSITION','Invalid order status transition');
    const rows=await db.prepare('SELECT * FROM order_fulfillments WHERE orderId=?').all(orderId);
    if (!rows.length) throw new AppError(409,'SELLER_UNAVAILABLE','Historical order has no seller snapshot; manual reconciliation is required');
    for (const row of rows) {
      if (row.status === 'cancelled' || row.status === status) continue;
      if (status !== 'cancelled' && states.indexOf(row.status)>states.indexOf(status)) continue;
      await transition(db,order,row,status,changedBy,true);
    }
    await synchronizeOrder(db,order,changedBy);
  }).immediate();
}
function shipmentData(row) {
  return { carrier: row.shipmentCarrier || '', trackingNumber: row.trackingNumber || '', revision: row.shipmentRevision || 0, updatedAt: row.shipmentUpdatedAt || null };
}
function fulfillmentTimeline(row, history) {
  return [{ id: 'created', status: 'created', createdAt: row.fulfillmentCreatedAt || row.createdAt }, ...history];
}
async function orderFulfillments(orderId) {
  const db = getDB();
  const rows = await db.prepare('SELECT * FROM order_fulfillments WHERE orderId=?').all(orderId);
  const history = await db.prepare('SELECT id,sellerId,status,createdAt FROM fulfillment_history WHERE orderId=? ORDER BY createdAt,rowid').all(orderId);
  return rows.map(row => ({ sellerId: row.sellerId, status: row.status, updatedAt: row.updatedAt,
    shipment: shipmentData(row), history: fulfillmentTimeline(row, history.filter(item => item.sellerId === row.sellerId).map(({ id, status, createdAt }) => ({ id, status, createdAt }))) }));
}
async function saveShipment({ orderId, sellerId, body }) {
  if (!body || !Number.isSafeInteger(body.revision) || body.revision < 0 || typeof body.carrier !== 'string' || typeof body.trackingNumber !== 'string') throw new AppError(400,'VALIDATION_ERROR','Check shipment fields');
  const carrier = body.carrier.trim(), trackingNumber = body.trackingNumber.trim();
  if (carrier.length > 60 || trackingNumber.length > 80 || /[\r\n\0]/.test(carrier) || (Boolean(carrier) !== Boolean(trackingNumber)) || (trackingNumber && !/^[a-z0-9][a-z0-9 ._/-]{1,79}$/i.test(trackingNumber))) throw new AppError(400,'VALIDATION_ERROR','Enter a carrier and a valid tracking number, or clear both');
  const db = getDB();
  return db.transaction(async () => {
    const row = await db.prepare('SELECT f.*,o.checkoutData FROM order_fulfillments f JOIN orders o ON o.id=f.orderId WHERE f.orderId=? AND f.sellerId=?').get(orderId,sellerId);
    if (!row) throw new AppError(404,'SALE_NOT_FOUND','Sale not found');
    if (!['confirmed','shipped'].includes(row.status) || parse(row.checkoutData,{}).deliveryMethod === 'pickup') throw new AppError(409,'SHIPMENT_NOT_EDITABLE','Shipment details cannot be edited at this stage');
    if (row.shipmentRevision !== body.revision) throw new AppError(409,'SHIPMENT_CHANGED','Shipment details changed. Refresh before saving');
    if (row.shipmentCarrier === carrier && row.trackingNumber === trackingNumber) return shipmentData(row);
    const now = Date.now();
    const changed = await db.prepare('UPDATE order_fulfillments SET shipmentCarrier=?,trackingNumber=?,shipmentRevision=shipmentRevision+1,shipmentUpdatedAt=? WHERE orderId=? AND sellerId=? AND shipmentRevision=?').run(carrier,trackingNumber,now,orderId,sellerId,body.revision);
    if (!changed.changes) throw new AppError(409,'SHIPMENT_CHANGED','Refresh before saving');
    await db.prepare('INSERT INTO fulfillment_history (id,orderId,sellerId,status,changedBy,createdAt) VALUES (?,?,?,?,?,?)').run(uuidv4(),orderId,sellerId,'shipment_updated',sellerId,now);
    return { carrier, trackingNumber, revision: body.revision + 1, updatedAt: now };
  }).immediate();
}

function projectSale(row, history = []) {
  const items=sellerItems(row,row.sellerId);
  const checkout=parse(row.checkoutData,{});
  const delivery={};
  for (const key of ['deliveryMethod','deliveryOption','deliveryCarrier','paymentMethod','paymentStatus']) if (checkout[key]) delivery[key]=checkout[key];
  const recipient={};
  if (row.saleStatus !== 'cancelled') {
    if (checkout.name) recipient.name=checkout.name;
    if (row.saleStatus !== 'created') for (const key of ['phone','address','city','postalCode','country','deliveryPoint']) if (checkout[key]) recipient[key]=checkout[key];
  }
  return {orderId:row.id,shipment:shipmentData(row),history:fulfillmentTimeline(row,history),status:row.saleStatus,createdAt:row.createdAt,updatedAt:row.saleUpdatedAt,items:items.map(item=>({id:item.productId || item.id,title:item.title,image:item.image,price:item.price,qty:item.qty,lineTotal:lineCents(item)/100,condition:item.condition,supplyDetails:Object.fromEntries(['deliveryTerms','warrantyTerms','returnTerms'].filter(key=>typeof item.supplyDetails?.[key]==='string').map(key=>[key,item.supplyDetails[key]]))})),goodsTotal:items.reduce((sum,item)=>sum+lineCents(item),0)/100,currency:currencyForRegion(row.region),region:row.region,delivery,recipient,nextStatuses:nextStatuses(row.saleStatus,checkout.deliveryMethod==='pickup').filter(status=>status!=='completed')};
}
async function listSales({sellerId,region,days,status,limit=20,offset=0}) {
  const db=getDB();
  const params={sellerId,region,since:days?Date.now()-days*86400000:0};
  const where='f.sellerId=@sellerId AND o.region=@region AND o.createdAt>=@since';
  const groups=await db.prepare(`SELECT f.status,COUNT(DISTINCT o.id) AS orders,SUM(CAST(ROUND(COALESCE(json_extract(j.value,'$.lineTotal'),json_extract(j.value,'$.price')*json_extract(j.value,'$.qty'),0)*100) AS INTEGER)) AS cents,SUM(json_extract(j.value,'$.qty')) AS units FROM order_fulfillments f JOIN orders o ON o.id=f.orderId JOIN json_each(o.items) j WHERE ${where} AND json_extract(j.value,'$.sellerId')=@sellerId GROUP BY f.status`).all(params);
  const summary={orders:0,active:0,completed:0,cancelled:0,orderedCents:0,completedCents:0,completedUnits:0};
  for (const group of groups) {
    summary.orders+=group.orders; summary.orderedCents+=Number(group.cents)||0;
    if (group.status==='completed') { summary.completed+=group.orders;summary.completedCents+=Number(group.cents)||0;summary.completedUnits+=Number(group.units)||0; }
    else if(group.status==='cancelled') summary.cancelled+=group.orders;
    else summary.active+=group.orders;
  }
  const filter=status?' AND f.status=@status':'';
  const listParams=status?{...params,status}:params;
  const total=(await db.prepare(`SELECT COUNT(*) AS total FROM order_fulfillments f JOIN orders o ON o.id=f.orderId WHERE ${where}${filter}`).get(listParams)).total;
  const rows=await db.prepare(`SELECT o.*,f.sellerId,f.status AS saleStatus,f.updatedAt AS saleUpdatedAt,f.createdAt AS fulfillmentCreatedAt,f.shipmentCarrier,f.trackingNumber,f.shipmentRevision,f.shipmentUpdatedAt FROM order_fulfillments f JOIN orders o ON o.id=f.orderId WHERE ${where}${filter} ORDER BY o.createdAt DESC,o.id DESC LIMIT @limit OFFSET @offset`).all({...listParams,limit,offset});
  const history = rows.length ? await db.prepare(`SELECT id,orderId,status,createdAt FROM fulfillment_history WHERE sellerId=? AND orderId IN (${rows.map(()=>'?').join(',')}) ORDER BY createdAt,rowid`).all(sellerId,...rows.map(row=>row.id)) : [];
  const items = rows.map(row => projectSale(row, history.filter(event => event.orderId === row.id).map(({ id, status, createdAt }) => ({ id, status, createdAt }))));
  return {items,total,summary,currency:currencyForRegion(region),region,days,limit,offset};
}
module.exports={saveShipment,insertFulfillments,changeSale,changeGlobalStatus,orderFulfillments,listSales,nextStatuses};
