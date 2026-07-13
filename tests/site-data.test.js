const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSiteData() {
  const storage = {};
  const context = {
    console,
    fetch: async () => ({ ok: false }),
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      },
      setItem(key, value) {
        storage[key] = String(value);
      },
      removeItem(key) {
        delete storage[key];
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/site-data.js'), 'utf8'), context);
  return context;
}

test('fallback products are normalized with rich metadata', () => {
  const context = loadSiteData();
  const normalized = context.normalizeProduct({
    id: 'demo-test',
    title: 'Test device',
    description: 'A sample listing',
    price: 100
  });

  assert.equal(normalized.images.length > 0, true);
  assert.equal(normalized.category, 'Elektronika');
  assert.equal(normalized.location, 'Lublin');
});

test('removeProduct deletes a demo listing from local storage', () => {
  const context = loadSiteData();
  const added = context.addProduct({
    id: 'demo-delete',
    title: 'Remove me',
    description: 'To be deleted',
    price: 10
  });

  const afterAdd = context.getStoredProducts();
  assert.equal(afterAdd.some((product) => product.id === added.id), true);

  context.removeProduct('demo-delete');
  const afterRemove = context.getStoredProducts();
  assert.equal(afterRemove.some((product) => product.id === 'demo-delete'), false);
});
