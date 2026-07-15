const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { currencyForRegion, normalizeRegion } = require('../utils/regions');

function parseImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch (_error) {
    return typeof value === 'string' ? [value] : [];
  }
}

function parseSpecs(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

const parseObject = parseSpecs;

function normalizeProduct(row) {
  if (!row) return null;
  const region = normalizeRegion(row.region);
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price) || 0,
    images: parseImages(row.images),
    specs: parseSpecs(row.specs),
    category: row.category || 'Elektronika',
    location: row.location || 'Unknown',
    condition: row.condition === 'new' ? 'new' : 'used',
    brand: row.brand || 'Inne',
    model: row.model || row.title,
    stock: Number.isInteger(row.stock) ? row.stock : Number(row.stock) || 0,
    seller: row.seller || 'NaShary Store',
    sellerId: row.createdBy || null,
    sellerAvatar: row.sellerAvatar || '',
    sellerVerified: row.verificationStatus === 'verified',
    sellerRating: row.sellerRating == null ? null : Number(Number(row.sellerRating).toFixed(1)),
    sellerReviewCount: Number(row.sellerReviewCount) || 0,
    sellerType: row.sellerType === 'private' ? 'private' : 'store',
    delivery: ['shipping', 'pickup', 'both'].includes(row.delivery) ? row.delivery : 'both',
    warranty: ['seller', 'manufacturer'].includes(row.warranty) ? row.warranty : 'none',
    negotiable: Boolean(row.negotiable),
    status: ['active', 'reserved', 'sold', 'draft'].includes(row.status) ? row.status : 'active',
    urgent: Boolean(row.urgent),
    inspection: parseObject(row.inspection),
    inspectionScore: Object.values(parseObject(row.inspection)).filter(Boolean).length,
    deviceDetails: parseObject(row.deviceDetails),
    oldPrice: row.oldPriceCents ? Number(row.oldPriceCents) / 100 : null,
    region,
    currency: currencyForRegion(region),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || null,
  };
}

async function listProducts(filters = {}) {
  const db = getDB();
  const where = [];
  const params = {};

  if (filters.q) {
    where.push(
      '(LOWER(title) LIKE @q OR LOWER(description) LIKE @q OR LOWER(brand) LIKE @q OR LOWER(location) LIKE @q)'
    );
    params.q = `%${filters.q.toLowerCase()}%`;
  }
  if (filters.category) {
    where.push('category = @category COLLATE NOCASE');
    params.category = filters.category;
  }
  if (filters.condition) {
    where.push('condition = @condition');
    params.condition = filters.condition;
  }
  if (filters.grade) {
    where.push("json_extract(deviceDetails, '$.grade') = @grade");
    params.grade = filters.grade;
  }
  if (filters.brand) {
    where.push('brand = @brand COLLATE NOCASE');
    params.brand = filters.brand;
  }
  if (filters.model) {
    where.push('model = @model COLLATE NOCASE');
    params.model = filters.model;
  }
  if (filters.location) {
    where.push('location = @location COLLATE NOCASE');
    params.location = filters.location;
  }
  if (filters.sellerType) {
    where.push('sellerType = @sellerType');
    params.sellerType = filters.sellerType;
  }
  if (filters.delivery) {
    where.push("(delivery = @delivery OR delivery = 'both')");
    params.delivery = filters.delivery;
  }
  if (filters.warranty) {
    where.push('warranty = @warranty');
    params.warranty = filters.warranty;
  }
  if (filters.negotiable) where.push('negotiable = 1');
  if (filters.urgent) where.push('urgent = 1');
  if (filters.verified) where.push("u.verificationStatus = 'verified'");
  if (!filters.includeInactive) where.push("status = 'active'");
  if (filters.region) {
    where.push('region = @region');
    params.region = normalizeRegion(filters.region);
  }
  if (filters.minPrice !== undefined) {
    where.push('priceCents >= @minPriceCents');
    params.minPriceCents = Math.round(filters.minPrice * 100);
  }
  if (filters.maxPrice !== undefined) {
    where.push('priceCents <= @maxPriceCents');
    params.maxPriceCents = Math.round(filters.maxPrice * 100);
  }
  if (filters.inStock) where.push('stock > 0');
  if (filters.ownerId) {
    where.push('createdBy = @ownerId');
    params.ownerId = filters.ownerId;
  }

  const orderBy = {
    newest: 'p.createdAt DESC',
    oldest: 'p.createdAt ASC',
    price_asc: 'p.priceCents ASC, p.createdAt DESC',
    price_desc: 'p.priceCents DESC, p.createdAt DESC',
    rating_desc: 'sellerRating DESC, p.createdAt DESC',
    stock_desc: 'p.stock DESC, p.createdAt DESC',
    title_asc: 'p.title COLLATE NOCASE ASC',
  }[filters.sort || 'newest'];
  const sql = `SELECT p.*, u.verificationStatus, u.avatar AS sellerAvatar,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerRating,
    (SELECT COUNT(*) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerReviewCount
    FROM products p LEFT JOIN users u ON u.id = p.createdBy${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${orderBy}`;
  const products = db.prepare(sql).all(params).map(normalizeProduct);
  if (!filters.specs || !Object.keys(filters.specs).length) return products;
  return products.filter((product) =>
    Object.entries(filters.specs).every(
      ([key, value]) =>
        String(product.specs[key] || '').toLowerCase() === String(value).toLowerCase()
    )
  );
}

async function getProduct(id) {
  return normalizeProduct(
    getDB()
      .prepare(
        `SELECT p.*, u.verificationStatus, u.avatar AS sellerAvatar,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerRating,
    (SELECT COUNT(*) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerReviewCount
    FROM products p LEFT JOIN users u ON u.id = p.createdBy WHERE p.id = ?`
      )
      .get(id)
  );
}

