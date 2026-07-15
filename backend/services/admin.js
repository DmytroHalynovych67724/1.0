const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function readAdminConfig({ allowDevelopmentDefault = false } = {}) {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  let isDevelopmentDefault = false;

  if (!password && allowDevelopmentDefault && process.env.NODE_ENV !== 'production') {
    password = 'admin123';
    isDevelopmentDefault = true;
  }
  if (!password) return null;

  if (username.length < 3 || username.length > 40 || !/^[\p{L}\p{N}._-]+$/u.test(username)) {
    throw new Error('ADMIN_USERNAME must contain 3 to 40 supported characters');
  }

  const normalizedPassword = password.toLowerCase();
  const knownWeakPassword = new Set([
    'admin123',
    'administrator',
    'changeme123',
    'password123',
    'replace-with-a-strong-admin-password',
  ]).has(normalizedPassword);
  if (!isDevelopmentDefault && (Buffer.byteLength(password, 'utf8') < 12 || knownWeakPassword)) {
    throw new Error('ADMIN_PASSWORD must be a non-placeholder value of at least 12 bytes');
  }

  return { username, password, isDevelopmentDefault };
}

async function ensureAdmin(db, options = {}) {
  const config = readAdminConfig(options);
  if (!config) return { created: false, updated: false, skipped: true };

  if (config.isDevelopmentDefault) {
    console.warn('Using development demo admin credentials admin / admin123');
  }

  const existing = db
    .prepare('SELECT id, username, password, role FROM users WHERE username = ? COLLATE NOCASE')
    .get(config.username);

  if (!existing) {
    let id = 'admin1';
    if (db.prepare('SELECT id FROM users WHERE id = ?').get(id)) id = uuidv4();
    const hash = await bcrypt.hash(config.password, 12);
    db.prepare(
      `
      INSERT INTO users (id, username, password, role, verificationStatus, verifiedAt, createdAt)
      VALUES (?, ?, ?, 'admin', 'verified', ?, ?)
    `
    ).run(id, config.username, hash, Date.now(), Date.now());
    return { created: true, updated: false, skipped: false, username: config.username };
  }

  if (config.isDevelopmentDefault) {
    if (existing.role !== 'admin') {
      throw new Error(
        `Cannot create demo admin: username ${config.username} belongs to a regular user; set explicit ADMIN_PASSWORD`
      );
    }
    return {
      created: false,
      updated: false,
      skipped: false,
      username: config.username,
    };
  }

  let passwordMatches = false;
  try {
    passwordMatches = await bcrypt.compare(config.password, existing.password);
  } catch (_error) {
    passwordMatches = false;
  }
  const needsUpdate = existing.role !== 'admin' || !passwordMatches;
  if (needsUpdate) {
    const hash = passwordMatches ? existing.password : await bcrypt.hash(config.password, 12);
    db.prepare(
      `
      UPDATE users
      SET password = ?, role = 'admin', verificationStatus = 'verified', verifiedAt = COALESCE(verifiedAt, ?), updatedAt = ?
      WHERE id = ?
    `
    ).run(hash, Date.now(), Date.now(), existing.id);
  }

  return {
    created: false,
    updated: needsUpdate,
    skipped: false,
    username: config.username,
  };
}

async function bootstrapAdminFromEnv(db) {
  if (!process.env.ADMIN_PASSWORD) return { created: false, updated: false, skipped: true };
  return ensureAdmin(db);
}

module.exports = { bootstrapAdminFromEnv, ensureAdmin, readAdminConfig };
