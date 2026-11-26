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

test('China supply is explicit, preserves legacy CN devices and respects a changed origin', async () => {
  const { supplyOrigin } = await import('../frontend/src/supplyDetails.mjs');
  const { validateSupplyDetails } = require('../backend/utils/productSupply');
  assert.equal(supplyOrigin({}), '');
  assert.equal(supplyOrigin({ marketVersion: 'Global' }), '');
  assert.equal(supplyOrigin({ marketVersion: 'CN' }), 'china');
  assert.equal(supplyOrigin({ origin: 'china', marketVersion: 'Global' }), 'china');
  assert.equal(supplyOrigin({ origin: 'local', marketVersion: 'CN' }), 'local');
  assert.equal(supplyOrigin({ origin: '', marketVersion: 'CN' }), '');
  assert.deepEqual(validateSupplyDetails({ origin: '', marketVersion: 'CN' }), { origin: '', marketVersion: 'CN' });
  assert.equal(validateSupplyDetails({ origin: 'china' }).origin, 'china');
  assert.throws(() => validateSupplyDetails({ origin: 'invalid' }), { code: 'VALIDATION_ERROR' });
});
