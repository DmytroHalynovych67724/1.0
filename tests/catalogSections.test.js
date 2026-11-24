const test = require('node:test');
const assert = require('node:assert/strict');

test('catalog sections enforce condition while keeping the region and useful filters', async () => {
  const { sectionQuery, sectionPath, legacySectionRedirect } = await import('../frontend/src/catalogSections.mjs');
  const used = sectionQuery('condition=new&brand=Apple&q=phone&region=ua', 'used', 'pl');
  assert.equal(used.get('condition'), 'used');
  assert.equal(used.get('region'), 'pl');
  assert.equal(used.get('brand'), 'Apple');
  assert.equal(used.get('q'), 'phone');
  assert.equal(sectionQuery('condition=used', 'new', 'ua').get('condition'), 'new');
  assert.equal(sectionQuery('', null, 'eu').has('condition'), false);
  assert.equal(sectionPath('used'), '/marketplace');
  assert.equal(sectionPath('new'), '/catalog');
  assert.equal(legacySectionRedirect('condition=used&brand=Apple'), '/marketplace?brand=Apple');
  assert.equal(legacySectionRedirect('condition=new'), null);
});
