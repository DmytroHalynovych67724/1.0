const { normalizeProductCode, referenceMatchesCode } = require('./deviceProductCode');
const { technicalCoverage } = require('./deviceSourceText');
const { isIP } = require('node:net');
const { wikipediaTitleCompatible, modelCompatible } = require('./deviceSpecs');

const CACHE = new Map();
const PENDING = new Map();
const OFFICIAL_DOMAINS = ['apple.com','samsung.com','samsungmobilepress.com','mi.com','xiaomi.com','oneplus.com','oneplus.cn','realme.com','oppo.com','vivo.com','honor.com','huawei.com','motorola.com','sony.com','playstation.com','xbox.com','nintendo.com','lenovo.com','asus.com','acer.com','msi.com','gigabyte.com','razer.com','frame.work','dell.com','hp.com','microsoft.com','store.google.com','nothing.tech','fairphone.com','tecno-mobile.com','infinixmobility.com'];
const DIRECTORY_DOMAINS = ['gsmarena.com','notebookcheck.net','nanoreview.net','wikipedia.org'];
const MERCHANT_DOMAINS = ['alza.cz','alza.sk','mironet.cz','tonerpartner.cz','datart.cz','morele.net','x-kom.pl','komputronik.pl','rozetka.com.ua','brain.com.ua','telemart.ua','moyo.ua','comfy.ua','foxtrot.com.ua','currys.co.uk','notebooksbilliger.de','cyberport.de','alternate.de','bhphotovideo.com'];
const CORE_DOMAINS = [...OFFICIAL_DOMAINS, ...DIRECTORY_DOMAINS];
const REFERENCE_DOMAINS = [...CORE_DOMAINS, ...MERCHANT_DOMAINS];
const under = (host, domain) => host === domain || host.endsWith('.' + domain);

function safeReferenceUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname) || !REFERENCE_DOMAINS.some(domain => under(url.hostname,domain))) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}

function referenceResults(payload, { brand, model, productCode = '' }) {
  const query = `${brand} ${model}`;
  const seen = new Set();
  return (Array.isArray(payload?.results) ? payload.results : []).flatMap(result => {
    const url = safeReferenceUrl(result?.url);
    if (!url || seen.has(url.href) || /(?:^|\/)(?:compare|comparison)(?:[./_-]|$)/i.test(url.pathname)) return [];
    const commercial = MERCHANT_DOMAINS.some(domain=>under(url.hostname,domain));
    if (commercial && !productCode) return [];
    const title = typeof result.title === 'string' ? result.title.slice(0,200) : '';
    if (/\bvs\b|\bversus\b|\bleak(?:s|ed)?\b|\brumou?rs?\b|\bunconfirmed\b|\bconcept\b/i.test(`${title} ${url.pathname.replace(/[-_]/g,' ')}`)) return [];
    const domainBrand = OFFICIAL_DOMAINS.some(domain => under(url.hostname,domain)) ? brand : '';
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return []; }
    const identity = `${domainBrand} ${title} ${path.replace(/[-_/]/g,' ')}`;
    if (!productCode && (!wikipediaTitleCompatible(query, identity) || !modelCompatible(query, brand, identity))) return [];
    const text = typeof result.raw_content === 'string' && result.raw_content.trim() ? result.raw_content : result.content;
    if (typeof text !== 'string' || text.trim().length < 60) return [];
    if (productCode && (!referenceMatchesCode({title,url:url.href,text},productCode) || (!modelCompatible(query,brand,identity) && !modelCompatible(query,brand,`${identity} ${text.slice(0,2000)}`)))) return [];
    seen.add(url.href);
    return [{ title, url: url.href, text: text.slice(0,60000), ...(commercial ? {commercial:true} : {}), official: OFFICIAL_DOMAINS.some(domain=>under(url.hostname,domain)) }];
  }).sort((a,b)=>sourceQuality(b)-sourceQuality(a)).filter(source => {
    const host = new URL(source.url).hostname;
    const domain = REFERENCE_DOMAINS.find(domain => under(host,domain));
    if (seen.has(`domain:${domain}`)) return false;
    seen.add(`domain:${domain}`);
    return true;
  }).slice(0,3);
}

