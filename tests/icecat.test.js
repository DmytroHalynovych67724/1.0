const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeIcecatProduct } = require('../backend/services/icecat');
const { curatedSpecs, findDeviceSpecs, labelledWikiField, modelCompatible, wikipediaTitleCompatible } = require('../backend/services/deviceSpecs');

function feature(name, value) {
  return {
    PresentationValue: value,
    Feature: { Name: { Value: name } },
  };
}

test('Open Icecat data is converted into NaShary smartphone specifications', () => {
  const product = normalizeIcecatProduct(
    {
      msg: 'OK',
      data: {
        Title: 'Samsung Galaxy Test 6.2 inch 8 GB 128 GB',
        EssentialInfo: {
          Brand: 'Samsung',
          ProductCode: 'SM-TEST',
          ProductName: 'Galaxy Test',
          GTIN: ['1234567890123'],
        },
        FeaturesGroups: [
          {
            Features: [
              feature('Display diagonal', '6.2 inch'),
              feature('Display technology marketing name', 'AMOLED'),
              feature('Display resolution', '2340 x 1080 pixels'),
              feature('Maximum refresh rate', '120 Hz'),
              feature('Processor family', 'Samsung Exynos'),
              feature('Processor model', '2400'),
              feature('RAM capacity', '8 GB'),
              feature('Internal storage capacity', '128 GB'),
              feature('Battery capacity', '4000 mAh'),
              feature('Rear camera resolution (numeric)', '50 MP'),
              feature('Second rear camera resolution (numeric)', '12 MP'),
              feature('Front camera resolution (numeric)', '12 MP'),
              feature('Mobile network generation', '5G'),
              feature('Top Wi-Fi standard', 'Wi-Fi 6'),
              feature('Bluetooth version', '5.3'),
              feature('Near Field Communication (NFC)', 'Yes'),
              feature('USB connector type', 'USB Type-C'),
            ],
          },
        ],
        DemoAccount: true,
      },
    },
    { icecatId: '118055399' }
  );

  assert.equal(product.source, 'Open Icecat');
  assert.equal(product.model, 'Galaxy Test');
  assert.equal(product.icecatId, '118055399');
  assert.equal(product.specs.screen, '6.2 inch AMOLED');
  assert.equal(product.specs.processor, 'Samsung Exynos 2400');
  assert.equal(product.specs.mainCamera, '50 MP + 12 MP');
  assert.equal(product.specs.connectivity, '5G, Wi-Fi 6, Bluetooth 5.3, NFC, USB Type-C');
});

test('phone model matching never replaces a requested suffix with the base model', () => {
  assert.equal(modelCompatible('Samsung S24 Ultra', 'Samsung', 'Galaxy S24'), false);
  assert.equal(modelCompatible('Samsung S24 Ultra', 'Samsung', 'Galaxy S24 Ultra'), true);
  assert.equal(modelCompatible('Apple iPhone 15 Pro Max', 'Apple', 'iPhone 15 Pro'), false);
  assert.equal(modelCompatible('Apple iPhone 15 Pro Max', 'Apple', 'iPhone 15 Pro Max'), true);
  assert.equal(modelCompatible('Google Pixel 9 Pro XL', 'Google', 'Pixel 9 Pro'), false);
  assert.equal(modelCompatible('Google Pixel 9 Pro XL', 'Google', 'Pixel 9 Pro XL'), true);
  assert.equal(curatedSpecs('Samsung S24 Ultra'), undefined);
  assert.equal(curatedSpecs('Samsung Galaxy S24 256 GB').model, 'Galaxy S24');
});

test('Wikipedia family specifications are reduced to the requested phone variant', () => {
  const infobox = `
| battery = {{ubl
 |'''Galaxy S24:''' 4000 mAh
 |'''Galaxy S24 Ultra:''' 5000 mAh
}}
| weight = {{Unbulleted list|'''15 Pro:''' {{convert|187|g}}|'''15 Pro Max:''' {{convert|221|g}}}}
| os = Android
`;
  assert.equal(labelledWikiField(infobox, ['battery'], 'Samsung Galaxy S24 Ultra'), '5000 mAh');
  assert.equal(labelledWikiField(infobox, ['battery'], 'Samsung Galaxy S24 FE'), '');
  assert.equal(labelledWikiField(infobox, ['weight'], 'Apple iPhone 15 Pro Max'), '221 g');
});

test('Wikipedia fallback rejects a series page when the requested variant is missing', () => {
  assert.equal(wikipediaTitleCompatible('Samsung S24 Ultra', 'Samsung Galaxy S24'), false);
  assert.equal(wikipediaTitleCompatible('Google Pixel 9 Pro', 'Google Pixel 9 Pro'), true);
});

test('model-name lookup also covers laptops and audio devices', async () => {
  const laptop = await findDeviceSpecs('MacBook Air M2 13 inch 8/256 GB', { category: 'Laptopy' });
  assert.equal(laptop[0].model, 'MacBook Air M2');
  assert.equal(laptop[0].specs.processor, 'Apple M2');
  assert.match(laptop[0].specs.screen, /13\.6/);

  const headphones = await findDeviceSpecs('Sony WH-1000XM5', { category: 'Audio' });
  assert.equal(headphones[0].model, 'WH-1000XM5');
  assert.match(headphones[0].specs.connectivity, /Bluetooth/);
  assert.match(headphones[0].specs.battery, /30 h/);
});
