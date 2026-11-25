const test = require('node:test');
const assert = require('node:assert/strict');
test('comparison rejects mixed categories while allowing removal and enforcing the limit', async () => {
  const { comparisonAction } = await import('../frontend/src/comparisonPolicy.mjs');
  const phone = { id: 'p', category: 'Smartfony' };
  assert.equal(comparisonAction([phone], { id: 'l', category: 'Laptopy' }), 'category');
  assert.equal(comparisonAction([phone], phone), 'remove');
  assert.equal(comparisonAction([phone], { id: 'q', category: 'Smartfony' }), 'add');
  assert.equal(comparisonAction([], { id: 'unknown' }), 'category');
  assert.equal(comparisonAction(['a','b','c','d'].map(id => ({ id, category: 'Audio' })), { id: 'e', category: 'Audio' }), 'limit');
});
test('old mixed comparisons and refreshed products retain one category without duplicates', async () => {
  const { normalizeComparison, differentValues } = await import('../frontend/src/comparisonPolicy.mjs');
  const phone = { id: 'p', category: 'Smartfony' };
  assert.deepEqual(normalizeComparison([null, phone, { id: 'l', category: 'Laptopy' }, phone, { id: 'q', category: 'smartfony' }]).map(p=>p.id), ['p','q']);
  assert.equal(differentValues(['4 GB', ' 4  gb ']), false);
  assert.equal(differentValues(['4 GB', '8 GB']), true);
});
