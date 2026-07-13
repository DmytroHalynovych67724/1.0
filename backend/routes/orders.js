const express = require('express');
const router = express.Router();
const { createOrder, getOrder } = require('../models/orders');
const { requireAuth } = require('../middleware/auth');

// create order (checkout) - expects { items: [{id, qty}], total }
router.post('/', requireAuth, async (req, res) => {
  const { items, total } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items required' });
  // simulate payment and create order
  const order = await createOrder({ userId: req.user.sub, items, total });
  res.status(201).json(order);
});

router.get('/:id', requireAuth, async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  // allow only owner or admin
  if (order.userId !== req.user.sub && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  res.json(order);
});

module.exports = router;
