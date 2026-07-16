const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_AUDIENCE, JWT_ISSUER, getJwtSecret } = require('../config');
const { getDB } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../utils/errors');
const { validateCredentials } = require('../utils/validation');

const router = express.Router();
const DUMMY_PASSWORD_HASH = '$2a$12$dv4r2lGXvNb5HkJx5UUiEu5MrhVZePPPtTdq1nCVaHd2SR7/VW0h6';

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    avatar: user.avatar || '',
    verificationStatus: user.verificationStatus || 'unverified',
    verified: user.verificationStatus === 'verified',
    verifiedAt: user.verifiedAt || null,
    createdAt: user.createdAt,
  };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, password } = validateCredentials(req.body, { registration: true });
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
          'INSERT INTO users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
        .run(id, username, passwordHash, 'user', createdAt);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique/i.test(error.message || '')) {
        throw new AppError(409, 'USERNAME_TAKEN', 'Username is already registered');
      }
      throw error;
    }

    return res.status(201).json({
      user: publicUser({ id, username, role: 'user', createdAt }),
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = validateCredentials(req.body);
    const user = await getDB()
      .prepare(
        'SELECT id, username, password, role, avatar, verificationStatus, verifiedAt, createdAt FROM users WHERE username = ? COLLATE NOCASE'
      )
      .get(username);

    const validPassword = await bcrypt.compare(
      password,
      user ? user.password : DUMMY_PASSWORD_HASH
    );
    if (!user || !validPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
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
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : null;
    const validRemote = avatar === '' || /^https?:\/\/[^\s]{1,2000}$/i.test(avatar || '');
    const validData =
      /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(avatar || '') &&
      Buffer.byteLength(avatar, 'utf8') <= 1_000_000;
    if (avatar === null || (!validRemote && !validData)) {
      throw new AppError(
        400,
        'INVALID_AVATAR',
        'Avatar must be a supported image smaller than 1 MB'
      );
    }
    const db = getDB();
    await db
      .prepare('UPDATE users SET avatar = ?, updatedAt = ? WHERE id = ?')
      .run(avatar, Date.now(), req.user.id);
    const updated = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: publicUser(updated) });
  })
);

module.exports = router;
