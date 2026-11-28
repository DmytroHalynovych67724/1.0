const { listSales, changeSale, saveShipment } = require('../models/sales');
const express = require('express');
const { createOrder, getOrder, listOrders, updateOrderStatus } = require('../models/orders');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { publicFulfillmentOptions } = require('../utils/fulfillment');
const { validateOrder, validatePagination } = require('../utils/validation');

const router = express.Router();

router.get('/options', (req, res) => {
  res.json(publicFulfillmentOptions(req.query.region));
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagination = validatePagination(req.query);
    const orders = await listOrders({
      userId: req.user.id,
      includeAll: req.user.role === 'admin' && req.query.scope !== 'mine',
      ...pagination,
    });
    res.json(orders);
  })
);

router.get('/sales', asyncHandler(async(req,res)=>{
  const region=req.query.region || 'pl';
  const days=req.query.days === 'all' ? 0 : Number(req.query.days || 30);
  const status=req.query.status || '';
  if (!['pl','ua','eu'].includes(region) || ![0,7,30,90].includes(days) || !['','created','confirmed','shipped','delivered','completed','cancelled'].includes(status)) throw new AppError(400,'VALIDATION_ERROR','Invalid sales filters');
  res.json(await listSales({sellerId:req.user.id,region,days,status,...validatePagination(req.query)}));
}));
router.patch('/sales/:id/shipment', asyncHandler(async(req,res)=>{
  res.json(await saveShipment({orderId:req.params.id,sellerId:req.user.id,body:req.body}));
}));
router.patch('/sales/:id/status', asyncHandler(async(req,res)=>{
  const status=typeof req.body?.status==='string'?req.body.status:'';
  await changeSale({orderId:req.params.id,sellerId:req.user.id,actorId:req.user.id,status});
  res.json({ok:true});
}));
router.patch('/:id/receipt/:sellerId', asyncHandler(async(req,res)=>{
  await changeSale({orderId:req.params.id,sellerId:req.params.sellerId,actorId:req.user.id,status:'completed',buyerReceipt:true});
  res.json(await getOrder(req.params.id));
}));

router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    res.json(await updateOrderStatus({ orderId: req.params.id, status, changedBy: req.user.id }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { items, checkout, promoCode } = validateOrder(req.body);
    const order = await createOrder({ userId: req.user.id, items, checkout, promoCode });
    res.status(201).json(order);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(403, 'ORDER_ACCESS_DENIED', 'You cannot access this order');
    }
    res.json(order);
  })
);

module.exports = router;
