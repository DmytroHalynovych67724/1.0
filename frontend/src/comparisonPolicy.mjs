export const comparisonLimit = 4;
export function comparisonCategory(product) { return typeof product?.category === 'string' ? product.category.trim().toLowerCase() : ''; }
export function normalizeComparison(items) {
  if (!Array.isArray(items)) return [];
  const valid = items.filter((item) => item && typeof item.id === 'string' && comparisonCategory(item));
  const category = comparisonCategory(valid[0]);
  const seen = new Set();
  return valid.filter((item) => {
    if (comparisonCategory(item) !== category || seen.has(item.id)) return false;
    seen.add(item.id); return true;
  }).slice(0, comparisonLimit);
}
export function comparisonAction(items, product) {
  if (items.some((item) => item.id === product?.id)) return 'remove';
  if (!product?.id || !comparisonCategory(product)) return 'category';
  if (items.length && comparisonCategory(items[0]) !== comparisonCategory(product)) return 'category';
  return items.length >= comparisonLimit ? 'limit' : 'add';
}
export function differentValues(values) { return new Set(values.map((value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase())).size > 1; }
