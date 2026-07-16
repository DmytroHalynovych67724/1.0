const express = require('express');
const {
  createProduct,
  deleteProduct,
  getProduct,
  getProductOwner,
  listProducts,
  updateProduct,
} = require('../models/products');
const { requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { CONDITIONS, REGIONS, validateProduct } = require('../utils/validation');

const router = express.Router();

function optionalQueryString(query, field, maxLength) {
  if (query[field] === undefined || query[field] === '') return undefined;
  if (typeof query[field] !== 'string' || query[field].trim().length > maxLength) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field, message: `${field} must be a string no longer than ${maxLength} characters` },
    ]);
  }
  return query[field].trim();
}

function optionalPrice(query, field) {
  if (query[field] === undefined || query[field] === '') return undefined;
  const value = Number(query[field]);
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field, message: `${field} must be a valid non-negative price` },
    ]);
  }
  return value;
}

function productFilters(query) {
  const condition = optionalQueryString(query, 'condition', 10);
  const sort = optionalQueryString(query, 'sort', 20) || 'newest';
  const minPrice = optionalPrice(query, 'minPrice');
  const maxPrice = optionalPrice(query, 'maxPrice');
  const region = optionalQueryString(query, 'region', 2)?.toLowerCase();
  const grade = optionalQueryString(query, 'grade', 2)?.toUpperCase();

  if (condition && !CONDITIONS.has(condition)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'condition', message: 'condition must be new or used' },
    ]);
  }
  if (region && !REGIONS.has(region)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'region', message: 'region must be pl, ua or eu' },
    ]);
  }
  if (grade && !['N', 'A', 'B', 'C', 'D'].includes(grade)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'grade', message: 'grade must be N, A, B, C or D' },
    ]);
  }
  if (
    ![
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'rating_desc',
      'stock_desc',
      'title_asc',
    ].includes(sort)
  ) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'sort', message: 'Unsupported sort value' },
    ]);
  }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'minPrice', message: 'minPrice must not exceed maxPrice' },
    ]);
  }
  if (query.inStock !== undefined && !['true', 'false', '1', '0'].includes(query.inStock)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'inStock', message: 'inStock must be true, false, 1 or 0' },
    ]);
  }

  const specKeys = [
    'screen',
    'processor',
    'ram',
    'storage',
    'gpu',
    'os',
    'platform',
    'resolution',
    'refreshRate',
    'connectivity',
    'accessoryType',
    'audioType',
    'color',
    'displayType',
    'battery',
    'charging',
    'mainCamera',
    'frontCamera',
    'cameraFeatures',
    'features',
    'sim',
    'wifi',
    'bluetooth',
    'displayFeatures',
    'ramType',
    'weight',
  ];
  const specs = {};
  for (const key of specKeys) {
    const value = optionalQueryString(query, key, 80);
    if (value) specs[key] = value;
  }

  return {
    q: optionalQueryString(query, 'q', 100) || optionalQueryString(query, 'search', 100),
    category: optionalQueryString(query, 'category', 60),
    condition,
    grade,
    brand: optionalQueryString(query, 'brand', 60),
    model: optionalQueryString(query, 'model', 100),
    location: optionalQueryString(query, 'location', 80),
    sellerType: optionalQueryString(query, 'sellerType', 12),
    delivery: optionalQueryString(query, 'delivery', 12),
    warranty: optionalQueryString(query, 'warranty', 20),
    negotiable: query.negotiable === 'true' || query.negotiable === '1',
    urgent: query.urgent === 'true' || query.urgent === '1',
    verified: query.verified === 'true' || query.verified === '1',
    region,
    minPrice,
    maxPrice,
    inStock: query.inStock === 'true' || query.inStock === '1',
    sort,
    specs,
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const products = await listProducts(productFilters(req.query));
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=300');
    res.json(products);
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = productFilters(req.query);
    if (req.user.role !== 'admin') filters.ownerId = req.user.id;
    filters.includeInactive = true;
    const products = await listProducts(filters);
    res.json(products);
  })
);

