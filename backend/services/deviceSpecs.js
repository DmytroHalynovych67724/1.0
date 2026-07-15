const { fetchIcecatProduct } = require('./icecat');
const {
  identityTokens,
  normalize,
  searchIcecatCatalog,
  variantTokens,
} = require('./icecatCatalog');

const CURATED_PHONES = [
  { brand: 'Apple', model: 'iPhone 15', specs: { screen: '6.1″ OLED', resolution: '2556 × 1179', refreshRate: '60 Hz', processor: 'Apple A16 Bionic', ram: '6 GB', storage: '128 GB / 256 GB / 512 GB', battery: '3349 mAh', mainCamera: '48 MP + 12 MP', frontCamera: '12 MP', os: 'iOS', connectivity: '5G, Wi‑Fi 6, Bluetooth 5.3, NFC, USB‑C', displayType: 'OLED', charging: '20 W', weight: '171 g' } },
  { brand: 'Apple', model: 'iPhone 15 Pro', specs: { screen: '6.1″ LTPO OLED', resolution: '2556 × 1179', refreshRate: '120 Hz', processor: 'Apple A17 Pro', ram: '8 GB', storage: '128 GB / 256 GB / 512 GB / 1 TB', battery: '3274 mAh', mainCamera: '48 MP + 12 MP + 12 MP', frontCamera: '12 MP', os: 'iOS', connectivity: '5G, Wi‑Fi 6E, Bluetooth 5.3, NFC, USB‑C 3', displayType: 'LTPO OLED', charging: '20 W', weight: '187 g' } },
  { brand: 'Apple', model: 'iPhone 14', specs: { screen: '6.1″ OLED', resolution: '2532 × 1170', refreshRate: '60 Hz', processor: 'Apple A15 Bionic', ram: '6 GB', storage: '128 GB / 256 GB / 512 GB', battery: '3279 mAh', mainCamera: '12 MP + 12 MP', frontCamera: '12 MP', os: 'iOS', connectivity: '5G, Wi‑Fi 6, Bluetooth 5.3, NFC, Lightning', displayType: 'OLED', charging: '20 W', weight: '172 g' } },
  { brand: 'Samsung', model: 'Galaxy S24', icecatId: '118055399', specs: { screen: '6.2″ Dynamic AMOLED 2X', resolution: '2340 × 1080', refreshRate: '120 Hz', processor: 'Exynos 2400 / Snapdragon 8 Gen 3', ram: '8 GB', storage: '128 GB / 256 GB', battery: '4000 mAh', mainCamera: '50 MP + 10 MP + 12 MP', frontCamera: '12 MP', os: 'Android', connectivity: '5G, Wi‑Fi 6E, Bluetooth 5.3, NFC, USB‑C', displayType: 'AMOLED', charging: '25 W', weight: '167 g' } },
  { brand: 'Samsung', model: 'Galaxy S23', icecatId: '107934906', specs: { screen: '6.1″ Dynamic AMOLED 2X', resolution: '2340 × 1080', refreshRate: '120 Hz', processor: 'Snapdragon 8 Gen 2', ram: '8 GB', storage: '128 GB / 256 GB', battery: '3900 mAh', mainCamera: '50 MP + 10 MP + 12 MP', frontCamera: '12 MP', os: 'Android', connectivity: '5G, Wi‑Fi 6E, Bluetooth 5.3, NFC, USB‑C', displayType: 'AMOLED', charging: '25 W', weight: '168 g' } },
  { brand: 'Samsung', model: 'Galaxy A55', icecatId: '120236481', specs: { screen: '6.6″ Super AMOLED', resolution: '2340 × 1080', refreshRate: '120 Hz', processor: 'Exynos 1480', ram: '8 GB / 12 GB', storage: '128 GB / 256 GB', battery: '5000 mAh', mainCamera: '50 MP + 12 MP + 5 MP', frontCamera: '32 MP', os: 'Android', connectivity: '5G, Wi‑Fi 6, Bluetooth 5.3, NFC, USB‑C', displayType: 'AMOLED', charging: '25 W', weight: '213 g' } },
  { brand: 'Google', model: 'Pixel 9 Pro', specs: { screen: '6.3″ LTPO OLED', resolution: '2856 × 1280', refreshRate: '120 Hz', processor: 'Google Tensor G4', ram: '16 GB', storage: '128 GB / 256 GB / 512 GB / 1 TB', battery: '4700 mAh', mainCamera: '50 MP + 48 MP + 48 MP', frontCamera: '42 MP', os: 'Android', connectivity: '5G, Wi‑Fi 7, Bluetooth 5.3, NFC, USB‑C', displayType: 'LTPO OLED', charging: '27 W', weight: '199 g' } },
  { brand: 'Google', model: 'Pixel 8', specs: { screen: '6.2″ OLED', resolution: '2400 × 1080', refreshRate: '120 Hz', processor: 'Google Tensor G3', ram: '8 GB', storage: '128 GB / 256 GB', battery: '4575 mAh', mainCamera: '50 MP + 12 MP', frontCamera: '10.5 MP', os: 'Android', connectivity: '5G, Wi‑Fi 7, Bluetooth 5.3, NFC, USB‑C', displayType: 'OLED', charging: '27 W', weight: '187 g' } },
  { brand: 'Xiaomi', model: '14', specs: { screen: '6.36″ LTPO OLED', resolution: '2670 × 1200', refreshRate: '120 Hz', processor: 'Snapdragon 8 Gen 3', ram: '8 GB / 12 GB / 16 GB', storage: '256 GB / 512 GB / 1 TB', battery: '4610 mAh', mainCamera: '50 MP + 50 MP + 50 MP', frontCamera: '32 MP', os: 'Android', connectivity: '5G, Wi‑Fi 7, Bluetooth 5.4, NFC, USB‑C', displayType: 'LTPO OLED', charging: '90 W', weight: '193 g' } },
  { brand: 'OnePlus', model: '12', specs: { screen: '6.82″ LTPO AMOLED', resolution: '3168 × 1440', refreshRate: '120 Hz', processor: 'Snapdragon 8 Gen 3', ram: '12 GB / 16 GB / 24 GB', storage: '256 GB / 512 GB / 1 TB', battery: '5400 mAh', mainCamera: '50 MP + 64 MP + 48 MP', frontCamera: '32 MP', os: 'Android', connectivity: '5G, Wi‑Fi 7, Bluetooth 5.4, NFC, USB‑C', displayType: 'LTPO AMOLED', charging: '100 W', weight: '220 g' } },
];

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
    .replace(/<ref[^>]*>.*?<\/ref>|<ref[^/]*\/>/gs, '')
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

