const { normalize } = require('./icecatCatalog');

function spacedIdentity(value) {
  return normalize(value).replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
}

function inferDeviceCategory(query, fallback = '') {
  const text = spacedIdentity(query);
  if (/\b(playstation|play station|ps 5|xbox|nintendo|steam deck)\b/.test(text)) return 'Gaming';
  if (/\b(macbook|thinkpad|legion|tuf|galaxy book)\b/.test(text)) return 'Laptopy';
  if (/\b(ipad|galaxy tab)\b/.test(text)) return 'Tablety';
  if (/\b(airpods|wh 1000xm|wf 1000xm)\b/.test(text)) return 'Audio';
  if (/\b(iphone|redmi|realme|pixel|xiaomi mi|galaxy s|galaxy a)\b/.test(text)) return 'Smartfony';
  return fallback;
}

module.exports = { spacedIdentity, inferDeviceCategory };
