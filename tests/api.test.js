const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Set every environment variable before loading the application and keep the
// configured path outside the repository. This prevents API tests from ever
// connecting to data/db.sqlite by accident.
const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'na-shary-api-'));
const testDatabasePath = path.join(tempDirectory, 'test.sqlite');
const developmentDatabasePath = path.resolve(__dirname, '..', 'data', 'db.sqlite');

assert.notEqual(path.resolve(testDatabasePath), developmentDatabasePath);

process.env.NODE_ENV = 'test';
process.env.DEMO_CATALOG_ENABLED = 'true';
process.env.DB_PATH = testDatabasePath;
process.env.DB_FILE = testDatabasePath;
process.env.DATABASE_PATH = testDatabasePath;
process.env.JWT_SECRET = 'integration-test-secret-that-is-never-used-outside-tests';
process.env.ADMIN_USERNAME = 'qa-admin';
process.env.ADMIN_PASSWORD = 'QaAdminPass123!';

const { app, setup } = require('../backend/app');
const database = require('../backend/db');
const { DEMO_PRODUCTS, seed } = require('../backend/seed');

let server;
let baseUrl;
let adminToken;
let sequence = 0;

function uniqueUsername(prefix) {
  sequence += 1;
  return `${prefix}-${process.pid}-${sequence}`;
}

async function request(pathname, { method = 'GET', token, body } = {}) {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseText = await response.text();
  let responseBody = null;

  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }
  }

  return { response, body: responseBody };
}

async function registerAndLogin(prefix = 'buyer') {
  const username = uniqueUsername(prefix);
  const password = 'BuyerPass123!';
  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: { username, password, role: 'admin' },
  });
  assert.equal(registered.response.status, 201);
  assert.equal(registered.body.user.role, 'user');

  const loggedIn = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(loggedIn.response.status, 200);
  assert.equal(typeof loggedIn.body.token, 'string');

  const me = await request('/api/auth/me', { token: loggedIn.body.token });
  assert.equal(me.response.status, 200);

  return { username, password, token: loggedIn.body.token, user: me.body.user };
}

function productPayload(overrides = {}) {
  return {
    title: 'iPhone 15 128GB',
    description: 'A pre-owned smartphone in excellent condition with a full set.',
    price: 2499.5,
    images: ['https://example.com/iphone-15.jpg'],
    specs: {
      screen: '6.1″',
      processor: 'Apple A16',
      ram: '6 GB',
      storage: '128 GB',
      os: 'iOS',
    },
    category: 'Smartphones',
    location: 'Warsaw',
    condition: 'used',
    brand: 'Apple',
    stock: 3,
    seller: 'Tech Seller',
    sellerType: 'store',
    delivery: 'both',
    ...overrides,
  };
}

async function createProduct(overrides = {}) {
  const created = await request('/api/products', {
    method: 'POST',
    token: adminToken,
    body: productPayload(overrides),
  });
  assert.equal(created.response.status, 201);
  return created.body;
}

test.before(async () => {
  await setup();
  await seed();

  server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
    },
  });
  assert.equal(adminLogin.response.status, 200);
  adminToken = adminLogin.body.token;
});

test.after(async () => {
  if (server?.listening) {
    server.close();
    await once(server, 'close');
  }

  if (typeof database.closeDB === 'function') database.closeDB();
  fs.rmSync(tempDirectory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
});

test('new-device sales require separate admin approval and revocation stops public sales', async () => {
  const seller = await registerAndLogin('approved-new-seller');
  const buyer = await registerAndLogin('approval-buyer');
  const payload = productPayload({ condition: 'new', title: 'Approved new device', stock: 2 });
  assert.equal((await request('/api/products', { method: 'POST', token: seller.token, body: payload })).response.status, 403);
  const used = await request('/api/products', { method: 'POST', token: seller.token, body: productPayload({ condition: 'used' }) });
  assert.equal(used.response.status, 201);
  assert.equal((await request(`/api/products/${used.body.id}`, { method: 'PATCH', token: seller.token, body: { condition: 'new' } })).response.status, 403);
  assert.equal((await request(`/api/staff/users/${seller.user.id}`, { method: 'PATCH', token: seller.token, body: { canSellNew: true, reason: 'Approve myself' } })).response.status, 403);
  const profile = await request('/api/auth/me', { method: 'PATCH', token: seller.token, body: { displayName: 'Seller profile', canSellNew: true } });
  assert.equal(profile.body.user.canSellNew, false);
  const approved = await request(`/api/staff/users/${seller.user.id}`, { method: 'PATCH', token: adminToken, body: { canSellNew: true, reason: 'Reviewed new-device seller' } });
  assert.equal(approved.response.status, 200);
  const login = await request('/api/auth/login', { method: 'POST', body: { username: seller.username, password: seller.password } });
  assert.equal(login.body.user.role, 'user');
  assert.equal(login.body.user.canSellNew, true);
  const created = await request('/api/products', { method: 'POST', token: login.body.token, body: payload });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.sellerType, 'store');
  assert.equal((await request(`/api/products/${created.body.id}`)).response.status, 200);
  const revoked = await request(`/api/staff/users/${seller.user.id}`, { method: 'PATCH', token: adminToken, body: { canSellNew: false, reason: 'Seller permission withdrawn' } });
  assert.equal(revoked.response.status, 200);
  assert.equal((await request(`/api/products/${created.body.id}`)).response.status, 404);
  assert.ok(!(await request('/api/products?condition=new')).body.some((item) => item.id === created.body.id));
  const denied = await request('/api/orders', { method: 'POST', token: buyer.token, body: { items: [{ id: created.body.id, qty: 1 }] } });
  assert.equal(denied.response.status, 409);
  assert.equal((await request('/api/auth/me', { token: login.body.token })).response.status, 401);
  const audit = await request('/api/staff/log', { token: adminToken });
  assert.ok(audit.body.some((row) => row.targetId === seller.user.id && row.action === 'seller.new.approved'));
  assert.ok(audit.body.some((row) => row.targetId === seller.user.id && row.action === 'seller.new.revoked'));
});

