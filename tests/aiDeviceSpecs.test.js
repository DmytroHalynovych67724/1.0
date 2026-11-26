const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneMatch, normalizeDeviceQuery } = require('../backend/services/phoneSpecs');
const {
  findAiDeviceSpecs,
  groundedFields,
  parseCandidates,
  requestSpecJson,
} = require('../backend/services/aiDeviceSpecs');

test('AI extraction requires actual source quotes and excludes configuration and seller claims', () => {
  const result = groundedFields(
    {
      fields: [
        { key: 'processor', value: 'Helio G80', quote: 'Processor: Helio G80' },
        { key: 'charging', value: '18 W', quote: 'Charging: 18 W' },
        { key: 'battery', value: '6000 mAh', quote: 'Battery: 6000 mAh' },
        { key: 'ramType', value: 'LPDDR5', quote: 'Processor: Helio G80' },
        { key: 'storage', value: '128 GB', quote: 'Storage: 128 GB' },
        { key: 'sim', value: 'Dual SIM', quote: 'Dual SIM' },
        { key: 'color', value: 'Black', quote: 'Black' },
        { key: 'batteryHealth', value: '100%', quote: '100%' },
        { key: 'price', value: '500', quote: '500' },
      ],
    },
    'Processor: Helio G80\nCharging: 18 W\nStorage: 128 GB\nDual SIM Black 100% 500'
  );
  assert.deepEqual(result.specs, { processor: 'Helio G80', charging: '18 W' });
  assert.equal(result.evidence.processor, 'Processor: Helio G80');
  assert.deepEqual(groundedFields(null, '').specs, {});
  for (const battery of ['5,020 mAh', '5 020 mAh', '5020 mAh']) {
    assert.equal(normalizePhoneMatch({ specs: { battery } }).specs.battery, '5020 mAh');
  }
});

test('AI model names preserve generation and alternatives without accepting links or invented numbers', () => {
  assert.equal(normalizeDeviceQuery('сяомі редмі9'), 'Xiaomi Redmi 9');
  const candidates = parseCandidates(
    {
      candidates: [
        { brand: 'Xiaomi', model: 'Redmi 9A' },
        { brand: 'Xiaomi', model: 'Redmi 9C' },
        { brand: 'Xiaomi', model: 'Redmi 10' },
      ],
    },
    'сяомі редмі 9'
  );
  assert.deepEqual(
    candidates.map((item) => item.model),
    ['Redmi 9A', 'Redmi 9C']
  );
  assert.deepEqual(
    parseCandidates({ candidates: [{ brand: 'Xiaomi', model: 'https://evil.test' }] }, 'Redmi 9'),
    []
  );
  assert.deepEqual(
    parseCandidates({ candidates: [{ brand: 'Xiaomi', model: 'Redmi 90' }] }, 'Redmi 9'),
    []
  );
  assert.equal(
    parseCandidates({ candidates: [{ brand: 'Apple', model: 'iPhone 11 Pro' }] }, 'iphone11pro')
      .length,
    1
  );
});

test('AI lookup uses source evidence, keeps existing facts, preserves uncertainty and exposes no raw reference', async () => {
  const requested = [];
  const result = await findAiDeviceSpecs('сяомі редмі 9', {
    category: 'Smartfony',
    requestJson: async (_prompt, input) =>
      input.name
        ? {
            candidates: [
              { brand: 'Xiaomi', model: 'Redmi 9' },
              { brand: 'Xiaomi', model: 'Redmi 9A' },
            ],
          }
        : {
            fields: [
              { key: 'processor', value: 'Helio G80', quote: 'Processor: Helio G80' },
              { key: 'charging', value: '18 W', quote: 'Charging: 18 W' },
            ],
          },
    findSpecs: async (title) => {
      requested.push(title);
      return [
        {
          brand: 'Xiaomi',
          model: title.replace('Xiaomi ', ''),
          title,
          category: 'Smartfony',
          specs: { processor: 'Known chip' },
          source: 'Reference',
        },
      ];
    },
    fetchSource: async (title) =>
      title.endsWith('9A')
        ? null
        : {
            specs: {},
            source: 'Wikipedia',
            sourceUrl: 'https://en.wikipedia.org/wiki/Redmi_9',
            sourceText: 'Processor: Helio G80\nCharging: 18 W',
          },
  });
  assert.equal(result.ai.reviewRequired, true);
  assert.deepEqual(requested, ['Xiaomi Redmi 9', 'Xiaomi Redmi 9A']);
  assert.equal(result.results[0].specs.processor, 'Known chip');
  assert.equal(result.results[0].specs.charging, '18 W');
  assert.deepEqual(result.results[0].ai.fields, ['charging']);
  assert.equal(result.results[0].ai.evidence.charging.url, 'https://en.wikipedia.org/wiki/Redmi_9');
  assert.equal(result.results[0].matchConfidence, 'fallback');
  assert.equal(result.results[1].ai.status, 'no_source');
  assert.equal(result.results[1].specs.charging, undefined);
  assert.ok(!JSON.stringify(result).includes('sourceText'));
});

test('unavailable AI falls back honestly and provider responses are validated with bounded failures', async () => {
  const result = await findAiDeviceSpecs('iPhone 11', {
    requestJson: async () => null,
    findSpecs: async () => [{ model: 'iPhone 11', specs: {} }],
  });
  assert.equal(result.ai.status, 'unavailable');
  assert.equal(result.results[0].model, 'iPhone 11');
  let attempts = 0;
  const response = await requestSpecJson(
    'Return JSON',
    { name: 'iPhone 11' },
    {
      apiKey: 'test-only-key',
      model: 'llama-3.3-70b-versatile',
      fetchImpl: async (_url, options) => {
        attempts++;
        const body = JSON.parse(options.body);
        assert.ok(!JSON.stringify(body).includes('test-only-key'));
        return attempts === 1
          ? { ok: false, json: async () => ({ error: { code: 'model_not_found' } }) }
          : {
              ok: true,
              json: async () => ({ choices: [{ message: { content: '{"candidates":[]}' } }] }),
            };
      },
    }
  );
  assert.deepEqual(response, { candidates: [] });
  assert.equal(attempts, 2);
  assert.equal(
    await requestSpecJson(
      '',
      {},
      {
        apiKey: 'test',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
        }),
      }
    ),
    null
  );
});
