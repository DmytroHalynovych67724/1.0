const ICECAT_API_URL = 'https://live.icecat.biz/api';
const ICECAT_ATTRIBUTION_URL = 'https://icecat.biz/';
const ICECAT_DISCLAIMER_URL = 'https://icecat.biz/en/menu/disclaimer';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const responseCache = new Map();

function configuration() {
  return {
    enabled: !/^(0|false|off)$/i.test(String(process.env.ICECAT_ENABLED || 'true')),
    username: String(process.env.ICECAT_USERNAME || 'openIcecat-live').trim(),
    apiToken: String(process.env.ICECAT_API_TOKEN || '').trim(),
    contentToken: String(process.env.ICECAT_CONTENT_TOKEN || '').trim(),
  };
}

function icecatStatus() {
  const config = configuration();
  return {
    enabled: config.enabled,
    mode: config.username.toLowerCase() === 'openicecat-live' ? 'demo' : 'account',
  };
}

function normalizedName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[®™]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cleanValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();
}

function featureEntries(data) {
  return (data?.FeaturesGroups || data?.FeatureGroups || []).flatMap((group) =>
    (group?.Features || []).map((item) => ({
      name: normalizedName(item?.Feature?.Name?.Value),
      value: cleanValue(item?.PresentationValue || item?.LocalValue || item?.Value),
    }))
  );
}

function createFeatureReader(entries) {
  const exact = new Map(entries.filter((item) => item.name && item.value).map((item) => [item.name, item.value]));
  const read = (...names) => {
    for (const name of names) {
      const value = exact.get(normalizedName(name));
      if (value) return value;
    }
    return '';
  };
  const collect = (pattern) =>
    [...new Set(entries.filter((item) => pattern.test(item.name)).map((item) => item.value).filter(Boolean))];
  return { read, collect };
}

function isYes(value) {
  return /^(yes|true|tak|1)$/i.test(String(value || '').trim());
}

function joinParts(parts, separator = ', ') {
  return [...new Set(parts.map(cleanValue).filter(Boolean))].join(separator).slice(0, 80);
}

function processorValue(read) {
  const family = read('Processor family');
  const model = read('Processor model');
  if (family && model && !family.toLowerCase().includes(model.toLowerCase())) {
    return cleanValue(`${family} ${model}`);
  }
  return model || family;
}