router.get(
  '/:id/related',
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const candidates = await listProducts({ region: product.region, category: product.category });
    res.json(
      candidates
        .filter((item) => item.id !== product.id)
        .sort((a, b) => {
          const aScore =
            (a.brand === product.brand ? 3 : 0) +
            (a.model === product.model ? 4 : 0) -
            Math.abs(a.price - product.price) / Math.max(product.price, 1);
          const bScore =
            (b.brand === product.brand ? 3 : 0) +
            (b.model === product.model ? 4 : 0) -
            Math.abs(b.price - product.price) / Math.max(product.price, 1);
          return bScore - aScore;
        })
        .slice(0, 8)
    );
  })
);

router.get(
  '/:id/price-history',
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const db = require('../db').getDB();
    const history = (
      await db
        .prepare(
          'SELECT priceCents, createdAt FROM price_history WHERE productId = ? ORDER BY createdAt ASC'
        )
        .all(product.id)
    ).map((item) => ({ price: item.priceCents / 100, createdAt: item.createdAt }));
    const market = await db
      .prepare(
        "SELECT priceCents FROM products WHERE region = ? AND category = ? AND brand = ? AND model = ? AND status = 'active' ORDER BY priceCents"
      )
      .all(product.region, product.category, product.brand, product.model);
    const median = market.length
      ? market[Math.floor(market.length / 2)].priceCents / 100
      : product.price;
    res.json({
      history,
      median,
      verdict:
        product.price <= median * 0.9 ? 'great' : product.price <= median * 1.1 ? 'fair' : 'high',
    });
  })
);

router.get(
  '/model',
  asyncHandler(async (req, res) => {
    const brand = optionalQueryString(req.query, 'brand', 60);
    const model = optionalQueryString(req.query, 'model', 100);
    const region = optionalQueryString(req.query, 'region', 2)?.toLowerCase();
    if (!brand || !model || !region || !REGIONS.has(region)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'brand, model and region are required');
    }
    const offers = await listProducts({ brand, model, region, sort: 'price_asc' });
    if (!offers.length) throw new AppError(404, 'MODEL_NOT_FOUND', 'Model not found');
    const representative = offers[0];
    const accessories = (await listProducts({ region, category: 'Akcesoria' })).slice(0, 6);
    const db = require('../db').getDB();
    const reviews = await db
      .prepare(
        `SELECT r.*, u.username, u.avatar FROM model_reviews r
      JOIN users u ON u.id = r.userId JOIN products p ON p.id = r.productId
      WHERE p.region = ? AND r.brand = ? COLLATE NOCASE AND r.model = ? COLLATE NOCASE ORDER BY r.createdAt DESC`
      )
      .all(region, brand, model);
    const priceValues = offers.map((item) => item.price).sort((a, b) => a - b);
    res.json({
      brand,
      model,
      region,
      category: representative.category,
      description: representative.description,
      image: representative.images[0] || '',
      specs: representative.specs,
      offers,
      reviews,
      accessories,
      variants: {
        colors: [...new Set(offers.map((item) => item.specs?.color).filter(Boolean))],
        storage: [...new Set(offers.map((item) => item.specs?.storage).filter(Boolean))],
      },
      price: { min: priceValues[0], max: priceValues.at(-1), currency: representative.currency },
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.id);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    res.json(product);
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = validateProduct(req.body);
    if (req.user.role !== 'admin') {
      payload.seller = req.user.username;
      payload.sellerType = 'private';
    }
    const product = await createProduct(payload, { createdBy: req.user.id });
    res.status(201).json(product);
  })
);

const requireProductManager = asyncHandler(async (req, _res, next) => {
  const ownerId = await getProductOwner(req.params.id);
  if (ownerId === undefined) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  if (req.user.role !== 'admin' && ownerId !== req.user.id) {
    throw new AppError(403, 'PRODUCT_ACCESS_DENIED', 'You cannot manage this product');
  }
  next();
});

async function handleUpdate(req, res) {
  const payload = validateProduct(req.body, { partial: true });
  if (req.user.role !== 'admin') {
    payload.seller = req.user.username;
    payload.sellerType = 'private';
  }
  const updated = await updateProduct(req.params.id, payload);
  if (!updated) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  res.json(updated);
}

router.put('/:id', requireAuth, requireProductManager, asyncHandler(handleUpdate));
router.patch('/:id', requireAuth, requireProductManager, asyncHandler(handleUpdate));

router.delete(
  '/:id',
  requireAuth,
  requireProductManager,
  asyncHandler(async (req, res) => {
    const removed = await deleteProduct(req.params.id);
    if (!removed) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    res.status(204).end();
  })
);

module.exports = router;
