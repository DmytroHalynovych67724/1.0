const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhoneMatch, normalizeDeviceQuery } = require('../backend/services/phoneSpecs');
const {
  findAiDeviceSpecs,
  groundedFields,
  groundedReferences,
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
    searchSources: async () => ({ status: 'not_configured', sources: [] }),
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
  const sourceOnly = await findAiDeviceSpecs('iPhone 11', { requestJson: async () => ({ candidates: [] }), findSpecs: async () => [{ model: 'iPhone 11', specs: { processor: 'A13 Bionic' } }] });
  assert.equal(sourceOnly.ai.status, 'source_only');
  assert.equal(sourceOnly.results[0].specs.processor, 'A13 Bionic');
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


test('AI fills an arbitrary model from web sources without a prepared profile', async () => {
  const result = await findAiDeviceSpecs('Nothing Phone 2a', {
    category: 'Smartfony',
    findSpecs: async () => [],
    fetchSource: async () => null,
    searchSources: async () => ({ status: 'ready', sources: [{ title: 'Nothing Phone 2a specifications', url: 'https://nothing.tech/pages/phone-2a', text: 'Processor: Dimensity 7200 Pro. Battery capacity: 5000 mAh. Charging: 45 W.' }] }),
    requestJson: async (_prompt, input) => input.name
      ? { candidates: [{ brand: 'Nothing', model: 'Phone 2a' }] }
      : { fields: [
          { key: 'processor', value: 'Dimensity 7200 Pro', quote: 'Processor: Dimensity 7200 Pro.', sourceId: input.references[0].id },
          { key: 'battery', value: '5000 mAh', quote: 'Battery capacity: 5000 mAh.', sourceId: input.references[0].id },
          { key: 'charging', value: '120 W', quote: 'Charging: 120 W.', sourceId: input.references[0].id },
        ] },
  });
  assert.equal(result.results[0].specs.processor, 'Dimensity 7200 Pro');
  assert.equal(result.results[0].specs.battery, '5000 mAh');
  assert.equal(result.results[0].specs.charging, undefined);
  assert.equal(result.results[0].ai.webSearch, 'ready');
  assert.equal(result.results[0].ai.evidence.processor.url, 'https://nothing.tech/pages/phone-2a');
  assert.ok(!JSON.stringify(result).includes('sourceText'));
});

test('evidence belongs to the specified reference and cannot fabricate or cross sources', () => {
  const references = [
    { id: 'one', url: 'https://nothing.tech/a', text: 'Charging: 45 W.' },
    { id: 'two', url: 'https://nothing.tech/b', text: 'Battery: 5000 mAh.' },
  ];
  const result = groundedReferences({ fields: [null,
    { key: 'charging', value: '45 W', quote: 'Charging: 45 W.', sourceId: 'two' },
    { key: 'charging', value: '45 W', quote: 'Charging: 45 W.', sourceId: 'unknown' },
    { key: 'charging', value: '45 W', quote: 'Charging: 45 W.', sourceId: 'one' },
    { key: 'battery', value: '5000 mAh', quote: 'Battery: 5000 mAh.' },
    { key: 'ram', value: '8 GB', quote: '8 GB', sourceId: 'one' },
  ] }, references);
  assert.deepEqual(result.specs, { charging: '45 W' });
  assert.equal(result.evidence.charging.url, references[0].url);
});


test('provider failures expose only safe categories and never partially apply truncated JSON', async () => {
  for (const [response, reason] of [
    [{ ok: false, status: 429, json: async () => ({ error: { message: 'private provider details' } }) }, 'rate_limit'],
    [{ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: '{"fields":[]}' } }] }) }, 'response_truncated'],
  ]) {
    let failure;
    assert.equal(await requestSpecJson('', {}, { apiKey: 'test', fetchImpl: async () => response, onFailure: value => { failure = value; } }), null);
    assert.equal(failure, reason);
  }
});
