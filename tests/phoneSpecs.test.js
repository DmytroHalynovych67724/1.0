const test = require('node:test');
const assert = require('node:assert/strict');
const { findDeviceSpecs, labelledWikiField, modelCompatible } = require('../backend/services/deviceSpecs');
const { normalizePhoneMatch, PHONE_SPEC_KEYS } = require('../backend/services/phoneSpecs');
const { validateProduct } = require('../backend/utils/validation');

const fixtureLookup = { icecatLookup: async () => null, catalogLookup: async () => [], wikiLookup: async () => ({ ...require('../backend/services/phoneProfiles')[0], category:'Smartfony',source:'Source fixture' }) };

test('iPhone 11 fills model specifications and leaves real configuration for the seller', async () => {
  const [phone] = await findDeviceSpecs('iPhone 11', { ...fixtureLookup, category: 'Smartfony' });
  assert.equal(phone.model, 'iPhone 11');
  assert.equal(phone.specs.displayType, 'IPS LCD (Liquid Retina HD)');
  assert.equal(phone.specs.resolution, '1792 × 828');
  assert.equal(phone.specs.ram, '4 GB');
  assert.equal(phone.specs.ramType, 'LPDDR4X');
  assert.equal(phone.specs.battery, '3110 mAh');
  assert.match(phone.specs.mainCamera, /12 MP.*12 MP/);
  assert.match(phone.specs.features, /Face ID/);
  assert.equal(phone.coverage.total, PHONE_SPEC_KEYS.length);
  assert.deepEqual(phone.coverage.missing.sort(), ['color', 'sim', 'storage']);
  assert.ok(!phone.specs.color && !phone.specs.sim && !phone.specs.storage);
  assert.deepEqual(phone.choices.storage, ['64 GB', '128 GB', '256 GB']);
  assert.ok(phone.sources.some((source) => source.url.includes('support.apple.com')));
  assert.doesNotThrow(() => validateProduct({ specs: phone.specs }, { partial: true }));
  const [configured] = await findDeviceSpecs('айфон11 128 ГБ Black', { ...fixtureLookup, category: 'Smartfony' });
  assert.equal(configured.specs.storage, '128 GB');
  assert.equal(configured.specs.color, 'Black');
  assert.deepEqual(configured.coverage.missing, ['sim']);
  assert.equal(modelCompatible('iPhone 11 Pro', 'Apple', 'iPhone 11'), false);
  assert.equal(modelCompatible('iPhone 11', 'Apple', 'iPhone 111'), false);
});

test('an unsupported iPhone 11 storage size is not silently invented', async () => {
  const [phone] = await findDeviceSpecs('iPhone 11 512 GB', { ...fixtureLookup, category: 'Smartfony' });
  assert.equal(phone.specs.storage, undefined);
  assert.deepEqual(phone.choices.storage, ['64 GB', '128 GB', '256 GB']);
});

test('self-closing Wikipedia references do not eat subsequent display or camera data', () => {
  const wiki = '| display = 6.1 inch IPS LCD<ref name="screen"/> 1792 x 828, True Tone, 60 Hz<ref>Panel notes</ref>\n| memory = 4 GB LPDDR4X RAM\n| os = Original: iOS 13\n';
  const screen = labelledWikiField(wiki, ['display'], 'iPhone 11');
  assert.match(screen, /1792 x 828/);
  const phone = normalizePhoneMatch({ specs: { screen, ram: '4 GB LPDDR4X RAM', os: 'Original: iOS 13', connectivity: '4G LTE, Wi-Fi 6, Bluetooth 5.0, NFC', mainCamera: '12 MP wide with a very long camera description '.repeat(6) } });
  assert.equal(phone.specs.resolution, '1792 × 828');
  assert.equal(phone.specs.displayType, 'IPS LCD');
  assert.equal(phone.specs.refreshRate, '60 Hz');
  assert.equal(phone.specs.ram, '4 GB');
  assert.equal(phone.specs.ramType, 'LPDDR4X');
  assert.equal(phone.specs.os, 'iOS');
  assert.equal(phone.specs.bluetooth, '5.0');
  assert.ok(Object.values(phone.specs).every((value) => value.length <= 80));
  assert.doesNotThrow(() => validateProduct({ specs: phone.specs }, { partial: true }));
});

test('unknown hardware fields remain empty instead of receiving made-up defaults', () => {
  const phone = normalizePhoneMatch({ specs: { processor: 'Example chip', mainCamera: 'six-element lens', refreshRate: 'N/A' } });
  assert.equal(phone.specs.mainCamera, undefined);
  assert.equal(phone.specs.refreshRate, undefined);
  assert.equal(phone.specs.battery, undefined);
  assert.ok(phone.coverage.missing.includes('battery'));
});
