const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { listProducts, getProduct } = require('../models/products');
const { AppError, asyncHandler } = require('../utils/errors');
const { currencyForRegion, normalizeRegion } = require('../utils/regions');
const { searchCatalogWithAssistant } = require('../services/catalogAssistant');

const router = express.Router();
const clean = (value, max = 120) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const parse = (value) => {
  try {
    return JSON.parse(value || '{}');
  } catch (_error) {
    return {};
  }
};

router.get(
  '/assistant',
  asyncHandler(async (req, res) => {
    const query = clean(req.query?.q, 180);
    const language = ['pl', 'uk', 'en'].includes(req.query?.language) ? req.query.language : 'pl';
    const region = normalizeRegion(req.query?.region);
    if (query.length < 2)
      throw new AppError(400, 'VALIDATION_ERROR', 'Search request is too short');
    res.json(await searchCatalogWithAssistant(query, { region, language }));
  })
);

router.post(
  '/newsletter',
  asyncHandler(async (req, res) => {
    const email = clean(req.body?.email, 160).toLowerCase();
    const language = ['pl', 'uk', 'en'].includes(req.body?.language) ? req.body.language : 'pl';
    const region = normalizeRegion(req.body?.region);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Enter a valid email address');
    }
    const now = Date.now();
    await getDB()
      .prepare(
        `INSERT INTO newsletter_subscribers (email, language, region, active, createdAt, updatedAt)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(email) DO UPDATE SET language = excluded.language, region = excluded.region,
      active = 1, updatedAt = excluded.updatedAt`
      )
      .run(email, language, region, now, now);
    res.status(201).json({ email, subscribed: true });
  })
);

router.get(
  '/searches',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await getDB()
      .prepare('SELECT * FROM saved_searches WHERE userId = ? ORDER BY createdAt DESC')
      .all(req.user.id);
    const result = await Promise.all(
      rows.map(async (row) => {
        const query = parse(row.query);
        const matches = await listProducts({ ...query, region: row.region });
        return { ...row, query, matches: matches.length, preview: matches.slice(0, 3) };
      })
    );
    res.json(result);
  })
);

router.post(
  '/searches',
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = clean(req.body?.name, 80);
    const region = normalizeRegion(req.body?.region);
    const query = req.body?.query && typeof req.body.query === 'object' ? req.body.query : {};
    if (!name) throw new AppError(400, 'VALIDATION_ERROR', 'Search name is required');
    const allowed = [
      'q',
      'category',
      'condition',
      'brand',
      'model',
      'location',
      'sellerType',
      'delivery',
      'warranty',
      'negotiable',
      'urgent',
      'verified',
      'minPrice',
      'maxPrice',
    ];
    const safeQuery = Object.fromEntries(
      Object.entries(query).filter(
        ([key, value]) => allowed.includes(key) && String(value).length <= 120
      )
    );
    const item = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      region,
      query: JSON.stringify(safeQuery),
      createdAt: Date.now(),
    };
    await getDB()
      .prepare(
        'INSERT INTO saved_searches (id, userId, name, region, query, createdAt) VALUES (@id, @userId, @name, @region, @query, @createdAt)'
      )
      .run(item);
    res.status(201).json({ ...item, query: safeQuery });
  })
);

router.delete(
  '/searches/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await getDB()
      .prepare('DELETE FROM saved_searches WHERE id = ? AND userId = ?')
      .run(req.params.id, req.user.id);
    if (!result.changes) throw new AppError(404, 'SEARCH_NOT_FOUND', 'Saved search not found');
    res.status(204).end();
  })
);

router.get(
  '/alerts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await getDB()
      .prepare(
        `SELECT a.*, p.title, p.priceCents, p.oldPriceCents, p.currency, p.images, p.status
    FROM product_alerts a JOIN products p ON p.id = a.productId WHERE a.userId = ? ORDER BY a.createdAt DESC`
      )
      .all(req.user.id);
    res.json(
      rows.map((row) => ({
        ...row,
        price: row.priceCents / 100,
        oldPrice: row.oldPriceCents ? row.oldPriceCents / 100 : null,
        targetPrice: row.targetPriceCents ? row.targetPriceCents / 100 : null,
        images: parse(row.images),
      }))
    );
  })
);

