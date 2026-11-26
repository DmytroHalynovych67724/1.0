const test = require('node:test');
const assert = require('node:assert/strict');
const { findDeviceSpecs, modelCompatible, wikipediaSpecs, wikipediaTitleCompatible } = require('../backend/services/deviceSpecs');
const { sourceSnippet, requestSpecJson } = require('../backend/services/aiDeviceSpecs');
const { normalizePhoneMatch } = require('../backend/services/phoneSpecs');

test('model matching handles GT 3 and GT3 without treating MI6 disambiguation or generation 16 as Mi 6', async () => {
  assert.equal(modelCompatible('realme gt 3', 'realme', 'GT3'), true);
  assert.equal(wikipediaTitleCompatible('Xiaomi Mi 6', 'MI-6 (disambiguation)'), false);
  assert.equal(wikipediaTitleCompatible('Xiaomi Mi 6', 'MI6'), false);
  assert.equal(wikipediaTitleCompatible('Xiaomi Mi 6', 'Xiaomi Mi 16'), false);
  assert.equal(wikipediaTitleCompatible('Xiaomi Mi 6', 'Xiaomi Mi 6'), true);
  assert.equal(wikipediaTitleCompatible('Apple iPhone 17 Pro', 'IPhone 17 Pro'), true);
  let calls = 0;
  const result = await wikipediaSpecs('Xiaomi Mi 6', 'Smartfony', { includeSourceText: true, fetchImpl: async () => ({ json: async () => ++calls === 1
    ? { query: { search: [{ title: 'MI-6 (disambiguation)' }, { title: 'Xiaomi Mi 6' }] } }
    : { query: { pages: [{ title: 'MI-6 (disambiguation)', revisions: [{ slots: { main: { content: 'A list mentioning Xiaomi Mi 6.' } } }] }, { title: 'Xiaomi Mi 6', revisions: [{ slots: { main: { content: '{{Infobox mobile phone\n| name = Xiaomi Mi 6\n| soc = Snapdragon 835\n| display = 5.15 inch\n| end = yes\n}}' } } }] }] } } }) });
  assert.ok(result.sourceUrl.endsWith('/Xiaomi_Mi_6'));
  assert.equal(result.specs.processor, 'Snapdragon 835');
});

test('manufacturer references fill Mi 6 and GT3; a PlayStation corrects the smartphone category without guessing capacity', async () => {
  for (const [query, chip, sourceHost] of [['Xiaomi mi 6', '835', 'mi.com'], ['realme gt 3', 'Snapdragon', 'realme.com']]) {
    const [result] = await findDeviceSpecs(query, { category: 'Smartfony' });
    assert.ok(result.specs.processor.includes(chip));
    assert.ok(Object.keys(result.specs).length > 10);
    assert.ok(result.sourceUrl.includes(sourceHost));
    assert.equal(result.specs.storage, undefined);
  }
  const [consoleModel] = await findDeviceSpecs('PlayStation 5', { category: 'Smartfony' });
  assert.equal(consoleModel.category, 'Gaming');
  assert.equal(consoleModel.model, 'PlayStation 5');
  assert.equal(consoleModel.specs.storage, undefined);
  assert.ok(consoleModel.specs.processor.includes('Zen 2'));
  assert.equal(modelCompatible('PlayStation 5', 'Sony', 'PlayStation 5 Slim'), false);
  assert.equal(normalizePhoneMatch({ specs: { connectivity: 'Wi-Fi 2.4 GHz / 5 GHz' } }).specs.wifi, undefined);
  assert.equal(normalizePhoneMatch({ specs: { connectivity: 'Wi-Fi 6E, Bluetooth 5.3' } }).specs.wifi, 'Wi-Fi 6E');
});

test('AI context keeps a bounded infobox and removes citations while using a small generation budget', async () => {
  const reference = 'An unrelated introduction. {{Infobox phone\n| cpu = Chip 1<ref>Very long citation</ref>\n| display = [[OLED]]\n| nested = {{nowrap|Wi-Fi}}\n}}' + 'unrelated '.repeat(3000);
  const snippet = sourceSnippet(reference);
  assert.ok(snippet.includes('Chip 1'));
  assert.ok(snippet.includes('OLED'));
  assert.ok(!snippet.includes('Very long citation'));
  assert.ok(!snippet.includes('unrelated'));
  assert.ok(snippet.length <= 9000);
  await requestSpecJson('Return JSON', {}, { apiKey: 'test-only', maxCompletionTokens: 384, fetchImpl: async (_url, options) => {
    assert.equal(JSON.parse(options.body).max_completion_tokens, 384);
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{}' } }] }) };
  } });
});
