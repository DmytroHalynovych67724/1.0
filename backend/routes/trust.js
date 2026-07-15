const express = require('express');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const {
  createReview,
  getReviewEligibility,
  listSellerReviews,
  listUsers,
  setVerification,
} = require('../models/trust');
const { AppError, asyncHandler } = require('../utils/errors');

const router = express.Router();

router.get(
  '/sellers/:id/reviews',
  asyncHandler(async (req, res) => {
    res.json(await listSellerReviews(req.params.id));
  })
);

router.get(
  '/products/:id/review-eligibility',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getReviewEligibility({ productId: req.params.id, buyerId: req.user.id }));
  })
);

router.post(
  '/reviews',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
    const productId = typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (
      !orderId ||
      !productId ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      comment.length > 500
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Valid orderId, productId, rating from 1 to 5 and comment are required'
      );
    }
    res
      .status(201)
      .json(await createReview({ orderId, productId, buyerId: req.user.id, rating, comment }));
  })
);

router.get(
  '/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => res.json(await listUsers()))
);

router.patch(
  '/users/:id/verification',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    if (typeof req.body?.verified !== 'boolean')
      throw new AppError(400, 'VALIDATION_ERROR', 'verified must be a boolean');
    res.json(await setVerification({ userId: req.params.id, verified: req.body.verified }));
  })
);

module.exports = router;