router.post(
  '/alerts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = clean(req.body?.productId, 100);
    const product = await getProduct(productId);
    if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    const target = Number(req.body?.targetPrice);
    await getDB()
      .prepare(
        `INSERT INTO product_alerts (id, userId, productId, targetPriceCents, createdAt) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(userId, productId) DO UPDATE SET targetPriceCents = excluded.targetPriceCents`
      )
      .run(
        uuidv4(),
        req.user.id,
        productId,
        Number.isFinite(target) && target > 0 ? Math.round(target * 100) : null,
        Date.now()
      );
    res.status(201).json({ ok: true });
  })
);

router.delete(
  '/alerts/:productId',
  requireAuth,
  asyncHandler(async (req, res) => {
    await getDB()
      .prepare('DELETE FROM product_alerts WHERE userId = ? AND productId = ?')
      .run(req.user.id, req.params.productId);
    res.status(204).end();
  })
);

router.post(
  '/reports',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = clean(req.body?.productId, 100);
    const reason = clean(req.body?.reason, 80);
    const details = clean(req.body?.details, 800);
    if (!productId || !reason || !(await getProduct(productId)))
      throw new AppError(400, 'VALIDATION_ERROR', 'Product and reason are required');
    const item = {
      id: uuidv4(),
      userId: req.user.id,
      productId,
      reason,
      details,
      status: 'new',
      createdAt: Date.now(),
    };
    await getDB()
      .prepare(
        'INSERT INTO listing_reports (id, userId, productId, reason, details, status, createdAt) VALUES (@id, @userId, @productId, @reason, @details, @status, @createdAt)'
      )
      .run(item);
    res.status(201).json(item);
  })
);

router.get(
  '/reports',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json(
      await getDB()
        .prepare(
          `SELECT r.*, p.title, u.username FROM listing_reports r JOIN products p ON p.id = r.productId JOIN users u ON u.id = r.userId ORDER BY r.createdAt DESC`
        )
        .all()
    );
  })
);

router.patch(
  '/reports/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = clean(req.body?.status, 20);
    if (!['new', 'reviewing', 'resolved', 'rejected'].includes(status))
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid report status');
    await getDB()
      .prepare('UPDATE listing_reports SET status = ?, updatedAt = ? WHERE id = ?')
      .run(status, Date.now(), req.params.id);
    res.json({ id: req.params.id, status });
  })
);

router.post(
  '/trade-in',
  requireAuth,
  asyncHandler(async (req, res) => {
    const category = clean(req.body?.category, 60);
    const brand = clean(req.body?.brand, 60);
    const model = clean(req.body?.model, 100);
    const condition = clean(req.body?.condition, 20);
    const region = normalizeRegion(req.body?.region);
    const answers =
      req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    if (
      !category ||
      !brand ||
      !model ||
      !['excellent', 'good', 'fair', 'damaged'].includes(condition)
    )
      throw new AppError(400, 'VALIDATION_ERROR', 'Complete device data is required');
    const regionalBase = { pl: 90000, ua: 800000, eu: 21000 }[region];
    const multiplier = { excellent: 1, good: 0.78, fair: 0.55, damaged: 0.28 }[condition];
    const checks = Object.values(answers).filter(Boolean).length;
    const estimatedCents = Math.round(
      regionalBase * multiplier * (0.82 + Math.min(checks, 6) * 0.03)
    );
    const item = {
      id: uuidv4(),
      userId: req.user.id,
      category,
      brand,
      model,
      condition,
      answers: JSON.stringify(answers),
      estimatedCents,
      region,
      currency: currencyForRegion(region),
      status: 'estimated',
      createdAt: Date.now(),
    };
    await getDB()
      .prepare(
        `INSERT INTO trade_in_requests (id, userId, category, brand, model, condition, answers, estimatedCents, region, currency, status, createdAt)
    VALUES (@id, @userId, @category, @brand, @model, @condition, @answers, @estimatedCents, @region, @currency, @status, @createdAt)`
      )
      .run(item);
    res.status(201).json({ ...item, answers, estimate: estimatedCents / 100 });
  })
);

router.get(
  '/trade-in',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await getDB()
      .prepare('SELECT * FROM trade_in_requests WHERE userId = ? ORDER BY createdAt DESC')
      .all(req.user.id);
    res.json(
      rows.map((row) => ({
        ...row,
        answers: parse(row.answers),
        estimate: row.estimatedCents / 100,
      }))
    );
  })
);

