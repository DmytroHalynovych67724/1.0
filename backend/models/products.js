const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { currencyForRegion, normalizeRegion } = require('../utils/regions');
const { demoCatalogEnabled, SHOWCASE_IDS } = require('../utils/catalog');
const { normalizeInspection, normalizeDeviceDetails } = require('../utils/deviceCondition');
const { inventoryParameters, inventoryWriteGuard, inventoryConflict } = require('../utils/inventoryCodes');

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
    inspection: normalizeInspection(parseObject(row.inspection)),
    inspectionScore: Object.values(normalizeInspection(parseObject(row.inspection))).filter(Boolean).length,
    deviceDetails: normalizeDeviceDetails(parseObject(row.deviceDetails)),
    supplyDetails: parseObject(row.supplyDetails),
    oldPrice: row.oldPriceCents ? Number(row.oldPriceCents) / 100 : null,
    region,
    currency: currencyForRegion(region),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || null,
    moderationStatus: row.moderationStatus || 'approved',
    moderationReason: row.moderationReason || '',
    sellerAccountStatus: row.sellerAccountStatus || 'active',
    sellerCanSellNew: row.sellerRole === 'admin' || Boolean(row.sellerCanSellNew),
    isDemo: row.id.startsWith('demo-'),
  };
}

