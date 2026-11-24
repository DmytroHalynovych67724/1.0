// Persist references and small display snapshots; uploaded photos stay on the server.
export function compactProduct(product = {}) {
  if (!product || typeof product !== 'object') product = {};
  const result = {};
  const textFields = ['id', 'title', 'brand', 'model', 'category', 'location', 'condition', 'currency', 'region', 'seller', 'sellerId', 'sellerType', 'delivery', 'warranty', 'status', 'moderationStatus', 'sellerAccountStatus'];
  for (const key of textFields) if (typeof product[key] === 'string') result[key] = product[key].slice(0, key === 'title' ? 120 : 100);
  for (const key of ['price', 'oldPrice', 'stock', 'sellerRating', 'sellerReviewCount', 'createdAt', 'updatedAt']) if (Number.isFinite(product[key])) result[key] = product[key];
  for (const key of ['sellerVerified', 'sellerCanSellNew', 'isDemo', 'negotiable', 'urgent']) if (typeof product[key] === 'boolean') result[key] = product[key];
  result.images = (Array.isArray(product.images) ? product.images : []).filter((url) => typeof url === 'string' && url.length < 2048 && !/^(data:|blob:)/i.test(url)).slice(0, 1);
  result.specs = Object.fromEntries(Object.entries(product.specs || {}).slice(0, 26).filter(([, value]) => typeof value === 'string' || typeof value === 'number').map(([key, value]) => [key.slice(0, 40), String(value).slice(0, 80)]));
  result.supplyDetails = Object.fromEntries(Object.entries(product.supplyDetails || {}).slice(0, 12).filter(([, value]) => typeof value === 'string').map(([key, value]) => [key.slice(0, 40), value.slice(0, 300)]));
  return result;
}

export function compactProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
  return Object.fromEntries(Object.entries(profile).filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) || value === null).map(([key, value]) => [key, typeof value === 'string' ? (/^(data:|blob:)/i.test(value) ? '' : value.slice(0, 2048)) : value]));
}

export function compactCart(items) {
  return (Array.isArray(items) ? items : []).filter((item) => item && typeof item.id === 'string' && item.product && typeof item.product === 'object').slice(0, 100).map((item) => ({ id: item.id, qty: Math.max(1, Math.floor(Number(item.qty) || 1)), product: compactProduct(item.product) }));
}

function recoverSpace(area) {
  for (const [key, convert] of [
    ['nashary-recent', (items) => Array.isArray(items) ? items.filter((p) => p?.id).slice(0, 8).map(compactProduct) : []],
    ['nashary-react-comparison', (items) => Array.isArray(items) ? items.filter((p) => p?.id).slice(0, 4).map(compactProduct) : []],
    ['nashary-react-cart', compactCart],
    ['nashary-user', compactProfile],
  ]) {
    try { const value = area.getItem(key); if (value) area.setItem(key, JSON.stringify(convert(JSON.parse(value)))); } catch { /* Storage is optional; never erase the cart to free space. */ }
  }
}

export function createSafeStorage({ local = () => globalThis.localStorage, session = () => globalThis.sessionStorage } = {}) {
  const memory = new Map();
  const area = (get) => { try { return get(); } catch { return null; } };
  const fallbackKey = (key) => `nashary-fallback:${key}`;
  const removeFrom = (storage, key) => { try { storage?.removeItem(key); return true; } catch { return false; } };
  const finishWrite = (key) => { if (removeFrom(area(session), fallbackKey(key))) memory.delete(key); };
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key);
      try { const fallback = area(session)?.getItem(fallbackKey(key)); if (fallback !== null && fallback !== undefined) return fallback; } catch { /* Try local storage. */ }
      try { return area(local)?.getItem(key) ?? null; } catch { return null; }
    },
    setItem(key, value) {
      value = String(value);
      memory.set(key, value);
      const storage = area(local);
      if (storage) {
        try { storage.setItem(key, value); finishWrite(key); return true; } catch { recoverSpace(storage); }
        try { storage.setItem(key, value); finishWrite(key); return true; } catch { /* Session fallback or in-memory state still works. */ }
      }
      try { area(session)?.setItem(fallbackKey(key), value); } catch { /* Keep the current tab functional even if both stores are full or blocked. */ }
      return false;
    },
    removeItem(key) {
      // A null tombstone also prevents a stale credential from being reused if removal is blocked.
      memory.set(key, null);
      const removedLocal = removeFrom(area(local), key);
      const removedSession = removeFrom(area(session), fallbackKey(key));
      if (removedLocal && removedSession) memory.delete(key);
    },
    repair() { const storage = area(local); if (storage) recoverSpace(storage); },
  };
}

export const safeStorage = createSafeStorage();
export const safeSessionStorage = createSafeStorage({ local: () => globalThis.sessionStorage, session: () => null });

export function readJson(key, fallback) {
  try { return JSON.parse(safeStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
