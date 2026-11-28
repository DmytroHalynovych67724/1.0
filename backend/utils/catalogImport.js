const { createHash } = require('node:crypto');
const { validateProduct, REGIONS } = require('./validation');
const { codeKey } = require('./inventoryCodes');
const { AppError } = require('./errors');

const categories = new Set(['Smartfony', 'Laptopy', 'Tablety', 'Gaming', 'Audio', 'Monitory', 'Foto', 'Akcesoria']);
function prepareCatalogImport(body, user) {
  if (!body || !REGIONS.has(body.region) || !/^[a-f0-9-]{36}$/i.test(body.requestId || '') || !Array.isArray(body.rows) || !body.rows.length || body.rows.length > 50 || Buffer.byteLength(JSON.stringify(body)) > 1_000_000) {
    throw new AppError(400, 'IMPORT_INVALID', 'Use 1–50 rows, a valid market and an import ID (maximum 1 MB)');
  }
  const identities = new Set();
  return body.rows.map((row, index) => {
    try {
      if (!row || typeof row !== 'object' || Array.isArray(row) || !categories.has(row.category) || !['title', 'brand', 'model', 'location'].every(key => typeof row[key] === 'string' && row[key].trim()) || !Number.isInteger(row.stock) || !['shipping', 'pickup', 'both'].includes(row.delivery) || typeof row.supplyDetails?.sku !== 'string' || !row.supplyDetails.sku.trim()) {
        throw new AppError(400, 'IMPORT_ROW_INVALID', 'Title, brand, model, category, location, SKU, stock and delivery are required');
      }
      if (row.images !== undefined && (!Array.isArray(row.images) || row.images.some(value => typeof value !== 'string' || !/^https?:\/\//i.test(value)))) throw new AppError(400, 'IMPORT_ROW_INVALID', 'Use image URLs only');
      const product = validateProduct({
        title: row.title, description: row.description || '', price: row.price, stock: row.stock,
        brand: row.brand, model: row.model, category: row.category, location: row.location,
        images: row.images || [], specs: row.specs || {}, deviceDetails: { productCode: row.deviceDetails?.productCode || '' },
        supplyDetails: row.supplyDetails || {}, delivery: row.delivery, warranty: row.warranty || 'none',
        condition: 'new', status: 'draft', region: body.region, seller: user.username, sellerType: 'store', negotiable: false,
      });
      const identity = JSON.stringify([codeKey(product.supplyDetails.sku), codeKey(product.supplyDetails.batch)]);
      if (identities.has(identity)) throw new AppError(400, 'IMPORT_DUPLICATE', 'Duplicate SKU and batch in file');
      identities.add(identity);
      const id = 'import-' + createHash('sha256').update(JSON.stringify([user.id, body.requestId, index, product])).digest('hex');
      return { id, product, row: index + 1 };
    } catch (error) {
      if (error instanceof AppError) {
        error.details = [{ field: `rows[${index + 1}]`, message: error.message }, ...(error.details || [])];
      }
      throw error;
    }
  });
}
module.exports = { prepareCatalogImport };