function normalizeIcecatProduct(payload, fallback = {}) {
  if (!payload || payload.msg !== 'OK' || !payload.data) return null;
  const data = payload.data;
  const info = data.GeneralInfo || data.EssentialInfo || {};
  const entries = featureEntries(data);
  const { read, collect } = createFeatureReader(entries);
  const displaySize = read('Display diagonal');
  const displayType = read(
    'Display technology marketing name',
    'Display type',
    'Panel type'
  );
  const rearCameras = collect(/rear camera.*resolution.*numeric$/);
  const frontCameras = collect(/front camera.*resolution.*numeric$/);
  const wifi = read('Top Wi-Fi standard', 'Wi-Fi standards');
  const bluetooth = read('Bluetooth version');
  const usbValue = read('USB connector type', 'USB port');
  const usb = isYes(usbValue) ? 'USB' : usbValue;
  const network = read('Mobile network generation');
  const connectivity = joinParts([
    read('Connectivity technology'),
    read('Device interface'),
    network,
    wifi,
    bluetooth ? `Bluetooth ${bluetooth}` : '',
    isYes(read('Near Field Communication (NFC)')) ? 'NFC' : '',
    usb,
  ]);
  const displayFeatures = joinParts([
    isYes(read('High Dynamic Range (HDR) supported')) ? 'HDR' : '',
    isYes(read('Always-on display')) ? 'Always-on display' : '',
  ]);
  const features = joinParts([
    isYes(read('Fingerprint reader')) ? 'Fingerprint reader' : '',
    isYes(read('Face recognition')) ? 'Face recognition' : '',
    isYes(read('Near Field Communication (NFC)')) ? 'NFC' : '',
  ]);
  const cameraFeatures = joinParts([
    read('Rear camera type'),
    isYes(read('Night mode')) ? 'Night mode' : '',
    isYes(read('Optical image stabilization')) ? 'OIS' : '',
  ]);
  const specs = {
    color: read('Product colour'),
    screen: joinParts([displaySize, displayType], ' '),
    displayType,
    resolution: read('Display resolution'),
    refreshRate: read('Maximum refresh rate'),
    displayFeatures,
    processor: processorValue(read),
    ram: read('RAM capacity', 'Internal memory'),
    ramType: read('RAM type', 'Internal memory type'),
    storage: read('Internal storage capacity', 'Total storage capacity'),
    gpu: joinParts([read('Discrete graphics card model'), read('On-board graphics card model')], ' / '),
    battery: read('Battery capacity', 'Battery life (max)', 'Continuous audio playback time'),
    charging: read('Fast charging power', 'AC adapter power'),
    mainCamera: joinParts(rearCameras, ' + '),
    frontCamera: joinParts(frontCameras, ' + '),
    cameraFeatures,
    features,
    sim: read('SIM card capability'),
    os: joinParts([read('Operating system installed'), read('Operating system version')], ' '),
    connectivity,
    platform: read('Gaming platforms supported', 'Platform'),
    audioType: read('Product type', 'Headset type', 'Wearing style'),
    accessoryType: read('Product type'),
    wifi,
    bluetooth,
    weight: read('Weight'),
  };
  Object.keys(specs).forEach((key) => {
    if (!specs[key]) delete specs[key];
  });

  const brand = cleanValue(info.Brand || fallback.brand);
  const productName = cleanValue(
    info.ProductName || info.ProductNameInfo?.ProductIntName || fallback.model
  );
  const title = cleanValue(data.Title || info.Title || [brand, productName].filter(Boolean).join(' '));
  const icecatId = String(info.IcecatId || fallback.icecatId || '').trim();
  const gtin = Array.isArray(info.GTIN) ? String(info.GTIN[0] || '') : String(info.GTIN || '');
  return {
    brand: brand || fallback.brand || '',
    model: productName || fallback.model || title,
    title: title || fallback.title || [brand, productName].filter(Boolean).join(' '),
    specs,
    source: 'Open Icecat',
    sourceUrl: ICECAT_ATTRIBUTION_URL,
    disclaimerUrl: ICECAT_DISCLAIMER_URL,
    icecatId,
    productCode: cleanValue(info.ProductCode || info.BrandPartCode || fallback.productCode),
    gtin: cleanValue(gtin || fallback.gtin),
    demo: Boolean(data.DemoAccount),
  };
}

function identifierKey(identifier) {
  if (identifier.icecatId) return `id:${identifier.icecatId}`;
  if (identifier.gtin) return `gtin:${identifier.gtin}`;
  return `brand:${identifier.brand || ''}:code:${identifier.productCode || ''}`.toLowerCase();
}

async function fetchIcecatProduct(identifier, fallback = {}) {
  const config = configuration();
  if (!config.enabled || !config.username) return null;
  const key = `${config.username}:EN:${identifierKey(identifier)}`;
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = new URL(ICECAT_API_URL);
  url.searchParams.set('lang', String(process.env.ICECAT_LANGUAGE || 'EN').toUpperCase());
  url.searchParams.set('shopname', config.username);
  url.searchParams.set('content', 'essentialinfo,title,featuregroups');
  if (identifier.icecatId) url.searchParams.set('icecat_id', identifier.icecatId);
  else if (identifier.gtin) url.searchParams.set('GTIN', identifier.gtin);
  else {
    url.searchParams.set('Brand', identifier.brand);
    url.searchParams.set('ProductCode', identifier.productCode);
  }

  const headers = { accept: 'application/json', 'user-agent': 'NaShary diploma marketplace/1.0' };
  if (config.apiToken) headers['api-token'] = config.apiToken;
  if (config.contentToken) headers['content-token'] = config.contentToken;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) return null;
    const result = normalizeIcecatProduct(await response.json(), { ...fallback, ...identifier });
    if (result && Object.keys(result.specs).length >= 2) {
      responseCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    }
    return null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  fetchIcecatProduct,
  icecatStatus,
  normalizeIcecatProduct,
};
