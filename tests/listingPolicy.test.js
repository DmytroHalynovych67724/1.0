const test = require('node:test');
const assert = require('node:assert/strict');

test('listing ownership follows account IDs across login changes and roles', async () => {
  const { ownsListing, canBuyListing } = await import('../frontend/src/listingPolicy.mjs');
  const product = { sellerId: 'seller', seller: 'Same name', stock: 1, status: 'active' };
  assert.equal(ownsListing(null, product), false);
  assert.equal(ownsListing({ id: 'seller', role: 'admin' }, product), true);
  assert.equal(canBuyListing({ id: 'seller', role: 'admin' }, product), false);
  assert.equal(canBuyListing({ id: 'buyer', name: 'Same name' }, product), true);
  assert.equal(canBuyListing(null, product), true);
  assert.equal(canBuyListing(null, { ...product, condition: 'new', sellerCanSellNew: false }), false);
  assert.equal(canBuyListing(null, { ...product, condition: 'new', sellerCanSellNew: true }), true);
  for (const unavailable of [{ stock: 0 }, { status: 'sold' }, { status: 'draft' }, { isDemo: true }, { moderationStatus: 'hidden' }, { sellerAccountStatus: 'suspended' }, ...['on_order', 'expected', 'unavailable'].map((availability) => ({ supplyDetails: { availability } }))]) {
    assert.equal(canBuyListing({ id: 'buyer' }, { ...product, ...unavailable }), false);
  }
});
