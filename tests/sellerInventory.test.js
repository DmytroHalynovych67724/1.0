const test = require('node:test');
const assert = require('node:assert/strict');

test('inventory keeps new and used work separate and searches model, SKU and batch together', async () => {
  const { filterInventory, inventorySummary } = await import('../frontend/src/sellerInventory.mjs');
  const items = [
    {
      id: 'new',
      title: 'Новий смартфон',
      model: 'Phone 12',
      condition: 'new',
      status: 'active',
      stock: 4,
      supplyDetails: { sku: 'CN-128', batch: 'Lot-A' },
    },
    {
      id: 'used',
      title: 'Вживаний смартфон',
      model: 'Phone 12',
      condition: 'used',
      status: 'active',
      stock: 1,
    },
    { id: 'draft', condition: 'new', status: 'draft', stock: 10 },
    { id: 'hidden', condition: 'new', status: 'active', stock: 7, moderationStatus: 'hidden' },
    {
      id: 'order',
      condition: 'new',
      status: 'active',
      stock: 9,
      supplyDetails: { availability: 'on_order' },
    },
    { id: 'demo', condition: 'new', status: 'active', stock: 5, isDemo: true },
    { id: 'sold', condition: 'used', status: 'sold', stock: 2 },
  ];
  const snapshot = JSON.stringify(items);
  assert.deepEqual(
    filterInventory(items, { condition: 'new', query: 'phone cn-128 LOT-a' }).map(
      (item) => item.id
    ),
    ['new']
  );
  assert.deepEqual(
    filterInventory(items, { condition: 'used', status: 'active' }).map((item) => item.id),
    ['used']
  );
  assert.deepEqual(
    filterInventory(items, { query: 'вЖиВаНий' }).map((item) => item.id),
    ['used']
  );
  assert.equal(filterInventory(items, { query: '   ' }).length, items.length);
  assert.equal(filterInventory(items, { query: 'missing' }).length, 0);
  assert.deepEqual(inventorySummary(items, { canSellNew: true }), {
    total: 7,
    active: 5,
    drafts: 1,
    availableUnits: 5,
  });
  assert.equal(inventorySummary(items, { role: 'user' }).availableUnits, 1);
  assert.equal(inventorySummary(items, { role: 'admin' }).availableUnits, 5);
  assert.equal(JSON.stringify(items), snapshot);
});

test('creation defaults respect explicit used direction and new-sales permission independently of moderator role', async () => {
  const { initialListingCondition, canListNew } =
    await import('../frontend/src/sellerInventory.mjs');
  for (const user of [null, { role: 'user' }, { role: 'moderator' }, { canSellNew: false }]) {
    assert.equal(canListNew(user), false);
    assert.equal(initialListingCondition(user, 'new'), 'used');
  }
  for (const user of [{ role: 'admin' }, { role: 'user', canSellNew: true }]) {
    assert.equal(initialListingCondition(user), 'new');
    assert.equal(initialListingCondition(user, 'used'), 'used');
    assert.equal(initialListingCondition(user, 'new'), 'new');
  }
});
