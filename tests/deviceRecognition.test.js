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

test('general lookup uses retrieved references without a prepared model profile', async () => {
  const [result] = await findDeviceSpecs('Samsung Galaxy A53', {category:'Smartfony',icecatLookup:async()=>null,catalogLookup:async()=>[],wikiLookup:async()=>({brand:'Samsung',model:'Galaxy A53',specs:{processor:'Source CPU',battery:'5000 mAh'},source:'Fetched reference',sourceUrl:'https://example.com/reference'})});
  assert.equal(result.specs.processor,'Source CPU');
  assert.equal(result.specs.storage,undefined);
  assert.equal(result.source,'Fetched reference');
  assert.equal(modelCompatible('PlayStation 5','Sony','PlayStation 5 Slim'),false);
  assert.equal(normalizePhoneMatch({specs:{connectivity:'Wi-Fi 2.4 GHz / 5 GHz'}}).specs.wifi,undefined);
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


test('technical context keeps late specification rows instead of a long shop navigation', () => {
  const raw=('Shop accessories and sign in to your account.\n').repeat(600) +
    '## Technical specifications\nProcessor | Example Chip 9\nDisplay | 6.55 inches pOLED\nResolution | 2400 x 1080 pixels\nRefresh rate | 120 Hz\nBattery | 5000 mAh\nCharging | 30 W\nCamera | 50 MP\nWi-Fi | 802.11ac\nBluetooth | 5.1\n' + ('Delivery and payment details.\n').repeat(300);
  const snippet=sourceSnippet(raw,1800);
  for (const fact of ['Example Chip 9','6.55 inches','2400 x 1080','120 Hz','5000 mAh','30 W','50 MP','802.11ac','5.1']) assert.ok(snippet.includes(fact),fact);
  assert.ok(snippet.length<=1800);
  assert.ok(!snippet.includes('Shop accessories'));
});


test('5G connectivity is not mistaken for a model generation, while explicit 4G conflicts are rejected', () => {
  assert.equal(modelCompatible('Motorola Moto G84 5G','Motorola','Moto G84'),true);
  assert.equal(wikipediaTitleCompatible('Motorola Moto G84 5G','Motorola Moto G84'),true);
  assert.equal(modelCompatible('Motorola Moto G84 5G','Motorola','Moto G85'),false);
  assert.equal(modelCompatible('Xiaomi Redmi Note 11 5G','Xiaomi','Redmi Note 11 4G'),false);
  assert.equal(wikipediaTitleCompatible('Xiaomi Redmi Note 11 5G','Xiaomi Redmi Note 11 4G'),false);
});
