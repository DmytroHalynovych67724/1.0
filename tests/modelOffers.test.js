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

test('laptop filters keep manufacturer configurations and upgraded memory separate', async () => {
  const { filterModelOffers, variantOptions, summarizeModelOffers } = await import('../frontend/src/modelOffers.mjs');
  const offers = [
    { id: 'base', price: 800, currency: 'PLN', condition: 'new', deviceDetails: { productCode: 'ABC-123' }, specs: { processor: 'Core i5', ram: '16 GB', storage: '512 GB', gpu: 'RTX 4050', screen: '15.6' } },
    { id: 'upgrade', price: 950, currency: 'PLN', condition: 'used', deviceDetails: { productCode: 'abc-123' }, specs: { processor: 'Core i5', ram: '32 GB', storage: '1 TB', gpu: 'RTX 4050', screen: '15.6' } },
    { id: 'other', price: 700, currency: 'PLN', condition: 'used', deviceDetails: { productCode: 'ABC-456' }, specs: { processor: 'Core i7', ram: '16 GB', storage: '512 GB', gpu: 'RTX 4060' } },
  ];
  assert.deepEqual(filterModelOffers(offers, { productCode: 'ABC-123', ram: '32 GB' }).map(x => x.id), ['upgrade']);
  assert.equal(filterModelOffers(offers, { processor: 'Core i7', gpu: 'RTX 4050' }).length, 0);
  assert.deepEqual(variantOptions(offers, { ram: '32 GB' }, 'productCode'), [{ value: 'ABC-123', count: 1 }, { value: 'ABC-456', count: 0 }]);
  const all = summarizeModelOffers(offers);
  assert.equal(all.cheapest.id, 'other');
  assert.deepEqual(all.specs, {});
  assert.equal(all.hasDifferences, true);
  const sameCode = summarizeModelOffers(filterModelOffers(offers, { productCode: 'ABC-123' }));
  assert.deepEqual(sameCode.specs, { processor: 'Core i5', gpu: 'RTX 4050', screen: '15.6' });
  const selected = summarizeModelOffers(filterModelOffers(offers, { ram: '32 GB' }));
  assert.equal(selected.cheapest.price, 950);
  assert.equal(selected.specs.ram, '32 GB');
  assert.equal(selected.hasDifferences, false);
  assert.deepEqual(summarizeModelOffers([]), { cheapest: null, specs: {}, hasDifferences: false });
});

test('unknown specifications never inherit another listing configuration', async () => {
  const { filterModelOffers, summarizeModelOffers, variantOptions } = await import('../frontend/src/modelOffers.mjs');
  const offers = [{ specs: { ram: ' 16 GB ', processor: 'Core i5' } }, { specs: { ram: '16  gb' } }];
  assert.deepEqual(summarizeModelOffers(offers).specs, { ram: '16 GB' });
  assert.equal(filterModelOffers(offers, { processor: 'Core i5' }).length, 1);
  assert.deepEqual(variantOptions(offers, {}, 'ram'), [{ value: '16 GB', count: 2 }]);
});
