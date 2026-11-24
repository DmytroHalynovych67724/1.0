const test = require('node:test');
const assert = require('node:assert/strict');

test('availability is explicit for imports and backwards compatible for existing listings', async () => {
  const { availabilityFor } = await import('../frontend/src/supplyDetails.mjs');
  assert.equal(availabilityFor({ stock: 1 }), 'in_stock');
  assert.equal(availabilityFor({ stock: 0 }), 'unavailable');
  assert.equal(availabilityFor({ stock: 0, supplyDetails: { availability: 'on_order' } }), 'on_order');
  assert.equal(availabilityFor({ stock: 2, supplyDetails: { availability: 'expected' } }), 'expected');
  assert.equal(availabilityFor({ stock: 2, status: 'sold', supplyDetails: { availability: 'in_stock' } }), 'unavailable');
});
