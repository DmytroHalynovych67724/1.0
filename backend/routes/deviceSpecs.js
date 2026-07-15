const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { findDeviceSpecs } = require('../services/deviceSpecs');
const { icecatStatus } = require('../services/icecat');
const { AppError, asyncHandler } = require('../utils/errors');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (query.length < 3 || query.length > 100) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Enter at least three characters of a model name');
    }
    res.json({ results: await findDeviceSpecs(query), provider: { icecat: icecatStatus() } });
  })
);

module.exports = router;
