const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_AUDIENCE, JWT_ISSUER, getJwtSecret } = require('../config');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateCredentials } = require('../utils/validation');
const { publicUser, profileFields } = require('../services/accounts');

const router = express.Router();
const DUMMY_PASSWORD_HASH = '$2a$12$dv4r2lGXvNb5HkJx5UUiEu5MrhVZePPPtTdq1nCVaHd2SR7/VW0h6';

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, password } = validateCredentials(req.body, { registration: true });
    const profile = profileFields(req.body);
    const db = getDB();
    const existing = await db
      .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
      .get(username);
    if (existing) throw new AppError(409, 'USERNAME_TAKEN', 'Username is already registered');

    const id = uuidv4();
    const createdAt = Date.now();
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      await db
        .prepare(
          "INSERT INTO users (id, username, password, role, displayName, email, createdAt) VALUES (?, ?, ?, 'user', ?, ?, ?)"
        )
        .run(id, username, passwordHash, profile.displayName || '', profile.email || null, createdAt);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique/i.test(error.message || '')) {
        throw new AppError(409, 'ACCOUNT_EXISTS', 'Username or email is already registered');
      }
      throw error;
    }

    return res.status(201).json({
      user: publicUser({ id, username, role: 'user', ...profile, createdAt }),
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const password = req.body?.password;
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    if (!username || username.length > 254 || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Enter your login and password');
    }
    const user = await getDB()
      .prepare(
        'SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE'
      )
      .get(username, username);

    const validPassword = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_PASSWORD_HASH
    );
    if (!user || !validPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }
    if (user.accountStatus !== 'active') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
    }

    const token = jwt.sign(
      { sub: user.id, version: user.sessionVersion },
      getJwtSecret(),
      {
        algorithm: 'HS256',
        audience: JWT_AUDIENCE,
        expiresIn: '8h',
        issuer: JWT_ISSUER,
      }
    );

    return res.json({ token, expiresIn: 8 * 60 * 60, user: publicUser(user) });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = profileFields(req.body);
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : null;
    const validRemote = avatar === '' || /^https?:\/\/[^\s]{1,2000}$/i.test(avatar || '');
    const validData =
      /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(avatar || '') &&
      Buffer.byteLength(avatar, 'utf8') <= 1_000_000;
    if (req.body?.avatar !== undefined && (avatar === null || (!validRemote && !validData))) {
      throw new AppError(
        400,
        'INVALID_AVATAR',
        'Avatar must be a supported image smaller than 1 MB'
      );
    }
    const db = getDB();
    const fields = Object.entries(profile);
    if (avatar !== null) fields.push(['avatar', avatar]);
    if (!fields.length) throw new AppError(400, 'INVALID_PROFILE', 'No profile fields supplied');
    try {
      await db.prepare(`UPDATE users SET ${fields.map(([key]) => key + ' = ?').join(', ')}, updatedAt = ? WHERE id = ?`)
        .run(...fields.map(([, value]) => value), Date.now(), req.user.id);
    } catch (error) {
      if (/unique/i.test(error.message || '')) throw new AppError(409, 'EMAIL_TAKEN', 'Email is already registered');
      throw error;
    }
    const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(updated) });
  })
);

router.post('/password', requireAuth, asyncHandler(async (req, res) => {
  const password = req.body?.newPassword;
  validateCredentials({ username: req.user.username, password }, { registration: true });
  const current = req.body?.currentPassword;
  if (typeof current !== 'string' || Buffer.byteLength(current, 'utf8') > 72) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Current password is required');
  }
  const db = getDB();
  const row = await db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(current, row.password))) {
    throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect');
  }
  if (current === password) throw new AppError(400, 'PASSWORD_UNCHANGED', 'Choose a different password');
  const hash = await bcrypt.hash(password, 12);
  const result = await db.prepare('UPDATE users SET password = ?, sessionVersion = sessionVersion + 1, updatedAt = ? WHERE id = ? AND password = ?')
    .run(hash, Date.now(), req.user.id, row.password);
  if (!result.changes) throw new AppError(409, 'ACCOUNT_CHANGED', 'Account changed; sign in again');
  res.json({ ok: true, signInRequired: true });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  await getDB().prepare('UPDATE users SET sessionVersion = sessionVersion + 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
}));

module.exports = router;
