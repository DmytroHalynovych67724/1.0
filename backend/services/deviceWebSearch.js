const { isIP } = require('node:net');
const { wikipediaTitleCompatible, modelCompatible } = require('./deviceSpecs');

const CACHE = new Map();
const PENDING = new Map();
const OFFICIAL_DOMAINS = ['apple.com','samsung.com','mi.com','xiaomi.com','oneplus.com','oneplus.cn','realme.com','oppo.com','vivo.com','honor.com','huawei.com','motorola.com','sony.com','playstation.com','nintendo.com','lenovo.com','asus.com','acer.com','dell.com','hp.com','microsoft.com','store.google.com','nothing.tech','fairphone.com','tecno-mobile.com','infinixmobility.com'];
const REFERENCE_DOMAINS = [...OFFICIAL_DOMAINS, 'gsmarena.com','notebookcheck.net','nanoreview.net','wikipedia.org'];
const under = (host, domain) => host === domain || host.endsWith('.' + domain);

function safeReferenceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname) || !REFERENCE_DOMAINS.some(domain => under(url.hostname,domain))) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}

function referenceResults(payload, { brand, model }) {
  const query = `${brand} ${model}`;
  const seen = new Set();
  return (Array.isArray(payload?.results) ? payload.results : []).flatMap(result => {
    const url = safeReferenceUrl(result?.url);
    if (!url || seen.has(url.href)) return [];
    const title = typeof result.title === 'string' ? result.title.slice(0,200) : '';
    const domainBrand = OFFICIAL_DOMAINS.some(domain => under(url.hostname,domain)) ? brand : '';
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return []; }
    const identity = `${domainBrand} ${title} ${path.replace(/[-_/]/g,' ')}`;
    if (!wikipediaTitleCompatible(query, identity) || !modelCompatible(query, brand, identity)) return [];
    const text = typeof result.raw_content === 'string' && result.raw_content.trim() ? result.raw_content : result.content;
    if (typeof text !== 'string' || text.trim().length < 60) return [];
    seen.add(url.href);
    return [{ title, url: url.href, text: text.slice(0,18000), official: OFFICIAL_DOMAINS.some(domain=>under(url.hostname,domain)) }];
  }).sort((a,b)=>Number(b.official)-Number(a.official)).slice(0,3);
}

async function searchDeviceSources(candidate, { apiKey = process.env.TAVILY_API_KEY, fetchImpl = global.fetch, timeoutMs = 12000 } = {}) {
  if (!apiKey) return { status: 'not_configured', sources: [] };
  const key = `${candidate.brand}:${candidate.model}`.toLowerCase();
  if (CACHE.get(key)?.expires > Date.now()) return CACHE.get(key).result;
  if (PENDING.has(key)) return PENDING.get(key);
  if (PENDING.size >= 16) return { status: 'busy', sources: [] };
  const pending = (async()=>{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl('https://api.tavily.com/search', {
        method:'POST', signal:controller.signal, headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
        body:JSON.stringify({query:`${candidate.brand} ${candidate.model} technical specifications`, search_depth:'basic', max_results:5, include_raw_content:'text', include_answer:false, include_images:false, auto_parameters:false, include_domains:REFERENCE_DOMAINS}),
      });
      if (!response.ok) return {status:response.status===429?'rate_limited':'unavailable',sources:[]};
      const sources = referenceResults(await response.json(), candidate);
      return {status:sources.length?'ready':'not_found',sources};
    } catch { return {status:'unavailable',sources:[]}; }
    finally { clearTimeout(timer); }
  })().then(result=>{
    if (CACHE.size>=128) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key,{result,expires:Date.now()+(result.status==='ready'?3600000:30000)});
    return result;
  }).finally(()=>PENDING.delete(key));
  PENDING.set(key,pending);
  return pending;
}

module.exports = { searchDeviceSources, referenceResults, safeReferenceUrl };