router.get(
  '/products/:id/reviews',
  asyncHandler(async (req, res) => {
    const rows = await getDB()
      .prepare(
        `SELECT r.*, u.username, u.avatar FROM model_reviews r JOIN users u ON u.id = r.userId WHERE r.productId = ? ORDER BY r.createdAt DESC`
      )
      .all(req.params.id);
    res.json(rows);
  })
);

router.post(
  '/products/:id/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.id);
    const rating = Number(req.body?.rating);
    const comment = clean(req.body?.comment, 800);
    if (!product || !Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new AppError(400, 'VALIDATION_ERROR', 'Rating from 1 to 5 is required');
    const item = {
      id: uuidv4(),
      userId: req.user.id,
      productId: product.id,
      category: product.category,
      brand: product.brand,
      model: product.model,
      rating,
      comment,
      createdAt: Date.now(),
    };
    await getDB()
      .prepare(
        `INSERT INTO model_reviews (id, userId, productId, category, brand, model, rating, comment, createdAt)
    VALUES (@id, @userId, @productId, @category, @brand, @model, @rating, @comment, @createdAt)
    ON CONFLICT(userId, productId) DO UPDATE SET rating = excluded.rating, comment = excluded.comment, createdAt = excluded.createdAt`
      )
      .run(item);
    res.status(201).json(item);
  })
);

router.get(
  '/questions',
  asyncHandler(async (req, res) => {
    const brand = clean(req.query?.brand, 60);
    const model = clean(req.query?.model, 100);
    const region = normalizeRegion(req.query?.region);
    if (!brand || !model)
      throw new AppError(400, 'VALIDATION_ERROR', 'brand and model are required');
    const rows = await getDB()
      .prepare(
        `SELECT q.*, u.username, a.username AS answeredByName
    FROM product_questions q JOIN products p ON p.id = q.productId
    JOIN users u ON u.id = q.userId LEFT JOIN users a ON a.id = q.answeredBy
    WHERE p.region = ? AND p.brand = ? COLLATE NOCASE AND p.model = ? COLLATE NOCASE
    ORDER BY q.createdAt DESC`
      )
      .all(region, brand, model);
    res.json(rows);
  })
);

router.post(
  '/questions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = clean(req.body?.productId, 100);
    const question = clean(req.body?.question, 600);
    if (!productId || question.length < 5 || !(await getProduct(productId)))
      throw new AppError(400, 'VALIDATION_ERROR', 'Product and question are required');
    const item = { id: uuidv4(), productId, userId: req.user.id, question, createdAt: Date.now() };
    await getDB()
      .prepare(
        'INSERT INTO product_questions (id, productId, userId, question, createdAt) VALUES (@id, @productId, @userId, @question, @createdAt)'
      )
      .run(item);
    res.status(201).json({ ...item, username: req.user.username, answer: null });
  })
);

router.patch(
  '/questions/:id/answer',
  requireAuth,
  asyncHandler(async (req, res) => {
    const answer = clean(req.body?.answer, 800);
    const row = await getDB()
      .prepare(
        `SELECT q.*, p.createdBy, p.brand, p.model, p.region FROM product_questions q JOIN products p ON p.id = q.productId WHERE q.id = ?`
      )
      .get(req.params.id);
    if (!row) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Question not found');
    if (req.user.role !== 'admin') {
      const ownsOffer = await getDB()
        .prepare(
          'SELECT 1 FROM products WHERE createdBy = ? AND brand = ? COLLATE NOCASE AND model = ? COLLATE NOCASE AND region = ? LIMIT 1'
        )
        .get(req.user.id, row.brand, row.model, row.region);
      if (!ownsOffer)
        throw new AppError(403, 'QUESTION_ACCESS_DENIED', 'Only a seller can answer this question');
    }
    if (answer.length < 2) throw new AppError(400, 'VALIDATION_ERROR', 'Answer is required');
    await getDB()
      .prepare(
        'UPDATE product_questions SET answer = ?, answeredBy = ?, answeredAt = ? WHERE id = ?'
      )
      .run(answer, req.user.id, Date.now(), req.params.id);
    res.json({ id: req.params.id, answer, answeredByName: req.user.username });
  })
);

module.exports = router;
