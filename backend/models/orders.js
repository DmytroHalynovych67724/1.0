const { getDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

async function createOrder({ userId, items, total }) {
  const db = getDB();
  const id = uuidv4();
  const createdAt = Date.now();
  db.prepare('INSERT INTO orders (id,userId,items,total,status,createdAt) VALUES (?,?,?,?,?,?)').run(id, userId || null, JSON.stringify(items || []), total || 0, 'created', createdAt);
  return { id, userId, items, total, status: 'created', createdAt };
}

async function getOrder(id) {
  const db = getDB();
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!row) return null;
  return Object.assign({}, row, { items: JSON.parse(row.items) });
}

module.exports = { createOrder, getOrder };
