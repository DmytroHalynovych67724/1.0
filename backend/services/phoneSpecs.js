const PHONE_SPEC_KEYS = [
  'color', 'screen', 'displayType', 'resolution', 'refreshRate', 'displayFeatures',
  'processor', 'ram', 'ramType', 'storage', 'battery', 'charging', 'mainCamera',
  'frontCamera', 'cameraFeatures', 'features', 'sim', 'os', 'connectivity', 'wifi',
  'bluetooth', 'weight',
];

function tidy(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function capacities(value = '') {
  return [...new Set([...String(value).matchAll(/\b(\d+(?:[.,]\d+)?)\s*(GB|ГБ|TB|ТБ)(?=\s|$|[,;/])/giu)]
    .map((item) => Number(item[1].replace(',', '.')) + (/tb|тб/i.test(item[2]) ? ' TB' : ' GB')))];
}

function normalizeDeviceQuery(value) {
  return String(value || '')
    .replace(/айфон/giu, 'iPhone').replace(/самсунг/giu, 'Samsung')
    .replace(/про\s*макс/giu, 'Pro Max').replace(/про/giu, 'Pro')
    .replace(/ультра/giu, 'Ultra').replace(/піксель|пиксель/giu, 'Pixel')
    .replace(/iphone\s*(\d)/gi, 'iPhone $1')
    .replace(/\s+/g, ' ').trim();
}

function normalizePhoneMatch(match, query = '') {
  const raw = Object.fromEntries(Object.entries(match.specs || {}).map(([key, value]) => [key, tidy(value)]));
  const specs = Object.fromEntries(PHONE_SPEC_KEYS.filter((key) => raw[key]).map((key) => [key, raw[key]]));
  const choices = Object.fromEntries(Object.entries(match.choices || {}).map(([key, values]) => [key, [...values]]));
  const display = [raw.screen, raw.displayType, raw.displayFeatures].filter(Boolean).join(' ');
  const diagonal = display.match(/\b(\d{1,2}(?:[.,]\d+)?)\s*(?:inch(?:es)?|in\b|″|")/i);
  if (diagonal) specs.screen = diagonal[1].replace(',', '.') + '″';
  const matrix = display.match(/(?:LTPO\s+)?(?:Super\s+|Dynamic\s+)?AMOLED(?:\s+2X)?|(?:LTPO\s+)?OLED|IPS(?:\s+LCD)?|LCD/gi);
  if (!specs.displayType && matrix) specs.displayType = [...new Set(matrix)].join(' / ');
  const resolution = (raw.resolution || display).match(/\b(\d{3,4})\s*[x×]\s*(\d{3,4})\b/i);
  if (resolution) specs.resolution = resolution[1] + ' × ' + resolution[2];
  const rate = (raw.refreshRate || display).match(/\b(\d{2,3})\s*Hz\b/i);
  if (rate) specs.refreshRate = rate[1] + ' Hz';
  if (!specs.displayFeatures) {
    const features = display.match(/True Tone|Haptic Touch|HDR10\+?|Dolby Vision|Always[ -]on|\bP3\b|\b\d{3,4}\s*nits?\b/gi);
    if (features) specs.displayFeatures = [...new Set(features)].join(', ');
  }
  if (raw.ram) {
    const sizes = capacities(raw.ram);
    if (sizes.length === 1) specs.ram = sizes[0];
    if (sizes.length > 1) { choices.ram = sizes; delete specs.ram; }
    const type = raw.ram.match(/\b(?:LP)?DDR[345](?:X|x)?\b/);
    if (!specs.ramType && type) specs.ramType = type[0].toUpperCase();
  }
  if (raw.storage) {
    const sizes = capacities(raw.storage);
    if (sizes.length > 1) { choices.storage ||= sizes; delete specs.storage; }
    else if (sizes.length === 1) specs.storage = sizes[0];
  }
  const explicitStorage = capacities(query).filter((size) => /TB/.test(size) || Number(size.split(' ')[0]) >= 32).at(-1);
  if (explicitStorage) {
    if (!choices.storage || choices.storage.includes(explicitStorage)) specs.storage = explicitStorage;
    else delete specs.storage;
  }
  // A model cannot identify the colour or regional SIM variant of a particular device.
  if (choices.color) {
    const color = choices.color.find((value) => query.toLowerCase().split(/\s+/).includes(value.toLowerCase()));
    if (color) specs.color = color;
    else if (!choices.color.includes(specs.color)) delete specs.color;
  }
  if (choices.sim && !choices.sim.includes(specs.sim)) delete specs.sim;
  const battery = raw.battery?.match(/\b(\d{3,5})\s*mAh\b/i);
  if (battery) specs.battery = battery[1] + ' mAh';
  for (const key of ['mainCamera', 'frontCamera']) {
    if (!raw[key]) continue;
    const cameras = [...raw[key].matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:MP(?:ix)?|megapixels?)\b/gi)].map((item) => item[1] + ' MP');
    if (!cameras.length) delete specs[key];
    else if (raw[key].length > 80) specs[key] = cameras.join(' + ');
  }
  if (raw.os && /\biOS\b/i.test(raw.os)) specs.os = 'iOS';
  const connectivity = [raw.connectivity, raw.wifi, raw.bluetooth && 'Bluetooth ' + raw.bluetooth].filter(Boolean).join(', ');
  if (!specs.wifi) specs.wifi = connectivity.match(/(?:Wi[‑-]?Fi\s*[\dE]+(?:\s*\([^)]+\))?|802\.11[a-z]+)/i)?.[0] || '';
  if (!specs.bluetooth) specs.bluetooth = connectivity.match(/Bluetooth\s*([\d.]+)/i)?.[1] || '';
  if (!specs.features && /\bNFC\b/i.test(connectivity)) specs.features = 'NFC';
  for (const key of Object.keys(specs)) {
    specs[key] = tidy(specs[key]);
    if (!specs[key] || /^(?:-|—|n\/a|unknown|null|not available)$/i.test(specs[key]) || /\{\{|\}\}|\[\[|\]\]/.test(specs[key])) delete specs[key];
    else if (specs[key].length > 80) specs[key] = specs[key].slice(0, 77).trimEnd() + '…';
  }
  const missing = PHONE_SPEC_KEYS.filter((key) => !specs[key]);
  return { ...match, specs, choices, coverage: { filled: PHONE_SPEC_KEYS.length - missing.length, total: PHONE_SPEC_KEYS.length, missing } };
}

module.exports = { PHONE_SPEC_KEYS, capacities, normalizeDeviceQuery, normalizePhoneMatch };
