const test = require('node:test');
const assert = require('node:assert/strict');

test('one AI model fills immediately while ambiguous and empty results require selection', async () => {
  const { selectSpecLookupResult, specsAfterLookup } = await import('../frontend/src/specLookupSelection.mjs');
  const model = { title: 'Redmi 9', matchConfidence: 'fallback', specs: { processor: 'Helio G80', battery: '5020 mAh' } };
  assert.equal(selectSpecLookupResult([model], { ai: true }).autoApply, true);
  assert.equal(selectSpecLookupResult([model]).autoApply, false);
  assert.equal(selectSpecLookupResult([model, { ...model, title: 'Redmi 9A' }], { ai: true }).autoApply, false);
  assert.equal(selectSpecLookupResult([{ ...model, specs: {} }], { ai: true }).autoApply, false);
  assert.equal(selectSpecLookupResult([{ ...model, specs: {} }], { ai: true }).identityOnly, true);
  const current = { processor: 'Known processor', storage: '128 GB', color: 'Blue' };
  assert.deepEqual(specsAfterLookup(current, { specs: {} }, 'Galaxy S10e'), current);
  assert.deepEqual(specsAfterLookup(current, model, 'Redmi 9', ['storage', 'color']), { processor: 'Helio G80', battery: '5020 mAh', storage: '128 GB', color: 'Blue' });
  assert.equal(selectSpecLookupResult([], { ai: true }).autoApply, false);
  assert.equal(selectSpecLookupResult([{ ...model, matchConfidence: 'exact' }]).autoApply, true);
});
