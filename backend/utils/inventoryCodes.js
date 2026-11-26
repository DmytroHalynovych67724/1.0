const { AppError } = require('./errors');

// ASCII case folding matches SQLite UPPER; non-ASCII code characters stay literal.
function codeKey(value) {
  return typeof value === 'string' ? value.trim().replace(/[a-z]/g, letter => letter.toUpperCase()) : '';
}

function inventoryIdentity(product) {
  return [product.createdBy || product.sellerId || '', product.region, product.condition,
    codeKey(product.supplyDetails?.sku), codeKey(product.supplyDetails?.batch)];
}

function inventoryParameters(product, previous) {
  const identity = inventoryIdentity(product);
  const changed = !previous || previous.status === 'sold' ||
    JSON.stringify(identity) !== JSON.stringify(inventoryIdentity(previous));
  return {
    inventoryCheck: changed && identity[0] && product.condition === 'new' && product.status !== 'sold' && identity[3] ? 1 : 0,
    inventoryOwner: identity[0], inventorySku: identity[3], inventoryBatch: identity[4],
  };
}

// This guard is part of the write itself, so simultaneous requests cannot both
// insert a new row with the same owner/market/SKU/batch. No preliminary read race.
const inventoryWriteGuard = `(@inventoryCheck = 0 OR NOT EXISTS (
  SELECT 1 FROM products AS inventory
  WHERE inventory.id <> @id AND inventory.createdBy = @inventoryOwner
    AND inventory.region = @region AND inventory.condition = 'new' AND inventory.status <> 'sold'
    AND UPPER(TRIM(CASE WHEN json_valid(inventory.supplyDetails) THEN COALESCE(json_extract(inventory.supplyDetails, '$.sku'), '') ELSE '' END)) = @inventorySku
    AND UPPER(TRIM(CASE WHEN json_valid(inventory.supplyDetails) THEN COALESCE(json_extract(inventory.supplyDetails, '$.batch'), '') ELSE '' END)) = @inventoryBatch
))`;

function inventoryConflict() {
  return new AppError(409, 'INVENTORY_CODE_CONFLICT', 'A current listing already uses this SKU and batch in your market',
    [{ field: 'supplyDetails.sku', message: 'Use the existing listing or specify a different batch' }]);
}

module.exports = { codeKey, inventoryParameters, inventoryWriteGuard, inventoryConflict };
