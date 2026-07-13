const path = require('path');
const Database = require('better-sqlite3');

const file = path.join(__dirname, '..', 'data', 'db.sqlite');
let db;

function initDB() {
  const dir = path.dirname(file);
  require('fs').mkdirSync(dir, { recursive: true });
  db = new Database(file);

  // products table
  db.prepare(
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price REAL DEFAULT 0,
      images TEXT,
      category TEXT,
      location TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    )`
  ).run();

  const productColumns = new Set(db.prepare('PRAGMA table_info(products)').all().map((column) => column.name));
  if (!productColumns.has('images')) db.prepare('ALTER TABLE products ADD COLUMN images TEXT').run();
  if (!productColumns.has('category')) db.prepare('ALTER TABLE products ADD COLUMN category TEXT').run();
  if (!productColumns.has('location')) db.prepare('ALTER TABLE products ADD COLUMN location TEXT').run();

  // users table
  db.prepare(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT
    )`
  ).run();

  // orders table
  db.prepare(
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      items TEXT,
      total REAL,
      status TEXT,
      createdAt INTEGER
    )`
  ).run();
}

function getDB() {
  if (!db) initDB();
  return db;
}

module.exports = { initDB, getDB };
