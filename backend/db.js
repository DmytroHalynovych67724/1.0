const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const defaultFile = path.join(__dirname, '..', 'data', 'db.sqlite');

let db;
let activeFile;

function getConfiguredFile() {
  const configured = process.env.DB_PATH || process.env.DATABASE_PATH || process.env.DB_FILE;
  if (!configured || !configured.trim()) return defaultFile;
  if (configured.trim() === ':memory:') return ':memory:';
  return path.resolve(configured.trim());
}

function addColumnIfMissing(database, table, column, definition) {
  const columns = new Set(
    database
      .prepare(`PRAGMA table_info(${table})`)
      .all()
      .map((item) => item.name)
  );
  if (!columns.has(column)) {
    database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

function migrateProducts(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0,
      priceCents INTEGER,
      images TEXT NOT NULL DEFAULT '[]',
      specs TEXT NOT NULL DEFAULT '{}',
      category TEXT NOT NULL DEFAULT 'Elektronika',
      location TEXT NOT NULL DEFAULT 'Unknown',
      condition TEXT NOT NULL DEFAULT 'used',
      brand TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 1,
      seller TEXT NOT NULL DEFAULT 'NaShary Store',
      sellerType TEXT NOT NULL DEFAULT 'store',
      delivery TEXT NOT NULL DEFAULT 'both',
      region TEXT NOT NULL DEFAULT 'pl',
      currency TEXT NOT NULL DEFAULT 'PLN',
      createdBy TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER
    )
  `);

  addColumnIfMissing(database, 'products', 'description', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(database, 'products', 'price', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'products', 'priceCents', 'INTEGER');
  addColumnIfMissing(database, 'products', 'images', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(database, 'products', 'specs', "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(database, 'products', 'category', "TEXT NOT NULL DEFAULT 'Elektronika'");
  addColumnIfMissing(database, 'products', 'location', "TEXT NOT NULL DEFAULT 'Unknown'");
  addColumnIfMissing(database, 'products', 'condition', "TEXT NOT NULL DEFAULT 'used'");
  addColumnIfMissing(database, 'products', 'brand', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(database, 'products', 'stock', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing(database, 'products', 'seller', "TEXT NOT NULL DEFAULT 'NaShary Store'");
  addColumnIfMissing(database, 'products', 'sellerType', "TEXT NOT NULL DEFAULT 'store'");
  addColumnIfMissing(database, 'products', 'delivery', "TEXT NOT NULL DEFAULT 'both'");
  addColumnIfMissing(database, 'products', 'region', "TEXT NOT NULL DEFAULT 'pl'");
  addColumnIfMissing(database, 'products', 'currency', "TEXT NOT NULL DEFAULT 'PLN'");
  addColumnIfMissing(database, 'products', 'createdBy', 'TEXT');
  addColumnIfMissing(database, 'products', 'createdAt', 'INTEGER');
  addColumnIfMissing(database, 'products', 'updatedAt', 'INTEGER');
  addColumnIfMissing(database, 'products', 'model', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(database, 'products', 'warranty', "TEXT NOT NULL DEFAULT 'none'");
  addColumnIfMissing(database, 'products', 'negotiable', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing(database, 'products', 'status', "TEXT NOT NULL DEFAULT 'active'");
  addColumnIfMissing(database, 'products', 'urgent', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'products', 'inspection', "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(database, 'products', 'oldPriceCents', 'INTEGER');
  addColumnIfMissing(database, 'products', 'deviceDetails', "TEXT NOT NULL DEFAULT '{}'");

  const now = Date.now();
  database.prepare("UPDATE products SET description = '' WHERE description IS NULL").run();
  database.prepare("UPDATE products SET images = '[]' WHERE images IS NULL OR images = ''").run();
  database.prepare("UPDATE products SET specs = '{}' WHERE specs IS NULL OR specs = ''").run();
  database
    .prepare(
      "UPDATE products SET category = 'Elektronika' WHERE category IS NULL OR TRIM(category) = ''"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET location = 'Unknown' WHERE location IS NULL OR TRIM(location) = ''"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET condition = 'used' WHERE condition IS NULL OR condition NOT IN ('new', 'used')"
    )
    .run();
  database.prepare("UPDATE products SET brand = '' WHERE brand IS NULL").run();
  database.prepare('UPDATE products SET stock = 1 WHERE stock IS NULL OR stock < 0').run();
  database
    .prepare(
      "UPDATE products SET seller = 'NaShary Store' WHERE seller IS NULL OR TRIM(seller) = ''"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET sellerType = 'store' WHERE sellerType IS NULL OR sellerType NOT IN ('store', 'private')"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET delivery = 'both' WHERE delivery IS NULL OR delivery NOT IN ('shipping', 'pickup', 'both')"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET region = 'pl' WHERE region IS NULL OR region NOT IN ('pl', 'ua', 'eu')"
    )
    .run();
  database
    .prepare(
      "UPDATE products SET currency = CASE region WHEN 'ua' THEN 'UAH' WHEN 'eu' THEN 'EUR' ELSE 'PLN' END"
    )
    .run();
  database.prepare('UPDATE products SET price = 0 WHERE price IS NULL OR price < 0').run();
  database
    .prepare(
      'UPDATE products SET priceCents = CAST(ROUND(price * 100) AS INTEGER) WHERE priceCents IS NULL OR priceCents < 0'
    )
    .run();
  database.prepare('UPDATE products SET createdAt = ? WHERE createdAt IS NULL').run(now);
  database.prepare("UPDATE products SET model = TRIM(REPLACE(title, brand, '')) WHERE model IS NULL OR TRIM(model) = ''").run();
  database.prepare("UPDATE products SET warranty = 'none' WHERE warranty IS NULL OR warranty NOT IN ('none', 'seller', 'manufacturer')").run();
  database.prepare("UPDATE products SET status = CASE WHEN stock > 0 THEN 'active' ELSE 'sold' END WHERE status IS NULL OR status NOT IN ('active', 'reserved', 'sold', 'draft')").run();
  database.prepare("UPDATE products SET inspection = '{}' WHERE inspection IS NULL OR inspection = ''").run();
  database.prepare("UPDATE products SET deviceDetails = '{}' WHERE deviceDetails IS NULL OR deviceDetails = ''").run();

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
    CREATE INDEX IF NOT EXISTS idx_products_region_created ON products(region, createdAt DESC);
  `);
}

