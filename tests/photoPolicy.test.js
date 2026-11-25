const test = require('node:test');
const assert = require('node:assert/strict');

test('listing photos accept phone-sized files and preserve proportions without enlargement', async () => {
  const { fitPhoto, photoInputError, MAX_PHOTO_INPUT } = await import('../frontend/src/photoPolicy.mjs');
  assert.equal(photoInputError({ type: 'image/jpeg', size: 5_000_000 }), '');
  assert.equal(photoInputError({ type: 'image/heic', size: 1_000_000 }), 'format');
  assert.equal(photoInputError({ type: 'image/png', size: MAX_PHOTO_INPUT + 1 }), 'size');
  assert.equal(photoInputError({ type: 'image/png', size: 0 }), 'size');
  assert.deepEqual(fitPhoto(4032, 3024), { width: 2048, height: 1536 });
  assert.deepEqual(fitPhoto(3024, 4032), { width: 1536, height: 2048 });
  assert.deepEqual(fitPhoto(300, 200), { width: 300, height: 200 });
  assert.deepEqual(fitPhoto(4032, 3024, 384), { width: 384, height: 288 });
  assert.throws(() => fitPhoto(10000, 10000), /dimensions/);
  assert.throws(() => fitPhoto(0, 3000), /dimensions/);
});