test('supply details persist, preserve manual configuration and prevent checkout before stock arrives', async () => {
  const supplyDetails = { availability: 'on_order', marketVersion: 'CN', firmware: 'Factory firmware', languages: 'English, Chinese', networkBands: 'Seller-confirmed bands', packageContents: 'Phone, cable', warrantyTerms: 'Seller terms', leadTime: '10–14 days', sku: 'QA-SUPPLY-01', batch: 'QA-LOT-01' };
  const product = await createProduct({ condition: 'new', stock: 1, supplyDetails });
  assert.deepEqual(product.supplyDetails, supplyDetails);
  const buyer = await registerAndLogin('supply-buyer');
  const rejected = await request('/api/orders', { method: 'POST', token: buyer.token, body: { items: [{ id: product.id, qty: 1 }] } });
  assert.equal(rejected.response.status, 409);
  assert.equal(rejected.body.code, 'PRODUCT_NOT_IN_STOCK');
  assert.equal((await request(`/api/products/${product.id}`)).body.stock, 1);
  const inStock = await request('/api/products?inStock=true&condition=new');
  assert.ok(!inStock.body.some((item) => item.id === product.id));
  const updated = await request(`/api/products/${product.id}`, { method: 'PATCH', token: adminToken, body: { title: 'Updated supply title', specs: { processor: 'Updated model specs' } } });
  assert.equal(updated.response.status, 200);
  assert.deepEqual(updated.body.supplyDetails, supplyDetails);
  for (const invalid of [{ availability: 'yes' }, { marketVersion: 'CN-GLOBAL-MAYBE' }, { leadTime: 10 }, { firmware: 'x'.repeat(121) }, { unknown: 'value' }]) {
    const response = await request(`/api/products/${product.id}`, { method: 'PATCH', token: adminToken, body: { supplyDetails: invalid } });
    assert.equal(response.response.status, 400);
    assert.ok(response.body.details[0].field.startsWith('supplyDetails.'));
  }
  const ready = await request(`/api/products/${product.id}`, { method: 'PATCH', token: adminToken, body: { supplyDetails: { ...supplyDetails, availability: 'in_stock' } } });
  assert.equal(ready.response.status, 200);
  const ordered = await request('/api/orders', { method: 'POST', token: buyer.token, body: { items: [{ id: product.id, qty: 1 }] } });
  assert.equal(ordered.response.status, 201);
  assert.equal(ordered.body.items[0].supplyDetails.marketVersion, 'CN');
  assert.equal(ordered.body.items[0].supplyDetails.sku, 'QA-SUPPLY-01');
});

test('new and used catalogs stay separate and search includes model and configuration terms', async () => {
  const newProduct = await createProduct({ title: 'New audit device', model: 'AuditModel987', condition: 'new', specs: { storage: '512 GB' } });
  const usedProduct = await createProduct({ title: 'Used audit device', model: 'AuditModel987', condition: 'used', specs: { storage: '512 GB' } });
  for (const condition of ['new', 'used']) {
    const result = await request(`/api/products?condition=${condition}&region=pl&q=512%20AuditModel987`);
    assert.equal(result.response.status, 200);
    assert.equal(result.body.length, 1);
    assert.equal(result.body[0].id, condition === 'new' ? newProduct.id : usedProduct.id);
    assert.ok(result.body.every((item) => item.condition === condition));
    const related = await request(`/api/products/${result.body[0].id}/related`);
    assert.equal(related.response.status, 200);
    assert.ok(related.body.every((item) => item.condition === condition));
  }
  const wildcard = await request('/api/products?q=AuditModel987%25');
  assert.deepEqual(wildcard.body, []);
});

test('marketplace tools save searches, price watches, trade-ins, reviews and reports', async () => {
  const buyer = await registerAndLogin('market-tools');
  const product = await createProduct({
    title: 'Pixel 9 Pro 256GB',
    brand: 'Google',
    model: 'Pixel 9 Pro',
    warranty: 'seller',
    negotiable: true,
    urgent: true,
    inspection: { screen: true, battery: true, cameras: true },
  });

  const saved = await request('/api/marketplace/searches', {
    method: 'POST', token: buyer.token,
    body: { name: 'Pixel deals', region: 'pl', query: { brand: 'Google', model: 'Pixel 9 Pro' } },
  });
  assert.equal(saved.response.status, 201);
  const searches = await request('/api/marketplace/searches', { token: buyer.token });
  assert.equal(searches.response.status, 200);
  assert.equal(searches.body[0].matches >= 1, true);

  const alert = await request('/api/marketplace/alerts', {
    method: 'POST', token: buyer.token,
    body: { productId: product.id, targetPrice: 2200 },
  });
  assert.equal(alert.response.status, 201);
  const alerts = await request('/api/marketplace/alerts', { token: buyer.token });
  assert.equal(alerts.body[0].targetPrice, 2200);

  const trade = await request('/api/marketplace/trade-in', {
    method: 'POST', token: buyer.token,
    body: { category: 'Smartfony', brand: 'Apple', model: 'iPhone 13', condition: 'good', answers: { screen: true, battery: true }, region: 'pl' },
  });
  assert.equal(trade.response.status, 201);
  assert.equal(trade.body.estimate > 0, true);

  const review = await request(`/api/marketplace/products/${product.id}/reviews`, {
    method: 'POST', token: buyer.token, body: { rating: 5, comment: 'Very useful model.' },
  });
  assert.equal(review.response.status, 201);
  const report = await request('/api/marketplace/reports', {
    method: 'POST', token: buyer.token, body: { productId: product.id, reason: 'details', details: 'Please verify the warranty.' },
  });
  assert.equal(report.response.status, 201);
  const reports = await request('/api/marketplace/reports', { token: adminToken });
  assert.equal(reports.response.status, 200);
  assert.equal(reports.body.some((item) => item.id === report.body.id), true);

  const updated = await request(`/api/products/${product.id}`, {
    method: 'PATCH', token: adminToken, body: { price: 2299.5 },
  });
  assert.equal(updated.response.status, 200);

  const modelPage = await request('/api/products/model?brand=Google&model=Pixel%209%20Pro&region=pl');
  assert.equal(modelPage.response.status, 200);
  assert.equal(modelPage.body.offers.some((item) => item.id === product.id), true);
  assert.equal(Array.isArray(modelPage.body.variants.colors), true);

  const question = await request('/api/marketplace/questions', {
    method: 'POST', token: buyer.token,
    body: { productId: product.id, question: 'Is the serial number checked?' },
  });
  assert.equal(question.response.status, 201);
  const answered = await request(`/api/marketplace/questions/${question.body.id}/answer`, {
    method: 'PATCH', token: adminToken, body: { answer: 'Yes, it is checked before publication.' },
  });
  assert.equal(answered.response.status, 200);
  const questions = await request('/api/marketplace/questions?brand=Google&model=Pixel%209%20Pro&region=pl');
  assert.equal(questions.body[0].answer.includes('checked'), true);
});

