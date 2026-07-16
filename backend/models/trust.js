const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { AppError } = require('../utils/errors');

async function createReview({ orderId, productId, buyerId, rating, comment }) {
  const db = getDB();
  const order = await db
    .prepare('SELECT * FROM orders WHERE id = ? AND userId = ?')
    .get(orderId, buyerId);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  if (order.status !== 'completed') {
    throw new AppError(
      409,
      'ORDER_NOT_COMPLETED',
      'A review can be added only after a completed order'
    );
  }
  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch (_error) {
    items = [];
  }
  const item = items.find((entry) => entry.productId === productId || entry.id === productId);
  if (!item) throw new AppError(400, 'PRODUCT_NOT_IN_ORDER', 'Product is not part of this order');
  const sellerId =
    item.sellerId ||
    (await db.prepare('SELECT createdBy FROM products WHERE id = ?').get(productId))?.createdBy;
  if (!sellerId) throw new AppError(409, 'SELLER_UNAVAILABLE', 'Seller cannot be reviewed');
  const id = uuidv4();
  try {
    await db
      .prepare(
        `
      INSERT INTO reviews (id, orderId, productId, buyerId, sellerId, rating, comment, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(id, orderId, productId, buyerId, sellerId, rating, comment, Date.now());
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique/i.test(error.message || '')) {
      throw new AppError(409, 'REVIEW_ALREADY_EXISTS', 'This purchase has already been reviewed');
    }
    throw error;
  }
  return db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
}

async function listSellerReviews(sellerId) {
  const db = getDB();
  const reviews = await db
    .prepare(
      `
    SELECT r.id, r.productId, r.rating, r.comment, r.createdAt, u.username AS buyerName
    FROM reviews r JOIN users u ON u.id = r.buyerId
    WHERE r.sellerId = ? AND r.hidden = 0 ORDER BY r.createdAt DESC LIMIT 100
  `
    )
    .all(sellerId);
  const summary = await db
    .prepare(
      'SELECT ROUND(AVG(rating), 1) AS rating, COUNT(*) AS count FROM reviews WHERE sellerId = ? AND hidden = 0'
    )
    .get(sellerId);
  return { rating: summary.rating, count: summary.count, reviews };
}

async function getReviewEligibility({ productId, buyerId }) {
  const db = getDB();
  const product = await db
    .prepare('SELECT id, createdBy FROM products WHERE id = ?')
    .get(productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
  if (product.createdBy === buyerId) {
    return { eligible: false, reason: 'own_listing' };
  }

  const orders = await db
    .prepare(
      `SELECT id, items FROM orders
       WHERE userId = ? AND status = 'completed'
       ORDER BY updatedAt DESC, createdAt DESC`
    )
    .all(buyerId);
  const matchingOrder = orders.find((order) => {
    try {
      const items = JSON.parse(order.items || '[]');
      return (
        Array.isArray(items) &&
        items.some((item) => item.id === productId || item.productId === productId)
      );
    } catch (_error) {
      return false;
    }
  });
  if (!matchingOrder) return { eligible: false, reason: 'completed_purchase_required' };

  const existing = await db
    .prepare('SELECT id FROM reviews WHERE orderId = ? AND productId = ? AND buyerId = ?')
    .get(matchingOrder.id, productId, buyerId);
  if (existing) return { eligible: false, reason: 'already_reviewed' };
  return { eligible: true, orderId: matchingOrder.id };
}

async function listUsers() {
  return getDB()
    .prepare(
      `
    SELECT id, username, role, verificationStatus, verifiedAt, createdAt
    FROM users ORDER BY createdAt DESC LIMIT 200
  `
    )
    .all();
}

async function setVerification({ userId, verified }) {
  const db = getDB();
  const now = Date.now();
  const result = await db
    .prepare('UPDATE users SET verificationStatus = ?, verifiedAt = ?, updatedAt = ? WHERE id = ?')
    .run(verified ? 'verified' : 'unverified', verified ? now : null, now, userId);
  if (!result.changes) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  return db
    .prepare(
      'SELECT id, username, role, verificationStatus, verifiedAt, createdAt FROM users WHERE id = ?'
    )
    .get(userId);
}

module.exports = {
  createReview,
  getReviewEligibility,
  listSellerReviews,
  listUsers,
  setVerification,
};
