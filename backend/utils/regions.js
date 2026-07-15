const REGION_CURRENCIES = Object.freeze({
  pl: 'PLN',
  ua: 'UAH',
  eu: 'EUR',
});

const REGIONS = new Set(Object.keys(REGION_CURRENCIES));

function normalizeRegion(value, fallback = 'pl') {
  const region = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return REGIONS.has(region) ? region : fallback;
}

function currencyForRegion(value) {
  return REGION_CURRENCIES[normalizeRegion(value)];
}

module.exports = { REGION_CURRENCIES, REGIONS, currencyForRegion, normalizeRegion };
