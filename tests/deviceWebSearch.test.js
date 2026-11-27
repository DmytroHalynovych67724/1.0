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

test('thin Tavily sources trigger at most one supplementary request shared by concurrent lookups', async () => {
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
  assert.equal(calls, 2);
  assert.equal(results[0].status, 'ready');
  assert.equal(results[0].sources.length, 1);
  assert.deepEqual(results[0], results[1]);
  await searchDeviceSources(candidate, options);
  assert.equal(calls, 2);
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


test('regional copies cannot crowd out a complete independent specification source', () => {
  const results = referenceResults({results:[
    {title:'Phone 2a',url:'https://nothing.tech/gb/en/phone-2a',content:text},
    {title:'Phone 2a',url:'https://nothing.tech/hr/hr/phone-2a',content:text},
    {title:'Phone 2a',url:'https://nothing.tech/we/en/phone-2a',content:text},
    {title:'Nothing Phone 2a full specifications',url:'https://www.gsmarena.com/nothing_phone_2a.php',content:text},
  ]},candidate);
  assert.equal(results.length,2);
  assert.equal(results.filter(source=>source.official).length,1);
  assert.ok(results.some(source=>source.url.includes('gsmarena.com')));
});

test('supplementary search is limited to independent references and keeps primary data on failure', async () => {
  let calls=0;
  const result=await searchDeviceSources({brand:'Nothing',model:'Phone 906'}, {apiKey:'test',fetchImpl:async (_url,options)=>{
    calls++;
    const body=JSON.parse(options.body);
    if(calls===2){
      assert.ok(body.include_domains.includes('gsmarena.com'));
      assert.ok(!body.include_domains.includes('nothing.tech'));
      return {ok:false,status:429};
    }
    return {ok:true,json:async()=>({results:[{title:'Nothing Phone 906',url:'https://nothing.tech/phone-906',content:text}]})};
  }});
  assert.equal(calls,2);
  assert.equal(result.status,'ready');
  assert.equal(result.sources.length,1);
});


test('a full reference without a 5G title suffix is accepted for the same generation', () => {
  const results=referenceResults({results:[{title:'Motorola Moto G84 full specifications',url:'https://www.gsmarena.com/motorola_moto_g84-12526.php',content:text}]},{brand:'Motorola',model:'Moto G84 5G'});
  assert.equal(results.length,1);
});


test('a short encyclopedia result triggers a manufacturer search instead of repeating directories', async () => {
  let calls=0;
  const candidate={brand:'Samsung',model:'A57 5G'};
  const result=await searchDeviceSources(candidate,{apiKey:'test',fetchImpl:async(_url,options)=>{
    calls++;
    const body=JSON.parse(options.body);
    if(calls===1) return {ok:true,json:async()=>({results:[{title:'Samsung Galaxy A57 5G',url:'https://de.wikipedia.org/wiki/Samsung_Galaxy_A57_5G',content:'Samsung Galaxy A57 5G. Processor Exynos 1680. Battery 5000 mAh. Display Super AMOLED.'}]})};
    assert.ok(body.include_domains.includes('samsung.com'));
    assert.ok(!body.include_domains.includes('wikipedia.org'));
    assert.ok(!body.query.includes('-comparison'));
    return {ok:true,json:async()=>({results:[{title:'Galaxy A57 5G specs Samsung',url:'https://www.samsung.com/uk/smartphones/galaxy-a/galaxy-a57-5g/',content:'Samsung Galaxy A57 5G. Screen 6.7 inches, Super AMOLED, 120 Hz. Camera 50 MP. Wi-Fi 6. Bluetooth 5.3. Battery 5000 mAh.'}]})};
  }});
  assert.equal(calls,2);
  assert.equal(result.status,'ready');
  assert.ok(result.sources.some(source=>source.official));
  assert.equal(result.sources.length,2);
});


test('retailer catalogs are restricted to exact configuration codes',()=>{
  const source={title:'Acer Nitro 5 AN515-58-58GJ',url:'https://www.mironet.cz/acer-nitro-5-58gj',content:'Acer Nitro 5 AN515-58-58GJ. Processor Intel Core i5-12450H. RAM 16 GB. SSD 1 TB. NVIDIA RTX 4050. Optional Windows 11 Pro.'};
  const candidate={brand:'Acer',model:'Nitro 5'};
  assert.equal(referenceResults({results:[source]},candidate).length,0);
  assert.equal(referenceResults({results:[source]},{...candidate,productCode:'AN515-58-58GJ'})[0].commercial,true);
  assert.equal(referenceResults({results:[source]},{...candidate,productCode:'AN515-58-57AN'}).length,0);
  assert.equal(referenceResults({results:[source]},{...candidate,productCode:'AN515-58'}).length,0);
});

test('missing exact configuration sources use one bounded retailer fallback',async()=>{
  let calls=0;
  const result=await searchDeviceSources({brand:'Acer',model:'Nitro 5',productCode:'AN515-58-58GJ'},{apiKey:'test',fetchImpl:async(_url,options)=>{
    calls++;
    const body=JSON.parse(options.body);
    if(calls===1){assert.ok(!body.include_domains.includes('mironet.cz'));return {ok:true,json:async()=>({results:[]})};}
    assert.equal(body.include_domains,undefined);
    assert.ok(body.query.includes('"AN515-58-58GJ"'));
    assert.equal(body.exact_match,false);
    assert.ok(!body.query.includes('Nitro 5'));
    assert.ok(!body.query.includes('-comparison'));
    return {ok:true,json:async()=>({results:[{title:'Acer Nitro 5 AN515-58-58GJ',url:'https://www.mironet.cz/acer-nitro-5-58gj',content:'Acer Nitro 5 AN515-58-58GJ. Processor Intel Core i5. RAM 16 GB. SSD 1 TB. NVIDIA RTX 4050.'}]})};
  }});
  assert.equal(calls,2);assert.equal(result.status,'ready');assert.equal(result.sources[0].commercial,true);
});
