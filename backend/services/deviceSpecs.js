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
const CURATED_DEVICES = [
  { category: 'Laptopy', brand: 'Apple', model: 'MacBook Air M2', specs: { screen: '13.6″ Liquid Retina IPS', resolution: '2560 × 1664', refreshRate: '60 Hz', processor: 'Apple M2', ram: '8 GB / 16 GB / 24 GB', storage: '256 GB / 512 GB / 1 TB / 2 TB', gpu: 'Apple M2 8-core / 10-core GPU', battery: '52.6 Wh', os: 'macOS', connectivity: 'MagSafe 3, 2× Thunderbolt / USB 4, 3.5 mm', wifi: 'Wi‑Fi 6', bluetooth: '5.3', weight: '1.24 kg' } },
  { category: 'Laptopy', brand: 'Lenovo', model: 'Legion 5', specs: { screen: '15.6″ / 16″ IPS', resolution: 'Full HD / WQXGA', refreshRate: '144 Hz / 165 Hz', processor: 'AMD Ryzen 5 / Ryzen 7 or Intel Core i5 / i7', ram: '16 GB / 32 GB', storage: '512 GB / 1 TB SSD', gpu: 'NVIDIA GeForce RTX series', os: 'Windows', connectivity: 'USB‑C, USB‑A, HDMI, Ethernet', wifi: 'Wi‑Fi 6', bluetooth: '5.x' } },
  { category: 'Laptopy', brand: 'ASUS', model: 'TUF Gaming A15', specs: { screen: '15.6″ IPS', resolution: '1920 × 1080', refreshRate: '144 Hz', processor: 'AMD Ryzen series', ram: '16 GB / 32 GB', storage: '512 GB / 1 TB SSD', gpu: 'NVIDIA GeForce RTX series', os: 'Windows', connectivity: 'USB‑C, USB‑A, HDMI, Ethernet', wifi: 'Wi‑Fi 6', bluetooth: '5.x' } },
  { category: 'Audio', brand: 'Sony', model: 'WH-1000XM5', specs: { audioType: 'Słuchawki nauszne', connectivity: 'Bluetooth, 3.5 mm, USB‑C', bluetooth: '5.2', battery: 'do 30 h z ANC / 40 h bez ANC', charging: 'USB‑C, szybkie ładowanie', features: 'ANC, tryb ambient, multipoint', weight: '250 g' } },
  { category: 'Audio', brand: 'Apple', model: 'AirPods Pro 2', specs: { audioType: 'Słuchawki dokanałowe', connectivity: 'Bluetooth, USB‑C / MagSafe', bluetooth: '5.3', battery: 'do 6 h / do 30 h z etui', features: 'ANC, tryb kontaktu, dźwięk przestrzenny', color: 'White' } },
  { category: 'Gaming', brand: 'Sony', model: 'PlayStation 5 Slim', specs: { platform: 'PlayStation 5', processor: 'AMD Zen 2', ram: '16 GB GDDR6', storage: '1 TB SSD', gpu: 'AMD RDNA 2', resolution: 'do 4K', refreshRate: 'do 120 Hz', connectivity: 'HDMI 2.1, USB, Ethernet', wifi: 'Wi‑Fi 6', bluetooth: '5.1', color: 'White' } },
  { category: 'Gaming', brand: 'Nintendo', model: 'Switch OLED', specs: { platform: 'Nintendo Switch', screen: '7″ OLED', resolution: '1280 × 720', storage: '64 GB', connectivity: 'USB‑C, HDMI przez stację dokującą', wifi: 'Wi‑Fi 5', bluetooth: '4.1', color: 'White / Neon' } },
  { category: 'Monitory', brand: 'Dell', model: 'UltraSharp U2723QE', specs: { screen: '27″', displayType: 'IPS Black', resolution: '3840 × 2160 (4K UHD)', refreshRate: '60 Hz', connectivity: 'USB‑C, DisplayPort, HDMI, USB hub, Ethernet', features: 'KVM, Power Delivery 90 W', color: 'Silver / Black' } },
  { category: 'Akcesoria', brand: 'Logitech', model: 'MX Master 3S', specs: { accessoryType: 'Mysz', connectivity: 'Bluetooth Low Energy / Logi Bolt', bluetooth: 'Low Energy', battery: 'do 70 dni', charging: 'USB‑C', features: '8000 DPI, ciche kliknięcia, MagSpeed', color: 'Graphite / Pale Grey' } },
];
const LOOKUP_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const lookupCache = new Map();

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
    .replace(/\b(?:32|64|128|256|512|1024|2048)\s*(?:GB|ГБ|TB|ТБ)\b/gi, ' ')
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

