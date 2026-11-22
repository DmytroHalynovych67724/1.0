const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { requireAuth, requireModerator, requireAdmin } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { listProducts } = require('../models/products');

const router = express.Router();
router.use(requireAuth, requireModerator);
async function audit(db, actorId, action, targetId, reason = '') {
  await db.prepare('INSERT INTO moderation_log (id, actorId, action, targetId, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), actorId, action, targetId, reason, Date.now());
}

router.get('/products', asyncHandler(async (_req, res) => {
  res.json(await listProducts({ includeInactive: true, includeModerated: true }));
}));

router.patch('/products/:id/moderation', asyncHandler(async (req, res) => {
  const status = req.body?.status;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!['approved', 'hidden'].includes(status) || reason.length > 500 || (status === 'hidden' && reason.length < 5)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A reason of 5 to 500 characters is required to hide a listing');
  }
  // Demo goods stay in storage; changing moderation never publishes them.
  const db = getDB();
  await db.transaction(async () => {
    const result = await db.prepare('UPDATE products SET moderationStatus = ?, moderationReason = ?, updatedAt = ? WHERE id = ?')
      .run(status, reason, Date.now(), req.params.id);
    if (!result.changes) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    await audit(db, req.user.id, 'listing.' + status, req.params.id, reason);
  })();
  res.json({ id: req.params.id, moderationStatus: status, moderationReason: reason });
}));

router.get('/users', requireAdmin, asyncHandler(async (_req, res) => {
  res.json(await getDB().prepare('SELECT id, username, displayName, role, accountStatus, verificationStatus, createdAt FROM users ORDER BY createdAt DESC LIMIT 500').all());
}));

router.patch('/users/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { role, accountStatus } = req.body || {};
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if ((role !== undefined && !['user', 'moderator'].includes(role)) ||
      (accountStatus !== undefined && !['active', 'suspended'].includes(accountStatus)) ||
      (role === undefined && accountStatus === undefined) || reason.length < 5 || reason.length > 500) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Choose a valid role or status and provide a reason');
  }
  if (req.params.id === req.user.id) throw new AppError(403, 'SELF_CHANGE_DENIED', 'You cannot change your own access');
  const db = getDB();
  await db.transaction(async () => {
    const target = await db.prepare('SELECT role, accountStatus FROM users WHERE id = ?').get(req.params.id);
    if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    if (target.role === 'admin') throw new AppError(403, 'ADMIN_PROTECTED', 'Administrator access is managed by server configuration');
    await db.prepare('UPDATE users SET role = ?, accountStatus = ?, sessionVersion = sessionVersion + 1, updatedAt = ? WHERE id = ?')
      .run(role || target.role, accountStatus || target.accountStatus, Date.now(), req.params.id);
    await audit(db, req.user.id, 'account.' + (role || accountStatus), req.params.id, reason);
  })();
  res.json({ ok: true });
}));

router.get('/log', asyncHandler(async (_req, res) => {
  res.json(await getDB().prepare('SELECT l.*, u.username AS actorName FROM moderation_log l LEFT JOIN users u ON u.id = l.actorId ORDER BY l.createdAt DESC LIMIT 200').all());
}));

module.exports = router;
