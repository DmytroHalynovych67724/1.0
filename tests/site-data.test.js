const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSiteData() {
  const storage = {};
  const localStorage = {
    getItem(key) {
      return Object.hasOwn(storage, key) ? storage[key] : null;
    },
    setItem(key, value) {
      storage[key] = String(value);
    },
    removeItem(key) {
      delete storage[key];
    },
  };
  const window = {
    addEventListener() {},
    dispatchEvent() {},
    setTimeout,
    clearTimeout,
  };
  const document = {
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
  };

  class TestCustomEvent {
    constructor(type) {
      this.type = type;
    }
  }

  const context = {
    URL,
    Headers,
    CustomEvent: TestCustomEvent,
    console,
    document,
    fetch: async () => {
      throw new Error('Network unavailable in site-data unit tests');
    },
    localStorage,
    window,
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../frontend/site-data.js'), 'utf8'),
    context
  );

  return { api: window.NaShary, storage };
}

function cloneFromVm(value) {
  return JSON.parse(JSON.stringify(value));
}

test('product normalization keeps marketplace metadata and rejects unsafe images', () => {
  const { api } = loadSiteData();
  const normalized = api.normalizeProduct({
    id: 'demo-test',
    title: 'Test device',
    description: 'A sample electronics listing',
    price: 100,
    images: ['javascript:alert(1)'],
    condition: 'used',
    brand: 'TestBrand',
    stock: 2.9,
    delivery: 'pickup',
  });

  assert.equal(normalized.id, 'demo-test');
  assert.equal(normalized.price, 100);
  assert.equal(normalized.condition, 'used');
  assert.equal(normalized.brand, 'TestBrand');
  assert.equal(normalized.stock, 2);
  assert.equal(normalized.delivery, 'pickup');
  assert.equal(normalized.images.length, 1);
  assert.equal(normalized.images[0].includes('javascript:'), false);
  assert.match(api.formatPrice(1234), /(PLN|z\u0142)/u);
});

test('local demo listings can be added, updated and removed', () => {
  const { api } = loadSiteData();
  const added = api.addLocalProduct({
    id: 'demo-edit',
    title: 'Laptop for testing',
    description: 'Local fallback listing',
    price: 1500,
    condition: 'used',
  });

  assert.equal(
    api.getStoredProducts().some((product) => product.id === added.id),
    true
  );

  const updated = api.updateLocalProduct(added.id, { price: 1400, condition: 'new' });
  assert.equal(updated.price, 1400);
  assert.equal(updated.condition, 'new');

  api.removeLocalProduct(added.id);
  assert.equal(
    api.getStoredProducts().some((product) => product.id === added.id),
    false
  );
});

test('cart, favorites and session helpers persist consistent local state', () => {
  const { api } = loadSiteData();

  api.addToCart('product-1', 2);
  api.addToCart('product-1', 1);
  api.addToCart('product-2');
  assert.deepEqual(cloneFromVm(api.getCart()), [
    { id: 'product-1', qty: 3, region: 'pl' },
    { id: 'product-2', qty: 1, region: 'pl' },
  ]);

  api.updateCartItem('product-1', 1);
  api.removeFromCart('product-2');
  assert.deepEqual(cloneFromVm(api.getCart()), [{ id: 'product-1', qty: 1, region: 'pl' }]);

  assert.equal(api.toggleFavorite('product-1'), true);
  assert.deepEqual(cloneFromVm(api.getFavorites()), ['product-1']);
  assert.equal(api.toggleFavorite('product-1'), false);
  assert.deepEqual(cloneFromVm(api.getFavorites()), []);

  api.setSession('test-token', { id: 'user-1', username: 'buyer' });
  assert.equal(api.getToken(), 'test-token');
  assert.equal(api.getStoredUser().username, 'buyer');
  api.clearSession();
  assert.equal(api.getToken(), '');
  assert.equal(api.getStoredUser(), null);
});