async function listProducts(filters = {}) {
  const db = getDB();
  const where = [];
  const params = {};
  if (filters.ids) {
    where.push(filters.ids.length ? `p.id IN (${filters.ids.map((_id, index) => `@id${index}`).join(',')})` : '0');
    filters.ids.forEach((id, index) => { params[`id${index}`] = id; });
  }
  Object.entries(filters.specs || {}).forEach(([key, value], index) => {
    if (!/^[a-z][a-z0-9_]*$/i.test(key)) { where.push('0'); return; }
    where.push(`LOWER(CAST(CASE WHEN json_valid(p.specs) THEN json_extract(p.specs, @specPath${index}) END AS TEXT)) = LOWER(@specValue${index})`);
    params[`specPath${index}`] = `$.${key}`;
    params[`specValue${index}`] = String(value);
  });
  if (!filters.includeModerated) {
    where.push("p.moderationStatus = 'approved'");
    where.push("(u.accountStatus IS NULL OR u.accountStatus = 'active')");
    where.push("(p.condition != 'new' OR p.id LIKE 'demo-%' OR u.role = 'admin' OR u.canSellNew = 1)");
  }
  if (!filters.includeDemo && !demoCatalogEnabled()) {
    where.push("(p.id NOT LIKE 'demo-%' OR p.id IN (" + SHOWCASE_IDS.map((id) => "'" + id + "'").join(',') + "))");
  }

  if (filters.q) {
    // Match each term across the title, model and actual configuration, in any order.
    const terms = filters.q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    terms.forEach((term, index) => {
      where.push(`LOWER(COALESCE(p.title, '') || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '') || ' ' || COALESCE(p.model, '') || ' ' || COALESCE(p.location, '') || ' ' || COALESCE(p.specs, '')) LIKE @q${index} ESCAPE '\\'`);
      params[`q${index}`] = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
    });
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
  if (filters.inStock) {
    where.push('stock > 0');
    where.push("COALESCE(json_extract(p.supplyDetails, '$.availability'), 'in_stock') = 'in_stock'");
  }
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
  const facetView = filters.projection === 'facets';
  const cardView = filters.projection === 'cards';
  const columns = facetView ? 'p.id,p.brand,p.model,p.category,p.location,p.condition,p.specs,p.deviceDetails'
    : cardView ? `p.id,p.title,p.price,p.priceCents,p.category,p.location,p.condition,p.brand,p.model,p.stock,p.seller,p.sellerType,p.delivery,p.warranty,p.negotiable,p.status,p.urgent,p.inspection,p.deviceDetails,p.supplyDetails,p.region,p.currency,p.createdBy,p.createdAt,p.updatedAt,p.moderationStatus,p.moderationReason,p.oldPriceCents,p.specs,'' AS description,
      CASE WHEN json_valid(p.images) THEN json_array(json_extract(p.images,'$[0]')) ELSE json_array(p.images) END AS images`
    : 'p.*';
  const join = `FROM products p LEFT JOIN users u ON u.id = p.createdBy${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
  const total = cardView ? Number((await db.prepare(`SELECT COUNT(*) AS total ${join}`).get(params)).total) : null;
  const sql = facetView ? `SELECT ${columns} ${join} ORDER BY p.createdAt DESC,p.id ASC`
    : `SELECT ${columns}, u.verificationStatus, ${cardView ? "''" : 'u.avatar'} AS sellerAvatar, u.accountStatus AS sellerAccountStatus, u.role AS sellerRole, u.canSellNew AS sellerCanSellNew,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerRating,
    (SELECT COUNT(*) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerReviewCount
    ${join} ORDER BY ${orderBy},p.id ASC${cardView ? ' LIMIT @pageLimit OFFSET @pageOffset' : ''}`;
  const rows = await db.prepare(sql).all(cardView ? { ...params, pageLimit: filters.limit || 12, pageOffset: filters.offset || 0 } : params);
  if (facetView) return rows.map((row) => ({ id: row.id, brand: row.brand, model: row.model, category: row.category, location: row.location, condition: row.condition, specs: parseSpecs(row.specs), deviceDetails: { grade: normalizeDeviceDetails(parseObject(row.deviceDetails)).grade } }));
  const products = rows.map(normalizeProduct);
  return cardView ? { items: products, total, limit: filters.limit || 12, offset: filters.offset || 0 } : products;
}

async function getProduct(id) {
  return normalizeProduct(
    await getDB()
      .prepare(
        `SELECT p.*, u.verificationStatus, u.avatar AS sellerAvatar, u.accountStatus AS sellerAccountStatus, u.role AS sellerRole, u.canSellNew AS sellerCanSellNew,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerRating,
    (SELECT COUNT(*) FROM reviews r WHERE r.sellerId = p.createdBy AND r.hidden = 0) AS sellerReviewCount
    FROM products p LEFT JOIN users u ON u.id = p.createdBy WHERE p.id = ?`
      )
      .get(id)
  );
}

async function getProductOwner(id) {
  const row = await getDB().prepare('SELECT createdBy FROM products WHERE id = ?').get(id);
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
    status: ['active', 'reserved', 'sold', 'draft'].includes(payload.status)
      ? payload.status
      : 'active',
    urgent: Boolean(payload.urgent),
    supplyDetails: payload.supplyDetails || {},
    inspection:
      payload.inspection && typeof payload.inspection === 'object' ? payload.inspection : {},
    deviceDetails:
      payload.deviceDetails && typeof payload.deviceDetails === 'object'
        ? payload.deviceDetails
        : {},
    region,
    currency: currencyForRegion(region),
    createdBy: options.createdBy || null,
    createdAt,
  };

  const inserted = await db
    .prepare(
      `
    INSERT INTO products (
      id, title, description, price, priceCents, images, specs, category, location,
      condition, brand, model, stock, seller, sellerType, delivery, warranty, negotiable, status, urgent, inspection, deviceDetails, supplyDetails, region, currency, createdBy, createdAt
    ) SELECT
      @id, @title, @description, @price, @priceCents, @images, @specs, @category, @location,
      @condition, @brand, @model, @stock, @seller, @sellerType, @delivery, @warranty, @negotiable, @status, @urgent, @inspection, @deviceDetails, @supplyDetails, @region, @currency, @createdBy, @createdAt
    WHERE ${inventoryWriteGuard}
  `
    )
    .run({
      ...product,
      ...inventoryParameters(product),
      images: JSON.stringify(product.images),
      specs: JSON.stringify(product.specs),
      inspection: JSON.stringify(product.inspection),
      deviceDetails: JSON.stringify(product.deviceDetails),
      supplyDetails: JSON.stringify(product.supplyDetails),
      negotiable: product.negotiable ? 1 : 0,
      urgent: product.urgent ? 1 : 0,
    });

  if (!inserted.changes) throw inventoryConflict();

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
  const result = await getDB()
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
      supplyDetails = @supplyDetails,
      oldPriceCents = @oldPriceCents,
      region = @region,
      currency = @currency,
      updatedAt = @updatedAt
    WHERE id = @id AND ${inventoryWriteGuard}
  `
    )
    .run({
      id,
      ...inventoryParameters(merged, existing),
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
      supplyDetails: JSON.stringify(merged.supplyDetails || {}),
      oldPriceCents: priceChanged
        ? Math.round(existing.price * 100)
        : existing.oldPrice
          ? Math.round(existing.oldPrice * 100)
          : null,
      region: merged.region,
      currency: merged.currency,
      updatedAt,
    });

  if (!result.changes && await getProduct(id)) throw inventoryConflict();
  return result.changes ? getProduct(id) : null;
}

async function deleteProduct(id) {
  return (await getDB().prepare('DELETE FROM products WHERE id = ?').run(id)).changes > 0;
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