function sourceQuality(source) {
  return technicalCoverage(source.text) * 3 + (source.official ? 12 : 0) + (/specifications|specs|technical|faq|support/i.test(`${source.title} ${source.url}`) ? 6 : 0);
}

async function searchDeviceSources(candidate, { apiKey = process.env.TAVILY_API_KEY, fetchImpl = global.fetch, timeoutMs = 12000, debugSources = false } = {}) {
  if (!apiKey) return { status: 'not_configured', sources: [] };
  const key = `${candidate.brand}:${candidate.model}:${normalizeProductCode(candidate.productCode)}:${debugSources}`.toLowerCase();
  if (CACHE.get(key)?.expires > Date.now()) return CACHE.get(key).result;
  if (PENDING.has(key)) return PENDING.get(key);
  if (PENDING.size >= 16) return { status: 'busy', sources: [] };
  const pending = (async()=>{
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), timeoutMs);
    try {
      const diagnostics = [];
      const request = async (domains, manufacturerOnly = false) => {
        const response = await fetchImpl('https://api.tavily.com/search', {
          method:'POST', signal:controller.signal, headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
          body:JSON.stringify({query:candidate.productCode ? `"${normalizeProductCode(candidate.productCode)}" ${candidate.brand} specifications` : `${candidate.brand} ${candidate.model} ${manufacturerOnly ? 'technical specifications' : 'full specifications -leak -rumor -rumour -comparison'}`, search_depth:'basic', exact_match:Boolean(candidate.productCode), max_results:5, include_raw_content:'text', include_answer:false, include_images:false, auto_parameters:false, include_domains:domains}),
        });
        if (!response.ok) { if (debugSources) diagnostics.push({http:response.status,scope:domains===MERCHANT_DOMAINS?'retailer':'core'}); return {status:response.status===429?'rate_limited':'unavailable',results:[]}; }
        const payload = await response.json();
        if (debugSources) diagnostics.push({scope:domains===MERCHANT_DOMAINS?'retailer':'core',results:(payload?.results || []).map(item=>({title:item.title,url:item.url,rawLength:String(item.raw_content||'').length,contentLength:String(item.content||'').length,codeMatch:referenceMatchesCode({title:item.title,url:item.url,text:item.raw_content || item.content},candidate.productCode || '')}))});
        return {status:'ready',results:Array.isArray(payload?.results)?payload.results:[]};
      };
      const primary = await request(CORE_DOMAINS);
      if (primary.status !== 'ready') return {status:primary.status,sources:[],...(debugSources?{diagnostics}:{})};
      let sources = referenceResults(primary,candidate);
      if (sources.length < 2 || Math.max(0,...sources.map(source=>technicalCoverage(source.text))) < 6) {
        try {
          const needsManufacturer = !sources.some(source=>source.official);
          const supplement = await request(candidate.productCode ? MERCHANT_DOMAINS : needsManufacturer ? OFFICIAL_DOMAINS : DIRECTORY_DOMAINS, !candidate.productCode && needsManufacturer);
          if (supplement.status === 'ready') sources = referenceResults({results:[...primary.results,...supplement.results]},candidate);
        } catch { /* Keep useful primary sources if the supplementary search times out. */ }
      }
      return {status:sources.length?'ready':'not_found',sources,...(debugSources?{diagnostics}: {})};
    } catch { return {status:'unavailable',sources:[]}; }
    finally { clearTimeout(timer); }
  })().then(result=>{
    if (CACHE.size>=128) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(key,{result,expires:Date.now()+(result.status==='ready' && Math.max(0,...result.sources.map(source=>technicalCoverage(source.text)))>=6 ? 3600000 : 30000)});
    return result;
  }).finally(()=>PENDING.delete(key));
  PENDING.set(key,pending);
  return pending;
}

module.exports = { searchDeviceSources, referenceResults, safeReferenceUrl };