test('API tests use a temporary SQLite database', () => {
  assert.equal(path.resolve(process.env.DB_PATH), path.resolve(testDatabasePath));
  assert.equal(path.resolve(database.getConfiguredFile()), path.resolve(testDatabasePath));
  assert.equal(fs.existsSync(testDatabasePath), true);
  assert.equal(path.dirname(path.resolve(testDatabasePath)), path.resolve(tempDirectory));
});
test('profiles support email sign-in and password changes revoke prior sessions', async () => {
  const person = await registerAndLogin('profile');
  const email = person.username + '@example.com';
  const saved = await request('/api/auth/me', { method: 'PATCH', token: person.token, body: {
    displayName: 'Test Person', email, phone: '+48 123 456 789', city: 'Warszawa', address: 'Test Street 1', role: 'admin',
  } });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.body.user.role, 'user');
  assert.equal(saved.body.user.email, email);
  assert.equal('password' in saved.body.user, false);
  const login = await request('/api/auth/login', { method: 'POST', body: { username: email.toUpperCase(), password: person.password } });
  assert.equal(login.response.status, 200);
  const other = await registerAndLogin('duplicate-email');
  assert.equal((await request('/api/auth/me', { method: 'PATCH', token: other.token, body: { email: email.toUpperCase() } })).response.status, 409);
  assert.equal((await request('/api/auth/password', { method: 'POST', token: person.token, body: { currentPassword: 'incorrect', newPassword: 'UpdatedPassword123!' } })).response.status, 400);
  const changed = await request('/api/auth/password', { method: 'POST', token: person.token, body: { currentPassword: person.password, newPassword: 'UpdatedPassword123!' } });
  assert.equal(changed.response.status, 200);
  assert.equal((await request('/api/auth/me', { token: person.token })).response.status, 401);
  assert.equal((await request('/api/auth/me', { token: login.body.token })).response.status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: email, password: person.password } })).response.status, 401);
  const fresh = await request('/api/auth/login', { method: 'POST', body: { username: email, password: 'UpdatedPassword123!' } });
  assert.equal(fresh.response.status, 200);
  assert.equal((await request('/api/auth/logout', { method: 'POST', token: fresh.body.token })).response.status, 200);
  assert.equal((await request('/api/auth/me', { token: fresh.body.token })).response.status, 401);
});

test('three roles enforce moderation rights, account suspension and listing visibility', async () => {
  const moderator = await registerAndLogin('moderator');
  const owner = await registerAndLogin('moderated-owner');
  assert.equal((await request('/api/staff/users', { token: owner.token })).response.status, 403);
  assert.equal((await request('/api/staff/users/' + owner.user.id, { method: 'PATCH', token: moderator.token, body: { role: 'moderator', reason: 'Attempt elevation' } })).response.status, 403);
  const promoted = await request('/api/staff/users/' + moderator.user.id, { method: 'PATCH', token: adminToken, body: { role: 'moderator', reason: 'Appointed by administrator' } });
  assert.equal(promoted.response.status, 200);
  assert.equal((await request('/api/auth/me', { token: moderator.token })).response.status, 401);
  const relog = await request('/api/auth/login', { method: 'POST', body: { username: moderator.username, password: moderator.password } });
  const token = relog.body.token;
  assert.equal(relog.body.user.role, 'moderator');
  assert.equal((await request('/api/staff/users', { token })).response.status, 403);
  assert.equal((await request('/api/staff/products', { token })).response.status, 200);
  const product = await request('/api/products', { method: 'POST', token: owner.token, body: productPayload() });
  assert.equal(product.response.status, 201);
  const id = product.body.id;
  assert.equal((await request('/api/staff/products/' + id + '/moderation', { method: 'PATCH', token, body: { status: 'hidden', reason: 'Misleading listing details' } })).response.status, 200);
  assert.equal((await request('/api/products/' + id)).response.status, 404);
  assert.equal((await request('/api/products/' + id, { token: owner.token })).response.status, 200);
  assert.equal((await request('/api/products')).body.some((p) => p.id === id), false);
  assert.equal((await request('/api/orders', { method: 'POST', token: moderator.token, body: { items: [{ id, qty: 1 }] } })).response.status, 401);
  assert.equal((await request('/api/orders', { method: 'POST', token, body: { items: [{ id, qty: 1 }] } })).response.status, 409);
  // An owner edit cannot reset the independent moderation flag.
  assert.equal((await request('/api/products/' + id, { method: 'PATCH', token: owner.token, body: { title: 'Updated listing title' } })).response.status, 200);
  assert.equal((await request('/api/products/' + id)).response.status, 404);
  assert.equal((await request('/api/staff/products/' + id + '/moderation', { method: 'PATCH', token, body: { status: 'approved', reason: 'Listing verified after correction' } })).response.status, 200);
  assert.equal((await request('/api/products/' + id)).response.status, 200);
  assert.equal((await request('/api/staff/users/' + owner.user.id, { method: 'PATCH', token: adminToken, body: { accountStatus: 'suspended', reason: 'Repeated listing violations' } })).response.status, 200);
  assert.equal((await request('/api/auth/me', { token: owner.token })).response.status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: owner.username, password: owner.password } })).response.status, 403);
  assert.equal((await request('/api/products/' + id)).response.status, 404);
  const adminMe = await request('/api/auth/me', { token: adminToken });
  assert.equal((await request('/api/staff/users/' + adminMe.body.user.id, { method: 'PATCH', token: adminToken, body: { role: 'user', reason: 'Self demotion attempt' } })).response.status, 403);
  const log = await request('/api/staff/log', { token });
  assert.equal(log.response.status, 200);
  assert.ok(log.body.some((entry) => entry.targetId === id && entry.action === 'listing.hidden'));
});

test('public catalog keeps a small labelled showcase without selling sample stock', async () => {
  const { SHOWCASE_IDS } = require('../backend/utils/catalog');
  process.env.DEMO_CATALOG_ENABLED = 'false';
  try {
    const list = await request('/api/products');
    const samples = list.body.filter((product) => product.isDemo);
    assert.equal(samples.length, SHOWCASE_IDS.length);
    assert.ok(samples.every((product) => SHOWCASE_IDS.includes(product.id)));
    assert.equal((await request('/api/products/demo-iphone-15-used-blue')).response.status, 404);
    const buyer = await registerAndLogin('showcase-buyer');
    assert.equal((await request('/api/orders', { method: 'POST', token: buyer.token, body: { items: [{ id: SHOWCASE_IDS[0], qty: 1 }] } })).response.status, 409);
  } finally { process.env.DEMO_CATALOG_ENABLED = 'true'; }
});

