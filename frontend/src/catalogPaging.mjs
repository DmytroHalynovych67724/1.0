export const CATALOG_PAGE_SIZE = 12;

export function catalogPage(payload) {
  if (Array.isArray(payload)) return { items: payload, total: payload.length, offset: 0, limit: payload.length };
  if (!payload || !Array.isArray(payload.items) || !Number.isInteger(payload.total) || payload.total < 0 || !Number.isInteger(payload.offset) || payload.offset < 0) throw new Error('Invalid catalog response');
  return payload;
}

export function mergeCatalogItems(previous, next) {
  const positions = new Map(previous.map((product, index) => [product.id, index]));
  const result = [...previous];
  for (const product of next) {
    if (positions.has(product.id)) result[positions.get(product.id)] = product;
    else { positions.set(product.id, result.length); result.push(product); }
  }
  return result;
}