async function getProductOwner(id) {
  const row = getDB().prepare('SELECT createdBy FROM products WHERE id = ?').get(id);
  return row ? row.createdBy : undefined;
}

async function createProduct(payload, options = {}) {
  const db = getDB();
  const id = options.id || uuidv4();
  const createdAt = options.createdAt || Date.now();
  const price = Number(payload.price) || 0;
  const region = normalizeRegion(payload.region);
  const product = {
    id,
    title: payload.title,
    description: payload.description || '',
    price,
    priceCents: Math.round(price * 100),
    images: Array.isArray(payload.images) ? payload.images : [],
    specs: payload.specs && typeof payload.specs === 'object' ? payload.specs : {},
    category: payload.category || 'Elektronika',
    location: payload.location || 'Unknown',
    condition: payload.condition === 'new' ? 'new' : 'used',
    brand: payload.brand || 'Inne',
    model: payload.model || payload.title,
    stock: Number.isInteger(payload.stock) ? payload.stock : 1,
    seller: payload.seller || 'NaShary Store',
    sellerType: payload.sellerType === 'private' ? 'private' : 'store',
    delivery: ['shipping', 'pickup', 'both'].includes(payload.delivery) ? payload.delivery : 'both',
    warranty: ['seller', 'manufacturer'].includes(payload.warranty) ? payload.warranty : 'none',
    negotiable: payload.negotiable !== false,
    status: ['active', 'reserved', 'sold', 'draft'].includes(payload.status) ? payload.status : 'active',
    urgent: Boolean(payload.urgent),
    inspection: payload.inspection && typeof payload.inspection === 'object' ? payload.inspection : {},
    deviceDetails: payload.deviceDetails && typeof payload.deviceDetails === 'object' ? payload.deviceDetails : {},
    region,
    currency: currencyForRegion(region),
    createdBy: options.createdBy || null,
    createdAt,
  };

  db.prepare(
    `
    INSERT INTO products (
      id, title, description, price, priceCents, images, specs, category, location,
      condition, brand, model, stock, seller, sellerType, delivery, warranty, negotiable, status, urgent, inspection, deviceDetails, region, currency, createdBy, createdAt
    ) VALUES (
      @id, @title, @description, @price, @priceCents, @images, @specs, @category, @location,
      @condition, @brand, @model, @stock, @seller, @sellerType, @delivery, @warranty, @negotiable, @status, @urgent, @inspection, @deviceDetails, @region, @currency, @createdBy, @createdAt
    )
  `
  ).run({
    ...product,
    images: JSON.stringify(product.images),
    specs: JSON.stringify(product.specs),
    inspection: JSON.stringify(product.inspection),
    deviceDetails: JSON.stringify(product.deviceDetails),
    negotiable: product.negotiable ? 1 : 0,
    urgent: product.urgent ? 1 : 0,
  });

  db.prepare('INSERT INTO price_history (id, productId, priceCents, createdAt) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), id, product.priceCents, createdAt);

  return getProduct(id);
}

async function updateProduct(id, payload) {
  const existing = await getProduct(id);
  if (!existing) return null;

  const merged = { ...existing, ...payload };
  merged.region = normalizeRegion(merged.region);
  merged.currency = currencyForRegion(merged.region);
  const priceCents = Math.round(merged.price * 100);
  const updatedAt = Date.now();
  const priceChanged = Number(existing.price) !== Number(merged.price);
  const result = getDB()
    .prepare(
      `
    UPDATE products SET
      title = @title,
      description = @description,
      price = @price,
      priceCents = @priceCents,
      images = @images,
      specs = @specs,
      category = @category,
      location = @location,
      condition = @condition,
      brand = @brand,
      model = @model,
      stock = @stock,
      seller = @seller,
      sellerType = @sellerType,
      delivery = @delivery,
      warranty = @warranty,
      negotiable = @negotiable,
      status = @status,
      urgent = @urgent,
      inspection = @inspection,
      deviceDetails = @deviceDetails,
      oldPriceCents = @oldPriceCents,
      region = @region,
      currency = @currency,
      updatedAt = @updatedAt
    WHERE id = @id
  `
    )
    .run({
      id,
      title: merged.title,
      description: merged.description,
      price: merged.price,
      priceCents,
      images: JSON.stringify(merged.images),
      specs: JSON.stringify(merged.specs || {}),
      category: merged.category,
      location: merged.location,
      condition: merged.condition,
      brand: merged.brand,
      model: merged.model,
      stock: merged.stock,
      seller: merged.seller,
      sellerType: merged.sellerType,
      delivery: merged.delivery,
      warranty: merged.warranty,
      negotiable: merged.negotiable ? 1 : 0,
      status: merged.status,
      urgent: merged.urgent ? 1 : 0,
      inspection: JSON.stringify(merged.inspection || {}),
      deviceDetails: JSON.stringify(merged.deviceDetails || {}),
      oldPriceCents: priceChanged ? Math.round(existing.price * 100) : (existing.oldPrice ? Math.round(existing.oldPrice * 100) : null),
      region: merged.region,
      currency: merged.currency,
      updatedAt,
    });

  if (result.changes && priceChanged) {
    getDB().prepare('INSERT INTO price_history (id, productId, priceCents, createdAt) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), id, priceCents, updatedAt);
  }
  return result.changes ? getProduct(id) : null;
}

async function deleteProduct(id) {
  return getDB().prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
}

module.exports = {
  createProduct,
  deleteProduct,
  getProduct,
  getProductOwner,
  listProducts,
  normalizeProduct,
  updateProduct,
};
