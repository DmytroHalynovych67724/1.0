const assert = require('node:assert/strict');
const test = require('node:test');
const { parseAssistantQuery, productScore } = require('../backend/services/catalogAssistant');

test('assistant understands a natural Polish marketplace request', () => {
  const parsed = parseAssistantQuery('Szukam używany iPhone 15 Pro do 2500 zł z dostawą');
  assert.equal(parsed.filters.category, 'Smartfony');
  assert.equal(parsed.filters.brand, 'Apple');
  assert.equal(parsed.filters.condition, 'used');
  assert.equal(parsed.filters.maxPrice, 2500);
  assert.equal(parsed.filters.delivery, 'shipping');
  assert.deepEqual(parsed.searchTokens, ['iphone', '15', 'pro']);
});

test('assistant understands Ukrainian condition and budget wording', () => {
  const parsed = parseAssistantQuery('Потрібен вживаний ноутбук до 3000 з гарантією');
  assert.equal(parsed.filters.category, 'Laptopy');
  assert.equal(parsed.filters.condition, 'used');
  assert.equal(parsed.filters.maxPrice, 3000);
  assert.equal(parsed.filters.warranty, 'any');
});

test('assistant ranks title and model matches above unrelated listings', () => {
  const wanted = productScore({ title: 'Apple iPhone 15 Pro', brand: 'Apple', model: 'iPhone 15 Pro', category: 'Smartfony', specs: {} }, ['iphone', '15', 'pro']);
  const unrelated = productScore({ title: 'Samsung Galaxy S23', brand: 'Samsung', model: 'Galaxy S23', category: 'Smartfony', specs: {} }, ['iphone', '15', 'pro']);
  assert.ok(wanted > unrelated);
});
