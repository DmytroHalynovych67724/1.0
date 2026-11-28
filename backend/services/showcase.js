const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { exportDemoProducts } = require('../seed');

function showcaseProducts() {
  const catalog = exportDemoProducts();
  const old = new Set(['demo-iphone-15','demo-galaxy-s23','demo-ua-iphone-14','demo-eu-pixel-8']);
  const selected = [];
  for (const region of ['pl','ua','eu']) for (const category of ['Smartfony','Laptopy','Tablety','Gaming','Audio','Monitory','Foto','Akcesoria']) {
    const choices = catalog.filter(item=>item.region===region && item.category===category).sort((a,b)=>Number(b.condition==='new')-Number(a.condition==='new') || a.id.localeCompare(b.id));
    const item = choices.find(value=>!old.has(value.id));
    if (item) selected.push(item);
  }
  for (const id of ['demo-iphone-15-used-blue','demo-iphone-15-used-black']) {
    const item=catalog.find(value=>value.id===id); if(item && !selected.some(value=>value.id===id)) selected.push(item);
  }
  return selected.map(item=>({
    ...item, id:item.id.replace(/^demo-/,'demo-showcase-'), title:item.title,
    description:'DEMO · Демонстраційний товар NaShary. Ціна, залишок і стан тестові. Фото ілюстративне. Товар не продається. / Produkt demonstracyjny, nie na sprzedaż. / Demo listing, not for sale.',
    stock:item.condition==='new'?3:1, warranty:'none', inspection:{}, deviceDetails:{},
    sellerType:item.condition==='new'?'store':'private', negotiable:false,
    supplyDetails:{ sku:'SHOWCASE-'+item.id.replace(/^demo-/,''), availability:'in_stock',
      deliveryTerms:'DEMO — не є пропозицією доставки. / Not a delivery offer.',
      warrantyTerms:'DEMO — не є умовами гарантії. / Not warranty terms.',
      returnTerms:'DEMO — товар не продається. / Not for sale.' },
  }));
}

async function populateShowcase(db) {
  const products=showcaseProducts();
  const credentials=[]; let inserted=0, skipped=0;
  await db.transaction(async()=>{
    const owners=new Map();
    for (const region of ['pl','ua','eu']) for (const type of ['store','private']) {
      const id=`demo-showcase-user-${region}-${type}`, username=`demo.${region}.${type}`;
      const existing=await db.prepare('SELECT id,username,role FROM users WHERE id=? OR username=? COLLATE NOCASE').all(id,username);
      if (existing.some(user=>user.id!==id || user.username!==username || user.role!=='user')) throw new Error('SHOWCASE_ACCOUNT_CONFLICT');
      if (!existing.length) {
        const password=crypto.randomBytes(24).toString('base64url');
        const hash=await bcrypt.hash(password,12);
        await db.prepare("INSERT INTO users (id,username,password,role,displayName,createdAt) VALUES (?,?,?,'user',?,?)").run(id,username,hash,`NaShary DEMO · ${region.toUpperCase()} ${type==='store'?'Store':'Seller'}`,Date.now());
        credentials.push({username,password,role:'user',purpose:'NaShary demo seller'});
      }
      owners.set(`${region}:${type}`,id);
    }
    for (const product of products) {
      if (await db.prepare('SELECT id FROM products WHERE id=?').get(product.id)) { skipped++; continue; }
      const sellerId=owners.get(`${product.region}:${product.sellerType}`);
      const seller=`NaShary DEMO · ${product.region.toUpperCase()} ${product.sellerType==='store'?'Store':'Seller'}`;
      const result=await db.prepare(`INSERT OR IGNORE INTO products (id,title,description,price,priceCents,images,specs,category,location,condition,brand,model,stock,seller,sellerType,delivery,warranty,negotiable,status,urgent,inspection,deviceDetails,supplyDetails,region,currency,createdBy,createdAt) VALUES (@id,@title,@description,@price,@priceCents,@images,@specs,@category,@location,@condition,@brand,@model,@stock,@seller,@sellerType,@delivery,'none',0,'active',0,'{}','{}',@supplyDetails,@region,@currency,@sellerId,@createdAt)`).run({
        id:product.id,title:product.title,description:product.description,price:product.price,priceCents:Math.round(product.price*100),
        images:JSON.stringify(product.images),specs:JSON.stringify(product.specs || {}),category:product.category,location:product.location,
        condition:product.condition,brand:product.brand,model:product.model,stock:product.stock,seller,sellerType:product.sellerType,delivery:product.delivery,
        supplyDetails:JSON.stringify(product.supplyDetails),region:product.region,currency:product.currency,sellerId,createdAt:Date.now(),
      });
      inserted+=result.changes;
    }
  }).immediate();
  return {inserted,skipped,credentials};
}
module.exports={showcaseProducts,populateShowcase};