test('GET /api/health reports a healthy API', async () => {
  const result = await request('/api/health');

  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, { status: 'ok', service: 'na-shary-api' });
});

test('catalog assistant turns natural language into regional product matches', async () => {
  const product = await createProduct({
    title: 'Apple iPhone 15 Pro assistant test',
    category: 'Smartfony',
    region: 'pl',
    condition: 'used',
    price: 2199,
    brand: 'Apple',
    model: 'iPhone 15 Pro',
  });
  const result = await request('/api/marketplace/assistant?q=u%C5%BCywany%20iPhone%2015%20Pro%20do%202500%20z%C5%82&region=pl&language=pl');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.filters.condition, 'used');
  assert.equal(result.body.filters.maxPrice, 2500);
  assert.ok(result.body.results.some((item) => item.id === product.id));
});

test('device specification lookup fills common phone data', async () => {
  const result = await request('/api/device-specs?q=iPhone%2015', { token: adminToken });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.results[0].model, 'iPhone 15');
  assert.match(result.body.results[0].specs.battery, /mAh/);
  assert.match(result.body.results[0].specs.mainCamera, /MP/);
});

test('newsletter subscriptions are validated and can be updated', async () => {
  const subscribed = await request('/api/marketplace/newsletter', {
    method: 'POST',
    body: { email: 'reader@example.com', language: 'pl', region: 'pl' },
  });
  assert.equal(subscribed.response.status, 201);
  assert.deepEqual(subscribed.body, { email: 'reader@example.com', subscribed: true });

  const updated = await request('/api/marketplace/newsletter', {
    method: 'POST',
    body: { email: 'READER@example.com', language: 'uk', region: 'ua' },
  });
  assert.equal(updated.response.status, 201);

  const invalid = await request('/api/marketplace/newsletter', {
    method: 'POST',
    body: { email: 'not-an-email' },
  });
  assert.equal(invalid.response.status, 400);
});

test('the seed is idempotent and creates an admin that can use /auth/me', async () => {
  await seed();

  const db = database.getDB();
  const adminCount = db
    .prepare('SELECT COUNT(*) AS count FROM users WHERE username = ? AND role = ?')
    .get(process.env.ADMIN_USERNAME, 'admin').count;
  assert.equal(adminCount, 1);
  const demoProductCount = db
    .prepare("SELECT COUNT(*) AS count FROM products WHERE id LIKE 'demo-%'")
    .get().count;
  assert.equal(demoProductCount, DEMO_PRODUCTS.length);

  const me = await request('/api/auth/me', { token: adminToken });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.user.username, process.env.ADMIN_USERNAME);
  assert.equal(me.body.user.role, 'admin');
  assert.equal(Object.hasOwn(me.body.user, 'password'), false);
});

test('registration always creates a regular user and login rejects bad credentials', async () => {
  const username = uniqueUsername('customer');
  const password = 'CustomerPass123!';

  const missingFields = await request('/api/auth/register', {
    method: 'POST',
    body: { username },
  });
  assert.equal(missingFields.response.status, 400);

  const registered = await request('/api/auth/register', {
    method: 'POST',
    body: { username, password, role: 'admin' },
  });
  assert.equal(registered.response.status, 201);
  assert.equal(registered.body.user.role, 'user');
  const storedUser = database
    .getDB()
    .prepare('SELECT password, role FROM users WHERE username = ?')
    .get(username);
  assert.equal(storedUser.role, 'user');
  assert.notEqual(storedUser.password, password);
  assert.match(storedUser.password, /^\$2[aby]\$/);

  const duplicate = await request('/api/auth/register', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(duplicate.response.status, 409);

  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password: 'DefinitelyWrong123!' },
  });
  assert.equal(badLogin.response.status, 401);

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(login.response.status, 200);

  const me = await request('/api/auth/me', { token: login.body.token });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.user.username, username);
  assert.equal(me.body.user.role, 'user');

  const avatar = 'data:image/png;base64,iVBORw0KGgo=';
  const profile = await request('/api/auth/me', {
    method: 'PATCH',
    token: login.body.token,
    body: { avatar },
  });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.body.user.avatar, avatar);

  const refreshed = await request('/api/auth/me', { token: login.body.token });
  assert.equal(refreshed.body.user.avatar, avatar);
});