function migrateMarketplace(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      priceCents INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      region TEXT NOT NULL,
      query TEXT NOT NULL DEFAULT '{}',
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS product_alerts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      targetPriceCents INTEGER,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, productId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS listing_reports (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS trade_in_requests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      condition TEXT NOT NULL,
      answers TEXT NOT NULL DEFAULT '{}',
      estimatedCents INTEGER NOT NULL,
      region TEXT NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'estimated',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS model_reviews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, productId),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS product_questions (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      userId TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      answeredBy TEXT,
      createdAt INTEGER NOT NULL,
      answeredAt INTEGER,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (answeredBy) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      language TEXT NOT NULL DEFAULT 'pl',
      region TEXT NOT NULL DEFAULT 'pl',
      active INTEGER NOT NULL DEFAULT 1,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_product_created ON price_history(productId, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_product_alerts_user ON product_alerts(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON listing_reports(status, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_trade_in_user ON trade_in_requests(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_model_reviews_model ON model_reviews(category, brand, model, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions(productId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(active, createdAt DESC);
  `);

  database.prepare(`INSERT INTO price_history (id, productId, priceCents, createdAt)
    SELECT 'initial-' || id, id, priceCents, createdAt FROM products
    WHERE priceCents IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_history h WHERE h.productId = products.id)`).run();
}

function migrateUsers(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      avatar TEXT NOT NULL DEFAULT '',
      verificationStatus TEXT NOT NULL DEFAULT 'unverified',
      verifiedAt INTEGER,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER
    )
  `);

  addColumnIfMissing(database, 'users', 'role', "TEXT NOT NULL DEFAULT 'user'");
  addColumnIfMissing(database, 'users', 'avatar', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(database, 'users', 'verificationStatus', "TEXT NOT NULL DEFAULT 'unverified'");
  addColumnIfMissing(database, 'users', 'verifiedAt', 'INTEGER');
  addColumnIfMissing(database, 'users', 'createdAt', 'INTEGER');
  addColumnIfMissing(database, 'users', 'updatedAt', 'INTEGER');

  database
    .prepare("UPDATE users SET role = 'user' WHERE role IS NULL OR role NOT IN ('user', 'admin')")
    .run();
  database.prepare("UPDATE users SET avatar = '' WHERE avatar IS NULL").run();
  database.prepare('UPDATE users SET createdAt = ? WHERE createdAt IS NULL').run(Date.now());
  database
    .prepare(
      "UPDATE users SET verificationStatus = 'unverified' WHERE verificationStatus IS NULL OR verificationStatus NOT IN ('unverified', 'verified')"
    )
    .run();
  database
    .prepare(
      "UPDATE users SET verificationStatus = 'verified', verifiedAt = COALESCE(verifiedAt, ?) WHERE role = 'admin'"
    )
    .run(Date.now());
  database.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase_unique ON users(username COLLATE NOCASE)'
  );
}

function migrateOrders(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      total REAL NOT NULL DEFAULT 0,
      totalCents INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      subtotalCents INTEGER,
      discount REAL NOT NULL DEFAULT 0,
      discountCents INTEGER NOT NULL DEFAULT 0,
      shipping REAL NOT NULL DEFAULT 0,
      shippingCents INTEGER NOT NULL DEFAULT 0,
      shippingDiscount REAL NOT NULL DEFAULT 0,
      shippingDiscountCents INTEGER NOT NULL DEFAULT 0,
      promoCode TEXT,
      rewardType TEXT,
      rewardGift TEXT,
      checkoutData TEXT NOT NULL DEFAULT '{}',
      region TEXT NOT NULL DEFAULT 'pl',
      currency TEXT NOT NULL DEFAULT 'PLN',
      status TEXT NOT NULL DEFAULT 'created',
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT
    )
  `);

  addColumnIfMissing(database, 'orders', 'items', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(database, 'orders', 'total', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'totalCents', 'INTEGER');
  addColumnIfMissing(database, 'orders', 'subtotal', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'subtotalCents', 'INTEGER');
  addColumnIfMissing(database, 'orders', 'discount', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'discountCents', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'shipping', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'shippingCents', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(database, 'orders', 'shippingDiscount', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(
    database,
    'orders',
    'shippingDiscountCents',
    'INTEGER NOT NULL DEFAULT 0'
  );
  addColumnIfMissing(database, 'orders', 'promoCode', 'TEXT');
  addColumnIfMissing(database, 'orders', 'rewardType', 'TEXT');
  addColumnIfMissing(database, 'orders', 'rewardGift', 'TEXT');
  addColumnIfMissing(database, 'orders', 'checkoutData', "TEXT NOT NULL DEFAULT '{}'");
  addColumnIfMissing(database, 'orders', 'region', "TEXT NOT NULL DEFAULT 'pl'");
  addColumnIfMissing(database, 'orders', 'currency', "TEXT NOT NULL DEFAULT 'PLN'");
  addColumnIfMissing(database, 'orders', 'status', "TEXT NOT NULL DEFAULT 'created'");
  addColumnIfMissing(database, 'orders', 'createdAt', 'INTEGER');
  addColumnIfMissing(database, 'orders', 'updatedAt', 'INTEGER');

  database.prepare("UPDATE orders SET items = '[]' WHERE items IS NULL OR items = ''").run();
  database.prepare('UPDATE orders SET total = 0 WHERE total IS NULL OR total < 0').run();
  database
    .prepare(
      'UPDATE orders SET totalCents = CAST(ROUND(total * 100) AS INTEGER) WHERE totalCents IS NULL OR totalCents < 0'
    )
    .run();
  database
    .prepare('UPDATE orders SET subtotal = total WHERE subtotal IS NULL OR subtotal < 0')
    .run();
  database
    .prepare(
      'UPDATE orders SET subtotalCents = totalCents WHERE subtotalCents IS NULL OR subtotalCents < 0'
    )
    .run();
  database.prepare('UPDATE orders SET discount = 0 WHERE discount IS NULL OR discount < 0').run();
  database
    .prepare('UPDATE orders SET discountCents = 0 WHERE discountCents IS NULL OR discountCents < 0')
    .run();
  database.prepare('UPDATE orders SET shipping = 0 WHERE shipping IS NULL OR shipping < 0').run();
  database
    .prepare('UPDATE orders SET shippingCents = 0 WHERE shippingCents IS NULL OR shippingCents < 0')
    .run();
  database
    .prepare(
      'UPDATE orders SET shippingDiscount = 0 WHERE shippingDiscount IS NULL OR shippingDiscount < 0'
    )
    .run();
  database
    .prepare(
      'UPDATE orders SET shippingDiscountCents = 0 WHERE shippingDiscountCents IS NULL OR shippingDiscountCents < 0'
    )
    .run();
  database
    .prepare(
      "UPDATE orders SET checkoutData = '{}' WHERE checkoutData IS NULL OR checkoutData = ''"
    )
    .run();
  database
    .prepare(
      "UPDATE orders SET region = 'pl' WHERE region IS NULL OR region NOT IN ('pl', 'ua', 'eu')"
    )
    .run();
  database
    .prepare(
      "UPDATE orders SET currency = CASE region WHEN 'ua' THEN 'UAH' WHEN 'eu' THEN 'EUR' ELSE 'PLN' END"
    )
    .run();
  database
    .prepare("UPDATE orders SET status = 'created' WHERE status IS NULL OR status = ''")
    .run();
  database.prepare('UPDATE orders SET createdAt = ? WHERE createdAt IS NULL').run(Date.now());
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_region_created ON orders(region, createdAt DESC);
  `);
}

function migratePromotions(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY COLLATE NOCASE,
      type TEXT NOT NULL CHECK(type IN ('percent', 'fixed')),
      value INTEGER NOT NULL,
      region TEXT NOT NULL CHECK(region IN ('pl', 'ua', 'eu')),
      minTotalCents INTEGER NOT NULL DEFAULT 0,
      maxDiscountCents INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      startsAt INTEGER,
      expiresAt INTEGER,
      usageLimit INTEGER,
      usedCount INTEGER NOT NULL DEFAULT 0,
      ownerId TEXT,
      rewardType TEXT NOT NULL DEFAULT 'discount',
      applicableCondition TEXT NOT NULL DEFAULT 'new',
      applicableSellerType TEXT NOT NULL DEFAULT 'store',
      giftKey TEXT,
      createdAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      userId TEXT NOT NULL,
      orderId TEXT NOT NULL UNIQUE,
      createdAt INTEGER NOT NULL,
      UNIQUE(code, userId),
      FOREIGN KEY (code) REFERENCES promo_codes(code) ON DELETE RESTRICT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_promo_codes_region_active ON promo_codes(region, active);
    CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(userId, createdAt DESC);
  `);
  addColumnIfMissing(database, 'promo_codes', 'ownerId', 'TEXT');
  addColumnIfMissing(database, 'promo_codes', 'rewardType', "TEXT NOT NULL DEFAULT 'discount'");
  addColumnIfMissing(
    database,
    'promo_codes',
    'applicableCondition',
    "TEXT NOT NULL DEFAULT 'new'"
  );
  addColumnIfMissing(
    database,
    'promo_codes',
    'applicableSellerType',
    "TEXT NOT NULL DEFAULT 'store'"
  );
  addColumnIfMissing(database, 'promo_codes', 'giftKey', 'TEXT');
  database
    .prepare("UPDATE promo_codes SET rewardType = 'discount' WHERE rewardType IS NULL OR rewardType = ''")
    .run();
  database
    .prepare(
      "UPDATE promo_codes SET applicableCondition = 'new' WHERE applicableCondition IS NULL OR applicableCondition = ''"
    )
    .run();
  database
    .prepare(
      "UPDATE promo_codes SET applicableSellerType = 'store' WHERE applicableSellerType IS NULL OR applicableSellerType = ''"
    )
    .run();
}

function migrateChats(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      buyerId TEXT NOT NULL,
      sellerId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(productId, buyerId, sellerId),
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      senderId TEXT NOT NULL,
      body TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      readAt INTEGER,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS price_offers (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      productId TEXT NOT NULL,
      createdBy TEXT NOT NULL,
      recipientId TEXT NOT NULL,
      amountCents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'redeemed')),
      parentOfferId TEXT,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipientId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parentOfferId) REFERENCES price_offers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated ON conversations(buyerId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_conversations_seller_updated ON conversations(sellerId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversationId, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_price_offers_conversation_created ON price_offers(conversationId, createdAt ASC);
    CREATE INDEX IF NOT EXISTS idx_price_offers_recipient_status ON price_offers(recipientId, status);
  `);
}

function migrateTrust(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      status TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (changedBy) REFERENCES users(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      productId TEXT NOT NULL,
      buyerId TEXT NOT NULL,
      sellerId TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      hidden INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      UNIQUE(orderId, productId, buyerId),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_seller_visible ON reviews(sellerId, hidden, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(orderId, createdAt ASC);
  `);
}

function migrateRewards(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS game_attempts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      game TEXT NOT NULL CHECK(game IN ('spin', 'quiz', 'tictactoe')),
      attemptDate TEXT NOT NULL,
      won INTEGER NOT NULL DEFAULT 0,
      rewardCode TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, game, attemptDate),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (rewardCode) REFERENCES promo_codes(code) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_game_attempts_user_created ON game_attempts(userId, createdAt DESC);
  `);

  const attemptsSchema =
    database
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'game_attempts'")
      .get()?.sql || '';
  if (!attemptsSchema.includes('tictactoe')) {
    database.pragma('foreign_keys = OFF');
    database.exec(`
      ALTER TABLE game_attempts RENAME TO game_attempts_legacy;
      CREATE TABLE game_attempts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        game TEXT NOT NULL CHECK(game IN ('spin', 'quiz', 'tictactoe')),
        attemptDate TEXT NOT NULL,
        won INTEGER NOT NULL DEFAULT 0,
        rewardCode TEXT,
        createdAt INTEGER NOT NULL,
        UNIQUE(userId, game, attemptDate),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (rewardCode) REFERENCES promo_codes(code) ON DELETE SET NULL
      );
      INSERT INTO game_attempts SELECT * FROM game_attempts_legacy;
      DROP TABLE game_attempts_legacy;
      CREATE INDEX idx_game_attempts_user_created ON game_attempts(userId, createdAt DESC);
    `);
    database.pragma('foreign_keys = ON');
  }
}

function initDB() {
  const configuredFile = getConfiguredFile();
  if (db && activeFile === configuredFile) return db;
  if (db) closeDB();

  if (configuredFile !== ':memory:') {
    fs.mkdirSync(path.dirname(configuredFile), { recursive: true });
  }

  db = new Database(configuredFile);
  activeFile = configuredFile;
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  if (configuredFile !== ':memory:') db.pragma('journal_mode = WAL');

  const migrate = db.transaction(() => {
    migrateUsers(db);
    migrateProducts(db);
    migrateOrders(db);
    migratePromotions(db);
    migrateChats(db);
    migrateTrust(db);
    migrateRewards(db);
    migrateMarketplace(db);
  });
  try {
    migrate();
  } catch (error) {
    closeDB();
    throw error;
  }

  return db;
}

function getDB() {
  const configuredFile = getConfiguredFile();
  if (!db || activeFile !== configuredFile) return initDB();
  return db;
}

function closeDB() {
  if (db) db.close();
  db = undefined;
  activeFile = undefined;
}

module.exports = {
  closeDB,
  getConfiguredFile,
  getDB,
  initDB,
  resetConnection: closeDB,
};
