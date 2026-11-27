const { normalizeProductCode } = require('./deviceProductCode');
const { fetchIcecatProduct } = require('./icecat');
const { spacedIdentity, inferDeviceCategory } = require('./deviceIdentity');
const { normalizeDeviceQuery, normalizePhoneMatch } = require('./phoneSpecs');
const {
  identityTokens,
  normalize,
  searchIcecatCatalog,
  variantTokens,
} = require('./icecatCatalog');

const LOOKUP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const lookupCache = new Map();
const inFlightLookups = new Map();

function simplifyWikiTemplates(value = '') {
  let cleaned = String(value);
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\{\{([^{}]+)\}\}/g, (_match, body) => {
      const parts = body.split('|').map((part) => part.trim());
      const template = normalize(parts.shift() || '');
      const values = parts.filter((part) => part && !part.includes('='));
      if (template === 'convert') return `${values[0] || ''} ${values[1] || ''}`;
      if (template === 'resx') return `${values[0] || ''} × ${values[1] || ''}`;
      if (template === 'f') return `f/${values[0] || ''}`;
      if (template === 'nowrap') return values[0] || '';
      if (template === 'nbsp') return ' ';
      if (['ubl', 'unbulleted list', 'plainlist'].includes(template)) return values.join(' · ');
      return values[0] || '';
    });
  } while (cleaned !== previous && cleaned.includes('{{'));
  return cleaned;
}

function cleanWiki(value = '') {
  return simplifyWikiTemplates(value)
    .replace(/<!--.*?-->/gs, '')
    .replace(/<ref\b[^>]*\/\s*>/gi, '')
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>/gi, '')
    .replace(/[{}]/g, ' ')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')
    .replace(/&nbsp;|\{\{nbsp\}\}/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' · ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/'''?/g, '')
    .replace(/\s*·\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^·\s*|\s*·$/g, '')
    .replace(/^(?:ubl|unbulleted list)\s*/i, '')
    .slice(0, 220);
}

function networkCompatible(query, candidate) {
  const requested = normalize(query).match(/\b[2345]g\b/)?.[0];
  const found = normalize(candidate).match(/\b[2345]g\b/)?.[0];
  return !requested || !found || requested === found;
}

function modelCompatible(query, brand, model) {
  if (!networkCompatible(query, model)) return false;
  const candidate = new Set(identityTokens(spacedIdentity(`${brand} ${model}`), brand));
  const required = identityTokens(spacedIdentity(query), brand);
  if (!required.length || required.some((token) => !candidate.has(token))) return false;
  const requestedVariants = variantTokens(query);
  const candidateVariants = variantTokens(model);
  if ([...requestedVariants].some((token) => !candidateVariants.has(token))) return false;
  if ([...candidateVariants].some((token) => !requestedVariants.has(token))) return false;
  return true;
}

function wikipediaTitleCompatible(query, title, pageModels = '') {
  if (!networkCompatible(query, title)) return false;
  if (/disambiguation|list of|comparison|history|timeline/i.test(title)) return false;
  const brand = ['Apple','Samsung','Xiaomi','Google','realme','Sony','OnePlus','Lenovo','ASUS','Nintendo'].find(name => normalize(query).includes(normalize(name))) || '';
  const combined = normalize(`${title} ${pageModels}`);
  if (brand && !combined.includes(normalize(brand)) && !(brand === 'Apple' && /iphone|ipad|macbook/.test(combined)) && !(brand === 'Sony' && /playstation/.test(combined))) return false;
  const titleTokens = new Set(identityTokens(spacedIdentity(`${title} ${pageModels}`), brand));
  const important = identityTokens(spacedIdentity(query), brand);
  return important.length > 0 && important.every(token => titleTokens.has(token));
}

function field(wikitext, names) {
  for (const name of names) {
    const match = wikitext.match(
      new RegExp(`\\|\\s*${name}\\s*=([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z_]+\\s*=)`, 'i')
    );
    if (match) {
      const value = cleanWiki(match[1].trim());
      if (value) return value;
    }
  }
  return '';
}

