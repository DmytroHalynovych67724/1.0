const test = require('node:test');
const assert = require('node:assert/strict');

test('model configurations only offer combinations backed by real listings', async () => {
  const { filterModelOffers, variantOptions } = await import('../frontend/src/modelOffers.mjs');
  const offers = [
    { id: 'new-black', condition: 'new', specs: { color: 'Black', storage: '128 GB' } },
    { id: 'new-white', condition: 'new', specs: { color: 'White', storage: '256 GB' } },
    { id: 'used-black', condition: 'used', specs: { color: 'Black', storage: '256 GB' } },
    { id: 'unknown', condition: 'used', specs: {} },
  ];
  assert.deepEqual(filterModelOffers(offers, { condition: 'new', color: 'Black', storage: '128 GB' }).map((item) => item.id), ['new-black']);
  assert.equal(filterModelOffers(offers, { condition: 'new', color: 'Black', storage: '256 GB' }).length, 0);
  assert.deepEqual(variantOptions(offers, { condition: 'new', color: 'Black' }, 'storage'), [{ value: '128 GB', count: 1 }, { value: '256 GB', count: 0 }]);
  assert.deepEqual(variantOptions(offers, { condition: 'used', storage: '256 GB' }, 'color'), [{ value: 'Black', count: 1 }, { value: 'White', count: 0 }]);
  assert.equal(filterModelOffers(offers, {}).length, 4);
  assert.deepEqual(variantOptions([], {}, 'color'), []);
});
