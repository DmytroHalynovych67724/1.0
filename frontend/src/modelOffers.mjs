export const configurationKeys = ['color', 'storage', 'ram', 'processor', 'gpu', 'productCode'];

function variantValue(offer, key) {
  const value = key === 'productCode' ? offer.deviceDetails?.productCode : offer.specs?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

const comparable = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Each combination must belong to an actual listing; a missing value is not a match.
export function filterModelOffers(offers = [], filters = {}) {
  return offers.filter((offer) => (!filters.condition || offer.condition === filters.condition)
    && configurationKeys.every((key) => !filters[key] || comparable(variantValue(offer, key)) === comparable(filters[key])))
    .sort((a, b) => Number(b.condition === 'new') - Number(a.condition === 'new') || a.price - b.price);
}

export function variantOptions(offers = [], filters = {}, key) {
  const values = new Map();
  for (const offer of offers) {
    const value = variantValue(offer, key);
    if (value && !values.has(comparable(value))) values.set(comparable(value), value);
  }
  return [...values.values()].map((value) => ({ value, count: filterModelOffers(offers, { ...filters, [key]: value }).length }));
}

// Never present one seller's configuration as a fact about every offer.
export function summarizeModelOffers(offers = []) {
  const cheapest = offers.reduce((best, offer) => !best || offer.price < best.price ? offer : best, null);
  const keys = [...new Set(offers.flatMap((offer) => Object.keys(offer.specs || {})))];
  const specs = {};
  for (const key of keys) {
    const value = offers[0]?.specs?.[key];
    if (typeof value === 'string' && value.trim() && offers.every((offer) => comparable(offer.specs?.[key]) === comparable(value))) specs[key] = value.trim();
  }
  return { cheapest, specs, hasDifferences: keys.length > Object.keys(specs).length };
}