function labelledWikiField(wikitext, names, query) {
  let raw = '';
  for (const name of names) {
    const match = wikitext.match(
      new RegExp(`\\|\\s*${name}\\s*=([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z_]+\\s*=)`, 'i')
    );
    if (match) {
      raw = match[1].trim();
      break;
    }
  }
  if (!raw) return '';

  const listReady = simplifyWikiTemplates(raw).replace(
    /\s+·\s+(?='{2,3}[^']+?:)/g,
    '\n|'
  );
  const items = listReady
    .split(/\n(?=\s*\|)/)
    .map((item) => item.replace(/^\s*\|\s*/, '').trim())
    .filter((item) => item && !/^\{\{(?:ubl|unbulleted list|plainlist)\s*$/i.test(item) && item !== '}}');
  if (items.length < 2) {
    let value = cleanWiki(raw);
    if (variantTokens(query).has('max')) {
      value = value.replace(/(?:^| · )[^·]*\(Pro only\)(?: · |$)/i, ' · ').replace(/^\s*·\s*|\s*·\s*$/g, '');
    }
    return value;
  }

  const queryValue = normalize(query);
  const requiredNumbers = identityTokens(query).filter((token) => /\d/.test(token));
  const requiredVariants = variantTokens(query);
  const labelled = items.map((item, index) => {
    const label = item.match(/^'{2,3}([^']+?):'{2,3}\s*/)?.[1] || '';
    return { index, item, label, value: label ? item.replace(/^'{2,3}[^']+?:'{2,3}\s*/, '') : item };
  });
  const labels = labelled.filter((item) => item.label);
  if (!labels.length) return cleanWiki(raw);

  const selected = labels
    .map((item) => {
      const labelValue = normalize(item.label);
      const labelVariants = variantTokens(item.label);
      if (/^all$/.test(labelValue)) return { ...item, score: 0 };
      if (requiredNumbers.some((token) => !labelValue.includes(token))) return { ...item, score: -1 };
      if ([...requiredVariants].some((token) => !labelVariants.has(token))) return { ...item, score: -1 };
      let score = requiredNumbers.length * 20 + requiredVariants.size * 30;
      if (queryValue.includes(labelValue) || labelValue.includes(queryValue)) score += 10;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  const sharedPrefix = [];
  for (const item of labelled) {
    if (item.label) break;
    sharedPrefix.push(item.value);
  }
  const chosen = [];
  if (selected) {
    for (let index = selected.index; index < labelled.length; index += 1) {
      const item = labelled[index];
      if (index > selected.index && item.label) break;
      chosen.push(item.value);
    }
  }
  const sharedAll = [];
  const all = labels.find((item) => normalize(item.label) === 'all');
  if (all) {
    for (let index = all.index; index < labelled.length; index += 1) {
      const item = labelled[index];
      if (index > all.index && item.label) break;
      sharedAll.push(item.value);
    }
  }
  const result = [...sharedPrefix, ...chosen, ...sharedAll].filter(Boolean).join(' · ');
  return cleanWiki(result);
}

function requestedDeviceIdentity(query, fallbackTitle) {
  const brands = ['Samsung', 'Apple', 'Xiaomi', 'Google', 'OnePlus', 'Motorola', 'Huawei', 'Honor', 'Nothing', 'Sony', 'Nokia', 'Realme', 'Oppo', 'Vivo', 'Asus', 'Lenovo', 'HP', 'Dell', 'Acer', 'MSI', 'Microsoft', 'LG', 'Nintendo', 'Canon', 'Nikon', 'Fujifilm', 'Logitech'];
  const brand = brands.find((item) => normalize(query).includes(normalize(item))) || fallbackTitle.split(' ')[0];
  const model = String(query)
    .replace(new RegExp(brand, 'i'), '')
    .replace(/\b(?:32|64|128|256|512|1024)\s*(?:GB|ГБ|TB|ТБ)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { brand, model: model || fallbackTitle, title: `${brand} ${model || fallbackTitle}`.trim() };
}

function wikipediaKeyword(category) {
  return {
    Smartfony: 'smartphone',
    Laptopy: 'laptop computer',
    Tablety: 'tablet computer',
    Gaming: 'game console',
    Audio: 'headphones audio',
    Monitory: 'computer monitor television',
    Foto: 'camera',
    Akcesoria: 'computer accessory',
  }[category] || 'electronics';
}

function modelSearchQuery(query, category) {
  let value = String(query)
    .replace(/\b\d+\s*\/\s*\d+\s*(?:GB|ГБ|TB|ТБ)?\b/gi, ' ')
    .replace(/\b(?:1|2|4|32|64|128|256|512|1024|2048)\s*(?:GB|ГБ|TB|ТБ)(?=\s|$|[,;])/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:inch|inches|″|")\b/gi, ' ')
    .replace(/\b(?:black|white|blue|green|silver|graphite|gold|purple|red)\b/gi, ' ');
  if (category === 'Laptopy') {
    value = value
      .replace(/\b(?:intel\s+)?(?:core\s+)?i[3579](?:-\d+[a-z]*)?\b/gi, ' ')
      .replace(/\b(?:amd\s+)?ryzen\s*[3579](?:\s+\d+[a-z]*)?\b/gi, ' ')
      .replace(/\b(?:nvidia\s+)?(?:rtx|gtx)\s*\d+[a-z]*\b/gi, ' ');
  }
  return value.replace(/[|]/g, ' ').replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function specsFromTitle(query, category = '') {
  const title = String(query || '');
  const specs = {};
  const pair = title.match(/\b(4|6|8|12|16|18|24|32|48|64)\s*\/\s*(64|128|256|512|1024|2048)\s*(GB|ГБ|TB|ТБ)?\b/i);
  const explicitRam = title.match(/\b(4|6|8|12|16|18|24|32|48|64|96|128)\s*(GB|ГБ)\s*(?:RAM|DDR\d?|LPDDR\w*)\b/i);
  const storageCandidates = [...title.matchAll(/\b(64|128|256|512|1024|2048|1|2|4)\s*(GB|ГБ|TB|ТБ)\s*(SSD|HDD|NVMe|storage|pami[eę][cć])?\b/gi)];
  const explicitStorage = storageCandidates.find((match) => match[3]) || storageCandidates.at(-1);
  const processor = title.match(/\b(?:Intel\s+)?Core\s+Ultra\s+[3579]\s+\d{3}[A-Z]{0,2}\b/i)
    || title.match(/\b(?:Intel\s+)?Core\s+i[3579](?:-\d{4,5}[A-Z]{0,2})?\b/i)
    || title.match(/\b(?:AMD\s+)?Ryzen\s+[3579](?:\s+\d{4}[A-Z]{0,2})?\b/i)
    || title.match(/\bApple\s+M[1-4](?:\s+(?:Pro|Max|Ultra))?\b/i)
    || title.match(/\bSnapdragon\s+[A-Z0-9+ -]{3,24}\b/i)
    || title.match(/\b(?:MediaTek\s+)?Dimensity\s+\d{3,4}\b/i)
    || title.match(/\b(?:Google\s+)?Tensor\s+G?\d\b/i)
    || title.match(/\bExynos\s+\d{3,4}\b/i);
  const gpu = title.match(/\b(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti)?\b/i)
    || title.match(/\b(?:AMD\s+)?Radeon\s+(?:RX\s*)?\d{3,4}[A-Z]{0,2}\b/i);
  const screen = title.match(/\b(\d{1,2}(?:[.,]\d)?)\s*(?:inch|inches|″|")\b/i);
  const refreshRate = title.match(/\b(60|75|90|100|120|144|165|175|180|240|360)\s*Hz\b/i);
  const resolution = title.match(/\b\d{3,4}\s*[x×]\s*\d{3,4}\b/i)
    || title.match(/\b(?:Full\s*HD|FHD|QHD\+?|WQHD\+?|UHD|4K|5K|8K)\b/i);
  const displayType = title.match(/\b(?:Mini[ -]?LED|AMOLED|OLED|IPS|VA|TN)\b/i);

  if (pair) {
    specs.ram = `${pair[1]} GB`;
    specs.storage = `${pair[2]} ${/tb|тб/i.test(pair[3] || '') ? 'TB' : 'GB'}`;
  }
  if (explicitRam) specs.ram = `${explicitRam[1]} GB`;
  if (explicitStorage) specs.storage = `${explicitStorage[1]} ${/tb|тб/i.test(explicitStorage[2]) ? 'TB' : 'GB'}`;
  if (processor) specs.processor = processor[0].replace(/\s+/g, ' ').trim();
  if (gpu) specs.gpu = gpu[0].replace(/\s+/g, ' ').trim();
  if (screen) specs.screen = `${screen[1].replace(',', '.')}″`;
  if (refreshRate) specs.refreshRate = `${refreshRate[1]} Hz`;
  if (resolution) specs.resolution = resolution[0].replace(/\s*[x×]\s*/i, ' × ');
  if (displayType) specs.displayType = displayType[0].replace(/mini[ -]?led/i, 'Mini-LED').toUpperCase().replace('MINI-LED', 'Mini-LED');
  if (category === 'Audio' && /\bANC\b|noise cancel/i.test(title)) specs.features = 'ANC';
  return specs;
}

function preciseWikipediaValue(value, query) {
  if (!value) return '';
  const strictVariants = new Set(['fe', 'flip', 'fold', 'lite', 'max', 'mini', 'plus', 'pro', 'ultra', 'xl']);
  const requested = new Set([...variantTokens(query)].filter((token) => strictVariants.has(token)));
  const present = new Set([...variantTokens(value)].filter((token) => strictVariants.has(token)));
  const unwanted = [...present].filter((token) => !requested.has(token));
  if (!unwanted.length) return value;
  const parts = String(value).split(/\s*[·;]\s*/).filter(Boolean);
  const exactPart = parts.find((part) => {
    const variants = new Set([...variantTokens(part)].filter((token) => strictVariants.has(token)));
    return [...requested].every((token) => variants.has(token))
      && [...variants].every((token) => requested.has(token));
  });
  if (exactPart) return exactPart.replace(/^.*?:\s*/, '').trim();
  return '';
}

function mergeTitleSpecs(match, query, category) {
  if (!match) return match;
  const parsed = specsFromTitle(query, category);
  const specs = { ...parsed, ...(match.specs || {}) };
  for (const key of ['processor', 'ram', 'storage', 'gpu', 'resolution', 'refreshRate', 'displayType']) {
    if (parsed[key]) specs[key] = parsed[key];
  }
  return { ...match, specs };
}

async function wikipediaSpecs(query, category = '', { includeSourceText = false, fetchImpl = global.fetch } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const searchQuery = modelSearchQuery(query, category) || query;
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: `"${searchQuery}" ${wikipediaKeyword(category)}`, srlimit: '6', format: 'json', origin: '*' });
    const search = await fetchImpl(searchUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
    const candidates = (search?.query?.search || []).filter((item) => !/disambiguation|list of|comparison|history|timeline/i.test(item.title));
    if (!candidates.length) return null;

    const pageUrl = new URL('https://en.wikipedia.org/w/api.php');
    pageUrl.search = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: candidates.map((item) => item.title).join('|'), format: 'json', formatversion: '2', origin: '*' });
    const page = await fetchImpl(pageUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
    const selected = (page?.query?.pages || []).map((item) => {
      const wikitext = item?.revisions?.[0]?.slots?.main?.content || '';
      const title = String(item.title || '').replace(/\s*\([^)]*\)\s*$/, '');
      return { item, title, wikitext, pageModels: field(wikitext, ['name']) };
    }).find((item) => item.wikitext && wikipediaTitleCompatible(searchQuery, item.title, item.pageModels));
    if (!selected) return null;
    const { title, wikitext } = selected;
    const specs = {
      screen: labelledWikiField(wikitext, ['display', 'screen'], query),
      displayType: labelledWikiField(wikitext, ['display_type', 'panel'], query),
      refreshRate: labelledWikiField(wikitext, ['refresh_rate', 'display_refresh_rate'], query),
      displayFeatures: labelledWikiField(wikitext, ['display_features'], query),
      resolution: labelledWikiField(wikitext, ['display_resolution', 'resolution'], query),
      processor: labelledWikiField(wikitext, ['soc', 'cpu', 'processor'], query),
      ram: labelledWikiField(wikitext, ['memory'], query),
      ramType: labelledWikiField(wikitext, ['memory_type', 'ram_type'], query),
      storage: labelledWikiField(wikitext, ['storage'], query),
      gpu: labelledWikiField(wikitext, ['graphics', 'gpu'], query),
      battery: labelledWikiField(wikitext, ['battery'], query),
      charging: labelledWikiField(wikitext, ['charging'], query),
      mainCamera: labelledWikiField(wikitext, ['rear_camera', 'camera'], query),
      frontCamera: labelledWikiField(wikitext, ['front_camera'], query),
      cameraFeatures: labelledWikiField(wikitext, ['camera_features'], query),
      features: labelledWikiField(wikitext, ['sensors', 'features'], query),
      sim: labelledWikiField(wikitext, ['sim', 'sim_card'], query),
      os: labelledWikiField(wikitext, ['os', 'operating_system'], query),
      connectivity: labelledWikiField(wikitext, ['connectivity', 'input', 'ports'], query),
      wifi: labelledWikiField(wikitext, ['wifi', 'wi_fi'], query),
      bluetooth: labelledWikiField(wikitext, ['bluetooth'], query),
      weight: labelledWikiField(wikitext, ['weight', 'mass'], query),
    };
    Object.keys(specs).forEach((key) => {
      specs[key] = preciseWikipediaValue(specs[key], query);
      if (!specs[key]) delete specs[key];
    });
    if (Object.keys(specs).length < 2 && !includeSourceText) return null;
    const identity = requestedDeviceIdentity(searchQuery, title);
    return { ...identity, category, specs, source: 'Wikipedia', sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(selected.item.title.replaceAll(' ', '_'))}`, ...(includeSourceText ? { sourceText: wikitext.slice(0, 20000) } : {}) };
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupDeviceSpecs(query, { category = '', productCode: requestedCode = '', wikiLookup = wikipediaSpecs, icecatLookup = fetchIcecatProduct, catalogLookup = searchIcecatCatalog } = {}) {
  const normalized = String(query || '').trim().toLowerCase();
  if (normalized.length < 3) return [];
  if (requestedCode) {
    const brand = ['Samsung','Apple','Lenovo','HP','Dell','ASUS','Acer','MSI','Gigabyte','Microsoft'].find(name => new RegExp(`\\b${name}\\b`,'i').test(query));
    if (!brand) return [];
    const match = await icecatLookup({brand,productCode:requestedCode}).catch(()=>null);
    if (!match || normalize(match.brand) !== normalize(brand) || normalizeProductCode(match.productCode) !== normalizeProductCode(requestedCode)) return [];
    return [{...match,category:match.category || category,productCode:normalizeProductCode(requestedCode),configurationMatched:true}];
  }
  const gtin = normalized.match(/(?:^|\D)(\d{8,14})(?:\D|$)/)?.[1];
  if (gtin) {
    const icecatMatch = await icecatLookup({ gtin });
    if (icecatMatch) return [mergeTitleSpecs(icecatMatch, query, category)];
  }
  const knownBrand = ['Samsung', 'Apple', 'Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'Sony', 'LG', 'Xiaomi', 'Google', 'OnePlus']
    .find((brand) => normalized.includes(brand.toLowerCase()));
  const productCode = String(query).match(/\b(?=[A-Z0-9/-]{6,}\b)(?=[A-Z0-9/-]*\d)(?=[A-Z0-9/-]*[A-Z])[A-Z0-9/-]+\b/i)?.[0];
  if (knownBrand && productCode) {
    const icecatMatch = await icecatLookup({ brand: knownBrand, productCode });
    if (icecatMatch) return [mergeTitleSpecs(icecatMatch, query, category)];
  }
  try {
    const catalogCandidates = category && category !== 'Smartfony' ? [] : await catalogLookup(query, { limit: 6 });
    if (catalogCandidates.length) {
      const catalogMatches = (
        await Promise.all(
          catalogCandidates.map(async (candidate) => {
            const match = await icecatLookup(
              { icecatId: candidate.icecatId },
              {
                brand: candidate.brand,
                model: candidate.model,
                productCode: candidate.productCode,
                title: `${candidate.brand} ${candidate.model}`,
              }
            );
            return match ? mergeTitleSpecs({ ...match, matchConfidence: 'exact' }, query, category) : null;
          })
        )
      ).filter(Boolean);
      const unique = [];
      const seen = new Set();
      for (const match of catalogMatches) {
        const key = `${normalize(match.brand)}:${normalize(match.model)}:${normalize(match.specs?.storage || '')}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(match);
      }
      if (unique.length) {
        const requestedStorage = normalize(query).match(/\b(32|64|128|256|512|1024|2048)\s*(?:gb|tb)\b/)?.[1];
        return unique
          .sort((left, right) => Number(Boolean(requestedStorage && normalize(right.specs?.storage).includes(requestedStorage))) - Number(Boolean(requestedStorage && normalize(left.specs?.storage).includes(requestedStorage))))
          .slice(0, 5);
      }
    }
  } catch (_error) {
    // Wikipedia remains available if the remote index is unavailable.
  }
  try {
    const remote = await wikiLookup(query, category);
    if (remote) return [mergeTitleSpecs({ ...remote, matchConfidence: 'fallback' }, query, category)];
    const parsed = specsFromTitle(query, category);
    if (Object.keys(parsed).length >= 2) {
      const identity = requestedDeviceIdentity(modelSearchQuery(query, category), query);
      return [{ ...identity, category, specs: parsed, source: 'NaShary title parser', matchConfidence: 'exact' }];
    }
    return [];
  } catch (_error) {
    return [];
  }
}

async function findDeviceSpecs(query, options = {}) {
  query = normalizeDeviceQuery(query);
  options = { ...options, category: inferDeviceCategory(query, options.category || '') };
  if (options.wikiLookup || options.icecatLookup || options.catalogLookup) {
    const value = await lookupDeviceSpecs(query, options);
    return value.map(match => options.category === 'Smartfony' || match.category === 'Smartfony' ? normalizePhoneMatch(match, query) : match);
  }
  const key = `${normalize(options.category || '')}:${normalize(query)}:${normalizeProductCode(options.productCode)}`;
  const cached = lookupCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inFlightLookups.has(key)) return inFlightLookups.get(key);
  const pending = lookupDeviceSpecs(query, options).then((value) => {
    value = value.map((match) => (options.category === 'Smartfony' || match.category === 'Smartfony' || /iphone|galaxy|pixel/i.test(match.title || '')) ? normalizePhoneMatch(match, query) : match);
    if (lookupCache.size >= 256) lookupCache.delete(lookupCache.keys().next().value);
    lookupCache.set(key, { value, expiresAt: Date.now() + (value.length ? LOOKUP_CACHE_TTL_MS : 60_000) });
    return value;
  }).finally(() => inFlightLookups.delete(key));
  inFlightLookups.set(key, pending);
  return pending;
}

module.exports = { findDeviceSpecs, labelledWikiField, modelCompatible, preciseWikipediaValue, specsFromTitle, wikipediaTitleCompatible, wikipediaSpecs };
