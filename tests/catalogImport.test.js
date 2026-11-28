const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareCatalogImport } = require('../backend/utils/catalogImport');
const row = () => ({ title: 'Test notebook', brand: 'Test', model: 'Config', category: 'Laptopy', price: 2500, stock: 2, location: 'Warszawa', delivery: 'shipping', supplyDetails: { sku: 'TEST-1' } });

test('CSV handles BOM, Excel separators, quotes, decimal commas and JSON parity', async () => {
  const { parseCatalogImport, readCsv } = await import('../frontend/src/catalogImport.mjs');
  const csv = '\uFEFFtitle;brand;model;category;price;stock;location;delivery;sku;ram\r\n"Notebook; ""Pro""";Test;Config;Laptopy;2500,50;2;Warszawa;shipping;TEST-1;16 GB';
  const parsed = parseCatalogImport(csv, 'items.csv');
  assert.equal(parsed[0].title, 'Notebook; "Pro"'); assert.equal(parsed[0].price, 2500.5);
  assert.deepEqual(parsed[0].specs, { ram: '16 GB' });
  assert.equal(parseCatalogImport(JSON.stringify([{title:'Notebook',brand:'Test',model:'Config',category:'Laptopy',price:2500,stock:0,location:'Warszawa',delivery:'pickup',sku:'TEST'}]),'items.json')[0].stock,0);
  assert.deepEqual(readCsv('title,description\nTest,"line1\nline2"'), [{title:'Test',description:'line1\nline2'}]);
  assert.throws(() => readCsv('title,title\na,b'), /columns/);
  assert.throws(() => readCsv('title,description\na,"unfinished'), /format/);
  assert.throws(() => readCsv('title,description\na,"closed"tail'), /format/);
});

test('import rejects dangerous images, unknown fields, invalid prices and duplicate configurations', async () => {
  const { parseCatalogImport } = await import('../frontend/src/catalogImport.mjs');
  const flat = {title:'Test product',brand:'Test',model:'Config',category:'Laptopy',price:10,stock:1,location:'Warszawa',delivery:'both',sku:'abc'};
  for (const change of [{price:'1e3'},{stock:-1},{images:'javascript:alert(1)'},{role:'admin'},{price:'1.999'},{category:'Invented'}]) assert.throws(()=>parseCatalogImport(JSON.stringify([{...flat,...change}]),'x.json'));
  assert.throws(()=>parseCatalogImport(JSON.stringify([flat,{...flat,sku:' ABC '}]),'x.json'), /duplicate/);
  assert.throws(()=>parseCatalogImport('x'.repeat(1_000_001),'x.csv'), /size/);
});

test('server validates the whole file, forces drafts and seller ownership, and keeps retries stable', () => {
  const user={id:'owner',username:'Seller'};
  const body={requestId:'11111111-1111-4111-8111-111111111111',region:'pl',rows:[{...row(),status:'active',condition:'used',seller:'Other',createdBy:'Other',inspection:{battery:true}}]};
  const [prepared]=prepareCatalogImport(body,user);
  assert.equal(prepared.product.status,'draft'); assert.equal(prepared.product.condition,'new'); assert.equal(prepared.product.seller,'Seller'); assert.deepEqual(prepared.product.inspection,{});
  assert.equal(prepared.id,prepareCatalogImport(body,user)[0].id);
  assert.notEqual(prepared.id,prepareCatalogImport(body,{...user,id:'another'})[0].id);
  assert.throws(()=>prepareCatalogImport({...body,rows:[row(),{...row(),supplyDetails:{sku:'test-1'}}]},user), error=>error.code==='IMPORT_DUPLICATE');
  assert.throws(()=>prepareCatalogImport({...body,rows:[row(),{...row(),price:-1}]},user), error=>error.details[0].field==='rows[2]');
  assert.throws(()=>prepareCatalogImport({...body,rows:[{...row(),images:['data:image/png;base64,xxx']}]},user));
});
