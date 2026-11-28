import { availabilityFor } from './supplyDetails.mjs';

export function canListNew(user) {
  return user?.role === 'admin' || user?.canSellNew === true;
}

export function initialListingCondition(user, requested) {
  if (requested === 'used') return 'used';
  return canListNew(user) ? 'new' : 'used';
}

export function inventoryCondition(item) {
  return item.condition === 'new' ? 'new' : 'used';
}

export function filterInventory(items, { condition = 'all', status = '', query = '' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (condition !== 'all' && inventoryCondition(item) !== condition) return false;
    if (status && item.status !== status) return false;
    const text = [
      item.title,
      item.brand,
      item.model,
      item.deviceDetails?.productCode,
      ...Object.values(item.specs || {}),
      item.supplyDetails?.sku,
      item.supplyDetails?.batch,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

export function inventorySummary(items, user) {
  return {
    total: items.length,
    active: items.filter((item) => item.status === 'active').length,
    drafts: items.filter((item) => item.status === 'draft').length,
    availableUnits: items.reduce((total, item) => {
      if (
        item.status !== 'active' ||
        item.moderationStatus === 'hidden' ||
        item.isDemo ||
        (inventoryCondition(item) === 'new' && !canListNew(user)) ||
        availabilityFor(item) !== 'in_stock'
      )
        return total;
      const stock = Number(item.stock);
      return total + (Number.isSafeInteger(stock) && stock > 0 ? stock : 0);
    }, 0),
  };
}
