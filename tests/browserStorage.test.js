const test = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../frontend/src/browserStorage.mjs');
function storage(limit = Infinity) {
  const data = new Map();
  return {
    data,
    limit,
    getItem: (key) => data.get(key) ?? null,
    setItem(key, value) {
      const size = [...data].reduce((sum, [k, v]) => sum + (k === key ? 0 : v.length), value.length);
      if (size > this.limit) throw new Error('QuotaExceededError');
      data.set(key, String(value));
    },
    removeItem: (key) => data.delete(key),
  };
}
test('migrates inline photos while preserving cart quantities, favorites and account identity', async () => {
  const { createSafeStorage } = await modulePromise;
  const local = storage();
  const product = { id: 'phone', title: 'iPhone', images: ['data:image/jpeg;base64,' + 'a'.repeat(50000)], stock: 3, specs: { ram: '4 GB' } };
  local.data.set('nashary-recent', JSON.stringify([product]));
  local.data.set('nashary-react-cart', JSON.stringify([{ id: 'phone', qty: 2, product }]));
  local.data.set('nashary-react-comparison', JSON.stringify([product]));
  local.data.set('nashary-user', JSON.stringify({ id: 'owner', role: 'admin', avatar: product.images[0] }));
  local.data.set('nashary-react-favorites', '["phone"]');
  local.limit = [...local.data.values()].reduce((size, value) => size + value.length, 0);
  const safe = createSafeStorage({ local: () => local, session: () => storage() });
  assert.equal(safe.setItem('nashary-token', 'new-session'), true);
  const cart = JSON.parse(local.getItem('nashary-react-cart'));
  assert.equal(cart[0].id, 'phone');
  assert.equal(cart[0].qty, 2);
  assert.deepEqual(cart[0].product.images, []);
  assert.equal(local.getItem('nashary-react-favorites'), '["phone"]');
  assert.equal(JSON.parse(local.getItem('nashary-user')).role, 'admin');
  assert.ok([...local.data.values()].join('').length < 5000);
});
test('full persistent storage falls back to session storage and survives reload', async () => {
  const { createSafeStorage } = await modulePromise;
  const local = storage(0), session = storage();
  const options = { local: () => local, session: () => session };
  const safe = createSafeStorage(options);
  assert.equal(safe.setItem('nashary-token', 'signed-in'), false);
  assert.equal(createSafeStorage(options).getItem('nashary-token'), 'signed-in');
  safe.removeItem('nashary-token');
  assert.equal(createSafeStorage(options).getItem('nashary-token'), null);
});
test('blocked browser storage never throws and stale credentials cannot override new login or logout', async () => {
  const { createSafeStorage } = await modulePromise;
  const blocked = { getItem: () => 'old-token', setItem: () => { throw Error('blocked'); }, removeItem: () => { throw Error('blocked'); } };
  const safe = createSafeStorage({ local: () => blocked, session: () => { throw Error('SecurityError'); } });
  assert.doesNotThrow(() => safe.repair());
  safe.setItem('nashary-token', 'new-token');
  assert.equal(safe.getItem('nashary-token'), 'new-token');
  safe.removeItem('nashary-token');
  assert.equal(safe.getItem('nashary-token'), null);
});
test('successful persistence observes changes from other tabs', async () => {
  const { createSafeStorage } = await modulePromise;
  const local = storage();
  const safe = createSafeStorage({ local: () => local, session: () => null });
  safe.setItem('nashary-token', 'one');
  local.setItem('nashary-token', 'two');
  assert.equal(safe.getItem('nashary-token'), 'two');
  local.removeItem('nashary-token');
  assert.equal(safe.getItem('nashary-token'), null);
});
test('compact snapshots reject inline media and tolerate malformed old data', async () => {
  const { compactProduct, compactCart, compactProfile } = await modulePromise;
  assert.deepEqual(compactCart({ invalid: true }), []);
  assert.doesNotThrow(() => compactProduct(null));
  const compact = compactProduct({ id: 'phone', title: 'x'.repeat(500), images: ['blob:123', 'data:image/png;base64,aaa', '/photo.jpg'], specs: { ram: '4GB' } });
  assert.equal(compact.title.length, 120);
  assert.deepEqual(compact.images, ['/photo.jpg']);
  assert.deepEqual(compactProfile({ id: 'u', role: 'admin', canSellNew: true, avatar: 'data:image/png;base64,aaa' }), { id: 'u', role: 'admin', canSellNew: true, avatar: '' });
});
