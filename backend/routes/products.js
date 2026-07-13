const express = require('express');
const router = express.Router();
const { listProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../models/products');
const { requireAuth } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const list = await listProducts();
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const p = await getProduct(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// Protected create/update/delete for admin
router.post('/', requireAuth, async (req, res) => {
  const product = await createProduct(req.body);
  res.status(201).json(product);
});

router.put('/:id', requireAuth, async (req, res) => {
  const updated = await updateProduct(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await deleteProduct(req.params.id);
  res.status(204).end();
});

module.exports = router;
