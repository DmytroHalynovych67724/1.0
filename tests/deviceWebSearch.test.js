const test = require('node:test');
const assert = require('node:assert/strict');
const { safeReferenceUrl, referenceResults, searchDeviceSources } = require('../backend/services/deviceWebSearch');
const candidate = { brand: 'Nothing', model: 'Phone 2a' };
const text = 'Nothing Phone 2a technical specifications. Processor: Dimensity 7200 Pro. Battery capacity: 5000 mAh.';

test('web references only allow known HTTPS domains and exact models', () => {
  for (const url of ['http://nothing.tech/a', 'https://nothing.tech.evil.test/a', 'https://evilnothing.tech/a', 'https://127.0.0.1/a', 'https://user:pass@nothing.tech/a', 'https://nothing.tech:8080/a']) assert.equal(safeReferenceUrl(url), null);
  assert.equal(safeReferenceUrl('https://nothing.tech/pages/phone-2a#specs').href, 'https://nothing.tech/pages/phone-2a');
  const found = referenceResults({ results: [
    { title: 'Nothing Phone 2a review', url: 'https://www.gsmarena.com/nothing-phone-2a', content: text },
    { title: 'Phone 2a specs', url: 'https://nothing.tech/pages/phone-2a', raw_content: text },
    { title: 'Phone 2a specs duplicate', url: 'https://nothing.tech/pages/phone-2a#more', content: text },
    { title: 'Nothing Phone 2a specifications revealed by new leak', url: 'https://www.notebookcheck.net/nothing-phone-2a-leak.html', content: text },
    { title: 'Nothing Phone 2a comparison', url: 'https://www.gsmarena.com/compare.php3?idPhone1=12760', content: text },
    { title: 'Nothing Phone 2a Neo', url: 'https://nothing.tech/pages/phone-2a-neo', content: text },
    { title: 'Nothing Phone 2a Pro', url: 'https://nothing.tech/pages/phone-2a-pro', content: text },
    { title: 'Nothing Phone 3a', url: 'https://nothing.tech/pages/phone-3a', content: text },
    { title: 'Nothing Phone 2a', url: 'https://nothing.tech/%ZZ', content: text },
    { title: 'Nothing Phone 2a', url: 'https://nothing.tech/short', content: 'No specifications' },
  ] }, candidate);
  assert.equal(found.length, 2);
  assert.equal(found[0].official, true);
  assert.equal(found[0].text, text);
  assert.equal(found[1].official, false);
  assert.deepEqual(referenceResults(null, candidate), []);
});

test('Tavily uses one bounded server request and caches concurrent lookups', async () => {
  let calls = 0;
  const options = { apiKey: 'test-web-secret', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.tavily.com/search');
    assert.equal(options.headers.authorization, 'Bearer test-web-secret');
    const body = JSON.parse(options.body);
    assert.equal(body.search_depth, 'basic');
    assert.equal(body.max_results, 5);
    assert.equal(body.auto_parameters, false);
    assert.equal(body.include_answer, false);
    assert.ok(!options.body.includes('test-web-secret'));
    return { ok: true, json: async () => ({ results: [{ title: 'Phone 2a', url: 'https://nothing.tech/pages/phone-2a', content: text }] }) };
  } };
  const results = await Promise.all([searchDeviceSources(candidate, options), searchDeviceSources(candidate, options)]);
  assert.equal(calls, 1);
  assert.equal(results[0].status, 'ready');
  assert.equal(results[0].sources.length, 1);
  assert.deepEqual(results[0], results[1]);
  await searchDeviceSources(candidate, options);
  assert.equal(calls, 1);
});

test('missing keys, rate limits, malformed responses and connection failures are honest', async () => {
  assert.equal((await searchDeviceSources(candidate, { apiKey: '' })).status, 'not_configured');
  for (const [model, response, expected] of [
    ['Phone 901', { ok: false, status: 429 }, 'rate_limited'],
    ['Phone 902', { ok: false, status: 401 }, 'unavailable'],
    ['Phone 903', { ok: true, json: async () => ({ results: [] }) }, 'not_found'],
    ['Phone 904', { ok: true, json: async () => { throw new Error('invalid JSON'); } }, 'unavailable'],
  ]) {
    const result = await searchDeviceSources({ brand: 'Nothing', model }, { apiKey: 'test', fetchImpl: async () => response });
    assert.equal(result.status, expected);
    assert.deepEqual(result.sources, []);
  }
  assert.equal((await searchDeviceSources({ brand: 'Nothing', model: 'Phone 905' }, { apiKey: 'test', fetchImpl: async () => { throw new Error('offline'); } })).status, 'unavailable');
});
