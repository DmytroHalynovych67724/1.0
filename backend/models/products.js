const { getDB } = require('../db');
const { v4: uuidv4 } = require('uuid');

function normalizeProduct(row) {
  if (!row) return null;
  let images = [];
  if (row.images) {
    try {
      const parsed = JSON.parse(row.images);
      if (Array.isArray(parsed)) {
        images = parsed;
      } else {
        images = [row.images];
      }
    } catch (error) {
      images = [row.images];
    }
  }

  return {
    ...row,
    images,
    category: row.category || 'General',
    location: row.location || 'Unknown'
  };
}

async function listProducts() {
  const db = getDB();
  return db.prepare('SELECT * FROM products ORDER BY createdAt DESC').all().map(normalizeProduct);
}

async function getProduct(id) {
  const db = getDB();
  return normalizeProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
}

async function createProduct(payload) {
  const db = getDB();
  const id = uuidv4();
  const createdAt = Date.now();
  const images = Array.isArray(payload.images) ? JSON.stringify(payload.images) : JSON.stringify([]);
  const category = payload.category || 'General';
  const location = payload.location || 'Unknown';
  db.prepare('INSERT INTO products (id,title,description,price,images,category,location,createdAt) VALUES (?,?,?,?,?,?,?,?)').run(id, payload.title, payload.description || '', payload.price || 0, images, category, location, createdAt);
  return { id, title: payload.title, description: payload.description || '', price: payload.price || 0, images: Array.isArray(payload.images) ? payload.images : [], category, location, createdAt };
}

async function updateProduct(id, payload) {
  const db = getDB();
  const updatedAt = Date.now();
  const images = Array.isArray(payload.images) ? JSON.stringify(payload.images) : JSON.stringify([]);
  const category = payload.category || 'General';
  const location = payload.location || 'Unknown';
  const stmt = db.prepare('UPDATE products SET title = ?, description = ?, price = ?, images = ?, category = ?, location = ?, updatedAt = ? WHERE id = ?');
  const info = stmt.run(payload.title, payload.description || '', payload.price || 0, images, category, location, updatedAt, id);
  if (info.changes === 0) return null;
  return getProduct(id);
}

async function deleteProduct(id) {
  const db = getDB();
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return true;
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
