const { getDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

async function listProducts() {
  const db = getDB();
  return db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all();
}

async function getProduct(id) {
  const db = getDB();
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id) || null;
}

async function createProduct(payload) {
  const db = getDB();
  const id = uuidv4();
  const createdAt = Date.now();
  db.prepare('INSERT INTO products (id,title,description,price,createdAt) VALUES (?,?,?,?,?)').run(id, payload.title, payload.description || '', payload.price || 0, createdAt);
  return { id, title: payload.title, description: payload.description || '', price: payload.price || 0, createdAt };
}

async function updateProduct(id, payload) {
  const db = getDB();
  const updatedAt = Date.now();
  const stmt = db.prepare('UPDATE products SET title = ?, description = ?, price = ?, updatedAt = ? WHERE id = ?');
  const info = stmt.run(payload.title, payload.description || '', payload.price || 0, updatedAt, id);
  if (info.changes === 0) return null;
  return getProduct(id);
}

async function deleteProduct(id) {
  const db = getDB();
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return true;
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
