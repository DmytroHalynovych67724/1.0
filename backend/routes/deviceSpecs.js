const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { findDeviceSpecs } = require('../services/deviceSpecs');
const { icecatStatus } = require('../services/icecat');
const rateLimit = require('express-rate-limit');
const { findAiDeviceSpecs } = require('../services/aiDeviceSpecs');
const { AppError, asyncHandler } = require('../utils/errors');

const { normalizeProductCode, validProductCode } = require('../services/deviceProductCode');
function requestedCode(value) {
  if (value == null || value === '') return '';
  if (!validProductCode(value)) throw new AppError(400, 'VALIDATION_ERROR', 'Use a model product code of 3 to 50 letters, digits or . _ / # -');
  return normalizeProductCode(value);
}
const router = express.Router();

const aiLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, keyGenerator: req => req.user.id,
  handler: (_req, res) => res.status(429).json({ code: 'AI_SPEC_RATE_LIMIT', error: 'Please wait before requesting more AI lookups' }) });
router.post('/ai', requireAuth, aiLimiter, asyncHandler(async (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : '';
  if (query.length < 3 || query.length > 100 || category.length > 60) throw new AppError(400, 'VALIDATION_ERROR', 'Enter a device name between 3 and 100 characters');
  res.json(await findAiDeviceSpecs(query, { ...req.app.locals.deviceSpecOptions, category, productCode: requestedCode(req.body?.productCode) }));
}));

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 3 || query.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Enter at least three characters of a model name');
    }
    const category = typeof req.query.category === 'string' ? req.query.category.trim().slice(0, 60) : '';
    res.json({ results: await findDeviceSpecs(query, { ...req.app.locals.deviceSpecOptions, category, productCode: requestedCode(req.query.productCode) }), provider: { icecat: icecatStatus() } });
  })
);

module.exports = router;
