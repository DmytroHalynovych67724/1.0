const jwt = require('jsonwebtoken');
const { JWT_AUDIENCE, JWT_ISSUER, getJwtSecret } = require('../config');
const { getDB } = require('../db');
const { sendError } = require('../utils/errors');

function requireAuth(req, res, next) {
  const authorization = req.get('authorization');
  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return sendError(res, 401, 'AUTH_REQUIRED', 'Authentication is required');
  }

  const token = authorization.replace(/^Bearer\s+/i, '');
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
    });
    if (typeof payload.sub !== 'string' || !payload.sub) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid or expired');
    }

    const user = getDB()
      .prepare(
        'SELECT id, username, role, avatar, verificationStatus, verifiedAt, createdAt FROM users WHERE id = ?'
      )
      .get(payload.sub);
    if (!user) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid or expired');
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (_error) {
    return sendError(res, 401, 'INVALID_TOKEN', 'Authentication token is invalid or expired');
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return sendError(res, 403, 'ADMIN_REQUIRED', 'Administrator access is required');
  }
  return next();
}

module.exports = { requireAdmin, requireAuth };