function modelCompatible(query, brand, model) {
  const candidate = normalize(`${brand} ${model}`);
  const required = identityTokens(query, brand);
  if (!required.length || required.some((token) => !candidate.includes(token))) return false;
  const requestedVariants = variantTokens(query);
  const candidateVariants = variantTokens(model);
  if ([...requestedVariants].some((token) => !candidateVariants.has(token))) return false;
  if ([...candidateVariants].some((token) => !requestedVariants.has(token))) return false;
  return true;
}

function wikipediaTitleCompatible(query, title, pageModels = '') {
  const titleValue = normalize(`${title} ${pageModels}`);
  const important = identityTokens(query).filter(
    (token) => /\d/.test(token) || variantTokens(token).size > 0
  );
  return important.length > 0 && important.every((token) => titleValue.includes(token));
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

function requestedPhoneIdentity(query, fallbackTitle) {
  const brands = ['Samsung', 'Apple', 'Xiaomi', 'Google', 'OnePlus', 'Motorola', 'Huawei', 'Honor', 'Nothing', 'Sony', 'Nokia', 'Realme', 'Oppo', 'Vivo', 'Asus'];
  const brand = brands.find((item) => normalize(query).includes(normalize(item))) || fallbackTitle.split(' ')[0];
  const model = String(query)
    .replace(new RegExp(brand, 'i'), '')
    .replace(/\b(?:32|64|128|256|512|1024)\s*(?:GB|ГБ|TB|ТБ)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { brand, model: model || fallbackTitle, title: `${brand} ${model || fallbackTitle}`.trim() };
}

async function wikipediaSpecs(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: `${query} smartphone`, srlimit: '5', format: 'json', origin: '*' });
    const search = await fetch(searchUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
    const result = search?.query?.search?.find((item) => !/list of|comparison|history/i.test(item.title));
    if (!result) return null;

    const pageUrl = new URL('https://en.wikipedia.org/w/api.php');
    pageUrl.search = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: result.title, format: 'json', formatversion: '2', origin: '*' });
    const page = await fetch(pageUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
    const wikitext = page?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
    if (!wikitext) return null;
    const title = result.title.replace(/\s*\([^)]*\)\s*$/, '');
    const pageModels = field(wikitext, ['name']);
    if (!wikipediaTitleCompatible(query, title, pageModels)) return null;
    const specs = {
      screen: labelledWikiField(wikitext, ['display', 'screen'], query),
      processor: field(wikitext, ['soc', 'cpu']),
      ram: labelledWikiField(wikitext, ['memory'], query),
      storage: labelledWikiField(wikitext, ['storage'], query),
      battery: labelledWikiField(wikitext, ['battery'], query),
      mainCamera: labelledWikiField(wikitext, ['rear_camera', 'camera'], query),
      frontCamera: labelledWikiField(wikitext, ['front_camera'], query),
      os: field(wikitext, ['os', 'operating_system']),
      connectivity: field(wikitext, ['connectivity']),
      weight: labelledWikiField(wikitext, ['weight', 'mass'], query),
    };
    Object.keys(specs).forEach((key) => { if (!specs[key]) delete specs[key]; });
    if (Object.keys(specs).length < 2) return null;
    const identity = requestedPhoneIdentity(query, title);
    return { ...identity, specs, source: 'Wikipedia', sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replaceAll(' ', '_'))}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function findDeviceSpecs(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (normalized.length < 3) return [];
  const gtin = normalized.match(/(?:^|\D)(\d{8,14})(?:\D|$)/)?.[1];
  if (gtin) {
    const icecatMatch = await fetchIcecatProduct({ gtin });
    if (icecatMatch) return [icecatMatch];
  }
  const knownBrand = ['Samsung', 'Apple', 'Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'Sony', 'LG', 'Xiaomi', 'Google', 'OnePlus']
    .find((brand) => normalized.includes(brand.toLowerCase()));
  const productCode = String(query).match(/\b(?=[A-Z0-9/-]{6,}\b)(?=[A-Z0-9/-]*\d)(?=[A-Z0-9/-]*[-/])[A-Z0-9/-]+\b/i)?.[0];
  if (knownBrand && productCode) {
    const icecatMatch = await fetchIcecatProduct({ brand: knownBrand, productCode });
    if (icecatMatch) return [icecatMatch];
  }
  const localPhones = [...CURATED_PHONES]
    .sort((left, right) => right.model.length - left.model.length)
    .filter((phone) => modelCompatible(query, phone.brand, phone.model))
    .slice(0, 5);
  const local = localPhones.map((phone) => {
    const connectivity = phone.specs.connectivity || '';
    const wifi = connectivity.match(/Wi[‑-]Fi\s*[^,]+/i)?.[0] || '';
    const bluetooth = connectivity.match(/Bluetooth\s*[\d.]+/i)?.[0] || '';
    return {
      ...phone,
      title: `${phone.brand} ${phone.model}`,
      specs: {
        ...phone.specs,
        ...(wifi ? { wifi } : {}),
        ...(bluetooth ? { bluetooth: bluetooth.replace(/Bluetooth\s*/i, '') } : {}),
        ...(connectivity.includes('NFC') ? { features: 'NFC' } : {}),
      },
      source: 'NaShary Open Cache',
    };
  });
  if (local.length) {
    const primary = localPhones[0];
    if (primary.icecatId) {
      const icecatMatch = await fetchIcecatProduct(
        { icecatId: primary.icecatId },
        { brand: primary.brand, model: primary.model, title: `${primary.brand} ${primary.model}` }
      );
      if (icecatMatch) return [icecatMatch, ...local.slice(1)];
    }
    return local;
  }
  try {
    const catalogCandidates = await searchIcecatCatalog(query, { limit: 6 });
    if (catalogCandidates.length) {
      const catalogMatches = (
        await Promise.all(
          catalogCandidates.map(async (candidate) => {
            const match = await fetchIcecatProduct(
              { icecatId: candidate.icecatId },
              {
                brand: candidate.brand,
                model: candidate.model,
                productCode: candidate.productCode,
                title: `${candidate.brand} ${candidate.model}`,
              }
            );
            return match ? { ...match, matchConfidence: 'exact' } : null;
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
    // The compact local catalog and Wikipedia remain available if the remote index is unavailable.
  }
  try {
    const remote = await wikipediaSpecs(query);
    return remote ? [{ ...remote, matchConfidence: 'fallback' }] : [];
  } catch (_error) {
    return [];
  }
}

function curatedSpecs(query) {
  return [...CURATED_PHONES]
    .sort((a, b) => b.model.length - a.model.length)
    .find((phone) => modelCompatible(query, phone.brand, phone.model));
}

module.exports = { curatedSpecs, findDeviceSpecs, labelledWikiField, modelCompatible, wikipediaTitleCompatible };
