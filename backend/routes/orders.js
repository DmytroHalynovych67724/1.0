const express = require('express');
const { createOrder, getOrder, listOrders, updateOrderStatus } = require('../models/orders');
const { requireAdmin, requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateOrder, validatePagination } = require('../utils/validation');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagination = validatePagination(req.query);
    const orders = await listOrders({
      userId: req.user.id,
      includeAll: req.user.role === 'admin',
      ...pagination,
    });
    res.json(orders);
  })
);

router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    res.json(await updateOrderStatus({ orderId: req.params.id, status, changedBy: req.user.id }));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { items, checkout, promoCode } = validateOrder(req.body);
    const order = await createOrder({ userId: req.user.id, items, checkout, promoCode });
    res.status(201).json(order);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.id);
    if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      throw new AppError(403, 'ORDER_ACCESS_DENIED', 'You cannot access this order');
    }
    res.json(order);
  })
);

module.exports = router;
