const test = require('node:test');
const assert = require('node:assert/strict');

test('autofill preserves manual fields and removes outdated automatic specifications', async () => {
  const { mergeDetectedSpecs, configurationFromQuery } = await import('../frontend/src/specAutofill.mjs');
  assert.deepEqual(configurationFromQuery('Samsung Galaxy S24 8/256 GB Black'), { ram: '8 GB', storage: '256 GB' });
  assert.deepEqual(configurationFromQuery('iPhone 15 Pro 1 ТБ'), { storage: '1 TB' });
  const specs = mergeDetectedSpecs({ ram: '8 GB', color: 'Blue', storage: '128 GB', gpu: 'old automatic GPU' },
    { ram: '12 GB', storage: '128 GB / 256 GB', processor: 'new processor' }, 'Phone 12/256 GB', ['ram', 'color']);
  assert.equal(specs.ram, '8 GB');
  assert.equal(specs.storage, '256 GB');
  assert.equal(specs.color, 'Blue');
  assert.equal(specs.gpu, undefined);
});

test('explicit storage respects model options and manually cleared fields stay cleared', async () => {
  const { mergeDetectedSpecs } = await import('../frontend/src/specAutofill.mjs');
  const options = { storage: ['64 GB', '128 GB', '256 GB'] };
  const unsupported = mergeDetectedSpecs({}, { ram: '4 GB' }, 'iPhone 11 512 GB', [], options);
  assert.equal(unsupported.storage, undefined);
  const cleared = mergeDetectedSpecs({}, { color: 'Blue', ram: '4 GB' }, 'Phone', ['color']);
  assert.equal(cleared.color, undefined);
  const selected = mergeDetectedSpecs({ storage: '256 GB' }, { ram: '4 GB' }, 'iPhone 11 128 GB', ['storage'], options);
  assert.equal(selected.storage, '256 GB');
});