test('users manage their own validated listings while admins can moderate them', async () => {
  const owner = await registerAndLogin('listing-owner');
  const stranger = await registerAndLogin('listing-stranger');

  const unauthenticated = await request('/api/products', {
    method: 'POST',
    body: productPayload(),
  });
  assert.equal(unauthenticated.response.status, 401);

  const invalid = await request('/api/products', {
    method: 'POST',
    token: owner.token,
    body: productPayload({ title: '', condition: 'broken', stock: -1 }),
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.code, 'VALIDATION_ERROR');
  assert.equal(Array.isArray(invalid.body.details), true);

  const created = await request('/api/products', {
    method: 'POST',
    token: owner.token,
    body: productPayload({ seller: 'Spoofed Seller', sellerType: 'store' }),
  });
  assert.equal(created.response.status, 201);
  const product = created.body;
  assert.equal(typeof product.id, 'string');
  assert.equal(product.condition, 'used');
  assert.equal(product.brand, 'Apple');
  assert.equal(product.stock, 3);
  assert.equal(product.delivery, 'both');
  assert.equal(product.region, 'pl');
  assert.equal(product.currency, 'PLN');
  assert.equal(product.seller, owner.username);
  assert.equal(product.sellerType, 'private');
  assert.deepEqual(product.images, ['https://example.com/iphone-15.jpg']);
  assert.deepEqual(product.specs, {
    screen: '6.1″',
    processor: 'Apple A16',
    ram: '6 GB',
    storage: '128 GB',
    os: 'iOS',
  });

  const detail = await request(`/api/products/${product.id}`);
  assert.equal(detail.response.status, 200);
  assert.equal(detail.body.id, product.id);

  const filtered = await request('/api/products?q=iPhone&brand=Apple&condition=used&inStock=true');
  assert.equal(filtered.response.status, 200);
  assert.equal(
    filtered.body.some((item) => item.id === product.id),
    true
  );

  const technicalFilter = await request(
    '/api/products?processor=Apple%20A16&screen=6.1%E2%80%B3&sort=title_asc'
  );
  assert.equal(technicalFilter.response.status, 200);
  assert.equal(
    technicalFilter.body.some((item) => item.id === product.id),
    true
  );

  const invalidFilter = await request('/api/products?condition=damaged');
  assert.equal(invalidFilter.response.status, 400);

  const ukrainianProduct = await createProduct({
    title: 'ASUS Zenbook regional listing',
    region: 'ua',
    price: 45000,
    location: 'Kyiv',
  });
  assert.equal(ukrainianProduct.region, 'ua');
  assert.equal(ukrainianProduct.currency, 'UAH');

  const ukrainianCatalog = await request('/api/products?region=ua');
  assert.equal(ukrainianCatalog.response.status, 200);
  assert.equal(
    ukrainianCatalog.body.some((item) => item.id === ukrainianProduct.id),
    true
  );
  assert.equal(
    ukrainianCatalog.body.every((item) => item.region === 'ua'),
    true
  );

  const invalidRegion = await request('/api/products?region=world');
  assert.equal(invalidRegion.response.status, 400);

  const ownerListings = await request('/api/products/mine', { token: owner.token });
  assert.equal(ownerListings.response.status, 200);
  assert.equal(
    ownerListings.body.some((item) => item.id === product.id),
    true
  );

  const strangerListings = await request('/api/products/mine', { token: stranger.token });
  assert.equal(strangerListings.response.status, 200);
  assert.equal(
    strangerListings.body.some((item) => item.id === product.id),
    false
  );

  const adminListings = await request('/api/products/mine', { token: adminToken });
  assert.equal(adminListings.response.status, 200);
  assert.equal(
    adminListings.body.some((item) => item.id === product.id),
    false
  );

  const forbiddenUpdate = await request(`/api/products/${product.id}`, {
    method: 'PATCH',
    token: stranger.token,
    body: { price: 2199 },
  });
  assert.equal(forbiddenUpdate.response.status, 403);

  const updated = await request(`/api/products/${product.id}`, {
    method: 'PATCH',
    token: owner.token,
    body: { price: 2199, stock: 2, seller: 'Another Spoof' },
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.price, 2199);
  assert.equal(updated.body.stock, 2);
  assert.equal(updated.body.seller, owner.username);

  const moderated = await request(`/api/products/${product.id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { location: 'Krakow' },
  });
  assert.equal(moderated.response.status, 200);
  assert.equal(moderated.body.location, 'Krakow');

  const forbiddenDelete = await request(`/api/products/${product.id}`, {
    method: 'DELETE',
    token: stranger.token,
  });
  assert.equal(forbiddenDelete.response.status, 403);

  const deleted = await request(`/api/products/${product.id}`, {
    method: 'DELETE',
    token: owner.token,
  });
  assert.equal(deleted.response.status, 204);

  const missing = await request(`/api/products/${product.id}`);
  assert.equal(missing.response.status, 404);
});

test('listing owners cannot buy, watch or open a chat with themselves, including admins', async () => {
  const product = await createProduct();
  const buyer = await registerAndLogin('self-action-buyer');
  for (const [path, body, status] of [
    ['/api/orders', { items: [{ id: product.id, qty: 1 }] }, 403],
    ['/api/marketplace/alerts', { productId: product.id, targetPrice: 2000 }, 403],
    ['/api/chats', { productId: product.id }, 400],
  ]) {
    const rejected = await request(path, { method: 'POST', token: adminToken, body });
    assert.equal(rejected.response.status, status, JSON.stringify(rejected.body));
  }
  const unchanged = await request(`/api/products/${product.id}`);
  assert.equal(unchanged.body.stock, product.stock);
  const chat = await request('/api/chats', { method: 'POST', token: buyer.token, body: { productId: product.id } });
  assert.equal(chat.response.status, 201);
  const alert = await request('/api/marketplace/alerts', { method: 'POST', token: buyer.token, body: { productId: product.id, targetPrice: 2000 } });
  assert.equal(alert.response.status, 201);
});

test('cancelling an order restores stock exactly once even for simultaneous requests', async () => {
  const product = await createProduct({ stock: 2 });
  const buyer = await registerAndLogin('cancel-stock');
  const ordered = await request('/api/orders', { method: 'POST', token: buyer.token, body: { items: [{ id: product.id, qty: 2 }] } });
  assert.equal(ordered.response.status, 201);
  assert.equal((await request(`/api/products/${product.id}`)).body.stock, 0);
  const cancelled = await Promise.all([1, 2].map(() => request(`/api/orders/${ordered.body.id}/status`, { method: 'PATCH', token: adminToken, body: { status: 'cancelled' } })));
  assert.deepEqual(cancelled.map((item) => item.response.status).sort(), [200, 409]);
  assert.equal((await request(`/api/products/${product.id}`)).body.stock, 2);
  assert.equal((await request(`/api/orders/${ordered.body.id}/status`, { method: 'PATCH', token: adminToken, body: { status: 'cancelled' } })).response.status, 409);
  assert.equal((await request(`/api/products/${product.id}`)).body.stock, 2);
});

test('orders calculate totals on the server and enforce ownership', async () => {
  const product = await createProduct({
    title: 'Sony WH-1000XM5',
    price: 399.99,
    brand: 'Sony',
    condition: 'new',
    stock: 5,
  });
  const buyer = await registerAndLogin('order-owner');
  const stranger = await registerAndLogin('order-stranger');
  const europeanProduct = await createProduct({
    title: 'EU regional monitor',
    price: 299.99,
    region: 'eu',
    location: 'Berlin',
  });

  const unauthenticated = await request('/api/orders', {
    method: 'POST',
    body: { items: [{ id: product.id, qty: 2 }] },
  });
  assert.equal(unauthenticated.response.status, 401);

  const invalidQuantity = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: product.id, qty: 0 }] },
  });
  assert.equal(invalidQuantity.response.status, 400);

  const mixedRegions = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: {
      items: [
        { id: product.id, qty: 1 },
        { id: europeanProduct.id, qty: 1 },
      ],
    },
  });
  assert.equal(mixedRegions.response.status, 400);
  assert.equal(mixedRegions.body.code, 'MIXED_REGIONS');

  const created = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: {
      items: [{ id: product.id, qty: 2 }],
      total: 0.01,
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.userId, buyer.user.id);
  assert.equal(created.body.total, 799.98);
  assert.equal(created.body.status, 'created');
  assert.equal(created.body.region, 'pl');
  assert.equal(created.body.currency, 'PLN');
  assert.equal(created.body.items[0].id, product.id);
  assert.equal(created.body.items[0].title, 'Sony WH-1000XM5');
  assert.equal(created.body.items[0].price, 399.99);
  assert.equal(created.body.items[0].qty, 2);
  assert.equal(created.body.items[0].lineTotal, 799.98);
  assert.equal(created.body.items[0].region, 'pl');
  assert.equal(created.body.items[0].currency, 'PLN');

  const productAfterOrder = await request(`/api/products/${product.id}`);
  assert.equal(productAfterOrder.response.status, 200);
  assert.equal(productAfterOrder.body.stock, 3);

  const insufficientStock = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: product.id, qty: 4 }] },
  });
  assert.equal(insufficientStock.response.status, 409);

  const ownOrder = await request(`/api/orders/${created.body.id}`, { token: buyer.token });
  assert.equal(ownOrder.response.status, 200);
  assert.equal(ownOrder.body.id, created.body.id);

  const forbidden = await request(`/api/orders/${created.body.id}`, { token: stranger.token });
  assert.equal(forbidden.response.status, 403);

  const adminRead = await request(`/api/orders/${created.body.id}`, { token: adminToken });
  assert.equal(adminRead.response.status, 200);

  const ownerOrders = await request('/api/orders', { token: buyer.token });
  assert.equal(ownerOrders.response.status, 200);
  assert.equal(Array.isArray(ownerOrders.body), true);
  assert.equal(
    ownerOrders.body.some((order) => order.id === created.body.id),
    true
  );

  const strangerOrders = await request('/api/orders', { token: stranger.token });
  assert.equal(strangerOrders.response.status, 200);
  assert.equal(
    strangerOrders.body.some((order) => order.id === created.body.id),
    false
  );

  const adminOrders = await request('/api/orders', { token: adminToken });
  assert.equal(adminOrders.response.status, 200);
  assert.equal(
    adminOrders.body.some((order) => order.id === created.body.id),
    true
  );

  const missingProduct = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: 'missing-product-id', qty: 1 }] },
  });
  assert.equal(missingProduct.response.status, 409);
});

test('checkout exposes regional carriers and validates delivery and payment details', async () => {
  const options = await request('/api/orders/options?region=pl');
  assert.equal(options.response.status, 200);
  assert.equal(options.body.region, 'pl');
  assert.equal(options.body.delivery.some((item) => item.id === 'inpost_locker'), true);
  assert.equal(options.body.payments.includes('blik'), true);
  assert.equal(options.body.payments.includes('google_pay'), true);

  const uaOptions = await request('/api/orders/options?region=ua');
  assert.equal(uaOptions.response.status, 200);
  assert.equal(uaOptions.body.delivery.some((item) => item.id === 'ukrposhta_branch'), true);
  assert.equal(uaOptions.body.delivery.some((item) => item.id === 'ukrposhta_courier'), true);

  const euOptions = await request('/api/orders/options?region=eu');
  assert.equal(euOptions.response.status, 200);
  assert.equal(euOptions.body.delivery.some((item) => item.id === 'gls_parcelshop'), true);

  const product = await createProduct({
    title: 'Phone with regional delivery',
    price: 1000,
    stock: 2,
    region: 'pl',
    delivery: 'both',
  });
  const buyer = await registerAndLogin('fulfillment-buyer');
  const missingPoint = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: {
      items: [{ id: product.id, qty: 1 }],
      checkout: { deliveryOption: 'inpost_locker', paymentMethod: 'card' },
    },
  });
  assert.equal(missingPoint.response.status, 400);
  assert.equal(missingPoint.body.code, 'DELIVERY_POINT_REQUIRED');

  const created = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: {
      items: [{ id: product.id, qty: 1 }],
      checkout: {
        customerName: 'Anna Nowak',
        phone: '+48123123123',
        email: 'anna@example.com',
        city: 'Warszawa',
        deliveryPoint: 'WAW01M',
        deliveryOption: 'inpost_locker',
        paymentMethod: 'blik',
      },
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.shipping, 14.99);
  assert.equal(created.body.total, 1014.99);
  assert.equal(created.body.checkout.deliveryCarrier, 'InPost');
  assert.equal(created.body.checkout.deliveryKind, 'point');
  assert.equal(created.body.checkout.paymentMethod, 'blik');
  assert.equal(created.body.checkout.paymentStatus, 'awaiting_payment');
  assert.equal(created.body.checkout.packageCount, 1);
});

test('regional promo codes are calculated on the server and can be used once per user', async () => {
  const product = await createProduct({
    title: 'Promo eligible accessory',
    price: 100,
    stock: 3,
    region: 'pl',
    condition: 'new',
  });
  const buyer = await registerAndLogin('promo-buyer');
  const usedProduct = await createProduct({
    title: 'Used item outside discount scope',
    price: 120,
    stock: 1,
    region: 'pl',
    condition: 'used',
  });
  const checkout = {
    customerName: 'Jan Kowalski',
    phone: '+48123123123',
    email: 'jan@example.com',
    deliveryMethod: 'shipping',
    address: 'Testowa 1, Warszawa',
    comment: 'Please call before delivery',
  };

  const rejectedUsedDiscount = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: usedProduct.id, qty: 1 }], promoCode: 'STARTPL10', ...checkout },
  });
  assert.equal(rejectedUsedDiscount.response.status, 400);
  assert.equal(rejectedUsedDiscount.body.code, 'PROMO_NOT_APPLICABLE');

  const discounted = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: product.id, qty: 1 }], promoCode: 'startpl10', ...checkout },
  });
  assert.equal(discounted.response.status, 201);
  assert.equal(discounted.body.subtotal, 100);
  assert.equal(discounted.body.discount, 10);
  assert.equal(discounted.body.shipping, 19.99);
  assert.equal(discounted.body.total, 109.99);
  assert.equal(discounted.body.promoCode, 'STARTPL10');
  assert.equal(discounted.body.checkout.customerName, 'Jan Kowalski');
  assert.equal(discounted.body.checkout.deliveryMethod, 'shipping');

  const reused = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: product.id, qty: 1 }], promoCode: 'STARTPL10', ...checkout },
  });
  assert.equal(reused.response.status, 400);
  assert.equal(reused.body.code, 'INVALID_PROMO_CODE');
});

test('buyers and sellers can exchange protected product messages', async () => {
  const product = await createProduct({ title: 'Chat enabled laptop', stock: 1 });
  const buyer = await registerAndLogin('chat-buyer');
  const stranger = await registerAndLogin('chat-stranger');

  const opened = await request('/api/chats', {
    method: 'POST',
    token: buyer.token,
    body: { productId: product.id },
  });
  assert.equal(opened.response.status, 201);
  assert.equal(opened.body.productId, product.id);
  assert.equal(opened.body.buyerId, buyer.user.id);

  const sent = await request(`/api/chats/${opened.body.id}/messages`, {
    method: 'POST',
    token: buyer.token,
    body: { body: 'Czy laptop ma oryginalną ładowarkę?' },
  });
  assert.equal(sent.response.status, 201);
  assert.equal(sent.body.senderId, buyer.user.id);

  const sellerInbox = await request('/api/chats', { token: adminToken });
  assert.equal(sellerInbox.response.status, 200);
  assert.equal(
    sellerInbox.body.some((chat) => chat.id === opened.body.id),
    true
  );

  const sellerRead = await request(`/api/chats/${opened.body.id}/messages`, { token: adminToken });
  assert.equal(sellerRead.response.status, 200);
  assert.equal(sellerRead.body.messages[0].body, 'Czy laptop ma oryginalną ładowarkę?');

  const sellerCannotDelete = await request(
    `/api/chats/${opened.body.id}/messages/${sent.body.id}`,
    {
      method: 'DELETE',
      token: adminToken,
    }
  );
  assert.equal(sellerCannotDelete.response.status, 403);

  const removedMessage = await request(`/api/chats/${opened.body.id}/messages/${sent.body.id}`, {
    method: 'DELETE',
    token: buyer.token,
  });
  assert.equal(removedMessage.response.status, 200);
  const afterDelete = await request(`/api/chats/${opened.body.id}/messages`, {
    token: buyer.token,
  });
  assert.equal(afterDelete.body.messages.length, 0);

  const priceOffer = await request(`/api/chats/${opened.body.id}/offers`, {
    method: 'POST',
    token: buyer.token,
    body: { amount: 2200 },
  });
  assert.equal(priceOffer.response.status, 201);
  assert.equal(priceOffer.body.amount, 2200);

  const accepted = await request(`/api/chats/${opened.body.id}/offers/${priceOffer.body.id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { action: 'accept' },
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.body.status, 'accepted');

  const negotiatedOrder = await request('/api/orders', {
    method: 'POST',
    token: buyer.token,
    body: { items: [{ id: product.id, qty: 1 }] },
  });
  assert.equal(negotiatedOrder.response.status, 201);
  assert.equal(negotiatedOrder.body.total, 2200);
  assert.equal(negotiatedOrder.body.items[0].negotiated, true);
  assert.equal(negotiatedOrder.body.items[0].listPrice, 2499.5);

  for (const status of ['confirmed', 'shipped', 'delivered', 'completed']) {
    const updatedStatus = await request(`/api/orders/${negotiatedOrder.body.id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status },
    });
    assert.equal(updatedStatus.response.status, 200);
    assert.equal(updatedStatus.body.status, status);
  }

  const reviewEligibility = await request(
    `/api/trust/products/${product.id}/review-eligibility`,
    { token: buyer.token }
  );
  assert.equal(reviewEligibility.response.status, 200);
  assert.equal(reviewEligibility.body.eligible, true);
  assert.equal(reviewEligibility.body.orderId, negotiatedOrder.body.id);

  const review = await request('/api/trust/reviews', {
    method: 'POST',
    token: buyer.token,
    body: {
      orderId: negotiatedOrder.body.id,
      productId: product.id,
      rating: 5,
      comment: 'Wszystko zgodne z opisem.',
    },
  });
  assert.equal(review.response.status, 201);

  const eligibilityAfterReview = await request(
    `/api/trust/products/${product.id}/review-eligibility`,
    { token: buyer.token }
  );
  assert.equal(eligibilityAfterReview.response.status, 200);
  assert.equal(eligibilityAfterReview.body.eligible, false);
  assert.equal(eligibilityAfterReview.body.reason, 'already_reviewed');

  const ratedProduct = await request(`/api/products/${product.id}`);
  assert.equal(ratedProduct.response.status, 200);
  assert.equal(ratedProduct.body.sellerRating, 5);
  assert.equal(ratedProduct.body.sellerReviewCount, 1);
  assert.equal(ratedProduct.body.sellerVerified, true);

  const verified = await request(`/api/trust/users/${stranger.user.id}/verification`, {
    method: 'PATCH',
    token: adminToken,
    body: { verified: true },
  });
  assert.equal(verified.response.status, 200);
  assert.equal(verified.body.verificationStatus, 'verified');

  const forbidden = await request(`/api/chats/${opened.body.id}/messages`, {
    token: stranger.token,
  });
  assert.equal(forbidden.response.status, 404);
});

test('daily mini-games issue server-side personal promo codes', async () => {
  const product = await createProduct({
    title: 'Reward test device',
    price: 200,
    stock: 3,
    region: 'pl',
    condition: 'new',
  });
  const player = await registerAndLogin('reward-player');
  const intruder = await registerAndLogin('reward-intruder');

  const spin = await request('/api/rewards/spin', {
    method: 'POST',
    token: player.token,
    body: { region: 'pl' },
  });
  assert.equal(spin.response.status, 200);
  assert.equal(spin.body.won, true);
  assert.match(spin.body.rewardCode, /^SPIN-[A-F0-9]{8}$/);
  assert.equal(spin.body.rewardType, 'shipping');
  assert.equal(spin.body.percent, 0);
  assert.equal(spin.body.giftKey, null);
  assert.equal(spin.body.maxDiscountCents, 2000);
  assert.equal(spin.body.currency, 'PLN');
  assert.equal(spin.body.expiresInDays, 7);
  assert.ok(spin.body.expiresAt > Date.now());

  const stolen = await request('/api/orders', {
    method: 'POST',
    token: intruder.token,
    body: { items: [{ id: product.id, qty: 1 }], promoCode: spin.body.rewardCode },
  });
  assert.equal(stolen.response.status, 400);
  assert.equal(stolen.body.code, 'INVALID_PROMO_CODE');

  const usedRewardProduct = await createProduct({ title: 'Used reward exclusion', condition: 'used', price: 200, stock: 3 });
  for (const items of [[{ id: usedRewardProduct.id, qty: 1 }], [{ id: usedRewardProduct.id, qty: 1 }, { id: product.id, qty: 1 }]]) {
    const rejected = await request('/api/orders', { method: 'POST', token: player.token, body: { items, promoCode: spin.body.rewardCode } });
    assert.equal(rejected.response.status, 400);
    assert.equal(rejected.body.code, 'PROMO_NOT_APPLICABLE');
  }

  const rewardedOrder = await request('/api/orders', {
    method: 'POST',
    token: player.token,
    body: {
      items: [{ id: product.id, qty: 1 }],
      promoCode: spin.body.rewardCode,
      deliveryMethod: 'shipping',
    },
  });
  assert.equal(rewardedOrder.response.status, 201);
  if (spin.body.rewardType === 'shipping') {
    assert.equal(rewardedOrder.body.shippingDiscount, 19.99);
  } else {
    assert.equal(rewardedOrder.body.discount > 0, true);
    assert.equal(spin.body.percent <= 10, true);
  }

  const repeatedSpin = await request('/api/rewards/spin', {
    method: 'POST',
    token: player.token,
    body: { region: 'pl' },
  });
  assert.equal(repeatedSpin.response.status, 409);
  assert.equal(repeatedSpin.body.code, 'DAILY_ATTEMPT_USED');

  const legacyQuiz = await request('/api/rewards/quiz', { method: 'POST', token: player.token, body: { region: 'pl', answer: 'ssd' } });
  assert.equal(legacyQuiz.response.status, 400);
  const dailyQuiz = await request('/api/rewards/quiz?language=en', { token: player.token });
  const correctAnswers = { storage: 'ssd', refresh: 'refresh', usb: 'usb-c', battery: 'cool', oled: 'oled', ram: 'active', ip68: 'water', nfc: 'nfc', wifi6: 'wireless', gpu: 'gpu', resolution: '4k', backup: 'backup', hdmi: 'hdmi', cores: 'units', 'used-phone': 'imei' };
  const fullAnswers = dailyQuiz.body.questions.map((question) => ({ questionId: question.id, answer: correctAnswers[question.id] }));
  const incompleteQuiz = await request('/api/rewards/quiz', { method: 'POST', token: player.token, body: { region: 'pl', answers: fullAnswers.slice(0, 7) } });
  assert.equal(incompleteQuiz.response.status, 400);
  const quiz = await request('/api/rewards/quiz', {
    method: 'POST',
    token: player.token,
    body: { region: 'pl', answers: fullAnswers },
  });
  assert.equal(quiz.response.status, 200);
  assert.equal(quiz.body.percent, 10);
  assert.equal(quiz.body.maxDiscountCents, 30000);
  assert.equal(quiz.body.giftKey, null);
  assert.match(quiz.body.rewardCode, /^QUIZ-[A-F0-9]{8}$/);
  const expensiveRewardProduct = await createProduct({ title: 'Reward cap device', condition: 'new', price: 9999, stock: 2 });
  const cappedOrder = await request('/api/orders', { method: 'POST', token: player.token, body: { items: [{ id: expensiveRewardProduct.id, qty: 1 }], promoCode: quiz.body.rewardCode } });
  assert.equal(cappedOrder.response.status, 201);
  assert.equal(cappedOrder.body.discount, 300);
  assert.equal(cappedOrder.body.rewardGift, null);
  const reusedCode = await request('/api/orders', { method: 'POST', token: player.token, body: { items: [{ id: expensiveRewardProduct.id, qty: 1 }], promoCode: quiz.body.rewardCode } });
  assert.equal(reusedCode.response.status, 400);


  const usedQuiz = await request('/api/rewards/quiz?language=pl', {
    token: player.token,
  });
  assert.equal(usedQuiz.response.status, 200);
  assert.equal(usedQuiz.body.attempted, true);
  assert.equal(usedQuiz.body.previousResult.rewardCode, quiz.body.rewardCode);

  const localizedQuestion = await request('/api/rewards/quiz?language=uk', {
    token: intruder.token,
  });
  assert.equal(localizedQuestion.response.status, 200);
  assert.equal(localizedQuestion.body.total, 8);
  assert.equal(localizedQuestion.body.requiredCorrect, 7);
  assert.match(localizedQuestion.body.questions[0].prompt, /[А-Яа-яІіЇїЄє]/);
  assert.equal(Array.isArray(localizedQuestion.body.questions[0].options), true);
  const sevenAnswers = localizedQuestion.body.questions.map((question, index) => ({ questionId: question.id, answer: index ? correctAnswers[question.id] : question.options.find((option) => option.value !== correctAnswers[question.id]).value }));
  const sevenQuiz = await request('/api/rewards/quiz', { method: 'POST', token: intruder.token, body: { region: 'pl', answers: sevenAnswers } });
  assert.equal(sevenQuiz.response.status, 200);
  assert.equal(sevenQuiz.body.correct, 7);
  assert.equal(sevenQuiz.body.percent, 5);
  assert.equal(sevenQuiz.body.maxDiscountCents, 15000);
  const euShipping = await request('/api/rewards/spin', { method: 'POST', token: intruder.token, body: { region: 'eu' } });
  assert.equal(euShipping.body.maxDiscountCents, 800);
  const euProduct = await createProduct({ title: 'EU delivery cap', region: 'eu', currency: 'EUR', condition: 'new', stock: 2 });
  const euOrder = await request('/api/orders', { method: 'POST', token: intruder.token, body: { items: [{ id: euProduct.id, qty: 1 }], promoCode: euShipping.body.rewardCode, checkout: { paymentMethod: 'card', deliveryMethod: 'shipping' } } });
  assert.equal(euOrder.response.status, 201);
  assert.ok(euOrder.body.shipping > 8);
  assert.equal(euOrder.body.shippingDiscount, 8);


  const ticTacToe = await request('/api/rewards/tictactoe', {
    method: 'POST',
    token: player.token,
    body: {
      region: 'pl',
      board: ['X', 'O', null, 'X', 'O', null, 'X', null, null],
    },
  });
  assert.equal(ticTacToe.response.status, 200);
  assert.equal(ticTacToe.body.percent <= 10, true);
  assert.match(ticTacToe.body.rewardCode, /^TTT-[A-F0-9]{8}$/);
});
