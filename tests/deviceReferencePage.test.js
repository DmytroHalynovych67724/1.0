const test=require('node:test');
const assert=require('node:assert/strict');
const {fetchReferencePage,cleanReferenceHtml}=require('../backend/services/deviceReferencePage');
const {safeReferenceUrl,searchDeviceSources}=require('../backend/services/deviceWebSearch');

test('reference HTML is text only, keeps specs and excludes executable or hidden content',()=>{
  const text=cleanReferenceHtml('<script>secretHidden();</script><style>.secret{}</style><p>RAM: 16&nbsp;GB</p><p>SSD: 1 TB &amp; NVMe</p>');
  assert.ok(text.includes('RAM: 16 GB'));assert.ok(text.includes('SSD: 1 TB & NVMe'));assert.ok(!text.includes('secret'));
});

test('catalog reading permits only allowed HTTPS redirects and bounds response size',async()=>{
  let calls=0;
  const text=await fetchReferencePage('https://acer-shop.sk/product',{safeUrl:safeReferenceUrl,fetchImpl:async(_url,options)=>{calls++;assert.equal(options.redirect,'manual');return new Response('<p>RAM: 16 GB</p>',{headers:{'content-type':'text/html'}});}});
  assert.ok(text.includes('16 GB'));assert.equal(calls,1);
  assert.equal(await fetchReferencePage('http://127.0.0.1',{safeUrl:safeReferenceUrl,fetchImpl:async()=>{throw new Error('must not run');}}),null);
  assert.equal(await fetchReferencePage('https://acer-shop.sk/a',{safeUrl:safeReferenceUrl,fetchImpl:async()=>new Response('',{status:302,headers:{location:'http://127.0.0.1/private'}})}),null);
  assert.equal(await fetchReferencePage('https://acer-shop.sk/a',{safeUrl:safeReferenceUrl,maxBytes:4,fetchImpl:async()=>new Response('too long',{headers:{'content-type':'text/html'}})}),null);
});

test('a thin exact catalog snippet can be expanded without another Tavily request',async()=>{
  let calls=0,reads=0;
  const code='AN515-58-58GJ';
  const result=await searchDeviceSources({brand:'Acer',model:'Nitro 5',productCode:code},{apiKey:'test',sourceLoader:async url=>{reads++;assert.ok(url.includes('acer-shop.sk'));return `Acer Nitro 5 ${code}. Processor Intel Core i5. Screen 15.6 inches. RAM 16 GB. SSD 1 TB. GPU RTX 4050. Bluetooth 5.1.`;},fetchImpl:async()=>{
    calls++;return {ok:true,json:async()=>({results:calls===1?[]:[{title:`Acer Nitro 5 ${code}`,url:'https://acer-shop.sk/product',content:`Acer Nitro 5 ${code}. Full configuration available in the retailer catalog.`}]})};
  }});
  assert.equal(calls,2);assert.equal(reads,1);assert.ok(result.sources[0].text.includes('RTX 4050'));assert.equal(result.sources[0].commercial,true);
});