async function wikipediaSpecs(query, category = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const searchQuery = modelSearchQuery(query, category) || query;
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.search = new URLSearchParams({ action: 'query', list: 'search', srsearch: `"${searchQuery}" ${wikipediaKeyword(category)}`, srlimit: '6', format: 'json', origin: '*' });
    const search = await fetch(searchUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
    const candidates = (search?.query?.search || []).filter((item) => !/list of|comparison|history|timeline/i.test(item.title));
    if (!candidates.length) return null;

    const pageUrl = new URL('https://en.wikipedia.org/w/api.php');
    pageUrl.search = new URLSearchParams({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: candidates.map((item) => item.title).join('|'), format: 'json', formatversion: '2', origin: '*' });
    const page = await fetch(pageUrl, { signal: controller.signal, headers: { 'user-agent': 'NaShary diploma marketplace/1.0' } }).then((response) => response.json());
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
      resolution: labelledWikiField(wikitext, ['display_resolution', 'resolution'], query),
      processor: labelledWikiField(wikitext, ['soc', 'cpu', 'processor'], query),
      ram: labelledWikiField(wikitext, ['memory'], query),
      storage: labelledWikiField(wikitext, ['storage'], query),
      gpu: labelledWikiField(wikitext, ['graphics', 'gpu'], query),
      battery: labelledWikiField(wikitext, ['battery'], query),
      mainCamera: labelledWikiField(wikitext, ['rear_camera', 'camera'], query),
      frontCamera: labelledWikiField(wikitext, ['front_camera'], query),
      os: labelledWikiField(wikitext, ['os', 'operating_system'], query),
      connectivity: labelledWikiField(wikitext, ['connectivity', 'input', 'ports'], query),
      weight: labelledWikiField(wikitext, ['weight', 'mass'], query),
    };
    Object.keys(specs).forEach((key) => {
      specs[key] = preciseWikipediaValue(specs[key], query);
      if (!specs[key]) delete specs[key];
    });
    if (Object.keys(specs).length < 2) return null;
    const identity = requestedDeviceIdentity(searchQuery, title);
    return { ...identity, category, specs, source: 'Wikipedia', sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(selected.item.title.replaceAll(' ', '_'))}` };
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupDeviceSpecs(query, { category = '' } = {}) {
  const normalized = String(query || '').trim().toLowerCase();
  if (normalized.length < 3) return [];
  const gtin = normalized.match(/(?:^|\D)(\d{8,14})(?:\D|$)/)?.[1];
  if (gtin) {
    const icecatMatch = await fetchIcecatProduct({ gtin });
    if (icecatMatch) return [mergeTitleSpecs(icecatMatch, query, category)];
  }
  const knownBrand = ['Samsung', 'Apple', 'Lenovo', 'HP', 'Dell', 'ASUS', 'Acer', 'Sony', 'LG', 'Xiaomi', 'Google', 'OnePlus']
    .find((brand) => normalized.includes(brand.toLowerCase()));
  const productCode = String(query).match(/\b(?=[A-Z0-9/-]{6,}\b)(?=[A-Z0-9/-]*\d)(?=[A-Z0-9/-]*[A-Z])[A-Z0-9/-]+\b/i)?.[0];
  if (knownBrand && productCode) {
    const icecatMatch = await fetchIcecatProduct({ brand: knownBrand, productCode });
    if (icecatMatch) return [mergeTitleSpecs(icecatMatch, query, category)];
  }
  const localPhones = category && category !== 'Smartfony' ? [] : [...CURATED_PHONES]
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
      if (icecatMatch) return [mergeTitleSpecs(icecatMatch, query, category), ...local.slice(1).map((item) => mergeTitleSpecs(item, query, category))];
    }
    return local.map((item) => mergeTitleSpecs(item, query, category));
  }
  const curatedDevices = CURATED_DEVICES
    .filter((device) => !category || device.category === category)
    .filter((device) => modelCompatible(modelSearchQuery(query, category), device.brand, device.model))
    .map((device) => mergeTitleSpecs({
      ...device,
      title: `${device.brand} ${device.model}`,
      source: 'NaShary Open Cache',
      matchConfidence: device.model === 'Legion 5' || device.model === 'TUF Gaming A15' ? 'fallback' : 'exact',
    }, query, category));
  if (curatedDevices.length) return curatedDevices;
  try {
    const catalogCandidates = category && category !== 'Smartfony' ? [] : await searchIcecatCatalog(query, { limit: 6 });
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
    // The compact local catalog and Wikipedia remain available if the remote index is unavailable.
  }
  try {
    const remote = await wikipediaSpecs(query, category);
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
  const key = `${normalize(options.category || '')}:${normalize(query)}`;
  const cached = lookupCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = await lookupDeviceSpecs(query, options);
  lookupCache.set(key, { value, expiresAt: Date.now() + LOOKUP_CACHE_TTL_MS });
  return value;
}

function curatedSpecs(query) {
  return [...CURATED_PHONES]
    .sort((a, b) => b.model.length - a.model.length)
    .find((phone) => modelCompatible(query, phone.brand, phone.model));
}

module.exports = { curatedSpecs, findDeviceSpecs, labelledWikiField, modelCompatible, preciseWikipediaValue, specsFromTitle, wikipediaTitleCompatible };
