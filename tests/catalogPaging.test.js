const test = require('node:test');
const assert = require('node:assert/strict');

test('catalog pages merge without duplicate cards and accept legacy array responses', async () => {
  const { catalogPage, mergeCatalogItems } = await import('../frontend/src/catalogPaging.mjs');
  const page = catalogPage({ items: [{ id: 'a' }], total: 20, offset: 12, limit: 12 });
  assert.equal(page.total, 20);
  assert.equal(page.offset + page.items.length, 13);
  assert.deepEqual(mergeCatalogItems([{ id: 'a', price: 10 }, { id: 'b' }], [{ id: 'a', price: 12 }, { id: 'c' }]), [{ id: 'a', price: 12 }, { id: 'b' }, { id: 'c' }]);
  assert.deepEqual(catalogPage([{ id: 'a' }]), { items: [{ id: 'a' }], total: 1, offset: 0, limit: 1 });
  assert.throws(() => catalogPage({ items: [], total: -1, offset: 0 }));
  assert.throws(() => catalogPage({ items: null, total: 1, offset: 0 }));
});
