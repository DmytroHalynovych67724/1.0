// Options come from actual listings, with compatibility checked against other selections.
export function filterModelOffers(offers = [], filters = {}) {
  return offers.filter((offer) => (!filters.condition || offer.condition === filters.condition)
    && (!filters.color || offer.specs?.color === filters.color)
    && (!filters.storage || offer.specs?.storage === filters.storage))
    .sort((a, b) => Number(b.condition === 'new') - Number(a.condition === 'new') || a.price - b.price);
}

export function variantOptions(offers, filters, key) {
  const values = [...new Set(offers.map((offer) => offer.specs?.[key]).filter((value) => typeof value === 'string' && value.trim()))];
  return values.map((value) => ({ value, count: filterModelOffers(offers, { ...filters, [key]: value }).length }));
}
