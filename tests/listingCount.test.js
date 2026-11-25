const test = require('node:test');
const assert = require('node:assert/strict');

test('offer counts use correct Ukrainian, Polish and English plural forms', async () => {
  const { listingCount } = await import('../frontend/src/listingCount.mjs');
  assert.equal(listingCount(1, 'uk'), '1 пропозиція');
  assert.equal(listingCount(4, 'uk'), '4 пропозиції');
  assert.equal(listingCount(11, 'uk'), '11 пропозицій');
  assert.equal(listingCount(21, 'uk'), '21 пропозиція');
  assert.equal(listingCount(1, 'pl'), '1 oferta');
  assert.equal(listingCount(22, 'pl'), '22 oferty');
  assert.equal(listingCount(12, 'pl'), '12 ofert');
  assert.equal(listingCount(101, 'pl'), '101 ofert');
  assert.equal(listingCount(1, 'en'), '1 offer');
  assert.equal(listingCount(0, 'en'), '0 offers');
});
