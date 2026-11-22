const { AppError } = require('../utils/errors');

function publicUser(user) {
  return {
    id: user.id, username: user.username, role: user.role,
    displayName: user.displayName || '', email: user.email || '',
    phone: user.phone || '', city: user.city || '', address: user.address || '',
    avatar: user.avatar || '', accountStatus: user.accountStatus || 'active',
    verificationStatus: user.verificationStatus || 'unverified',
    verified: user.verificationStatus === 'verified',
    verifiedAt: user.verifiedAt || null, createdAt: user.createdAt,
  };
}

function profileFields(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'INVALID_PROFILE', 'Profile must be an object');
  }
  const result = {};
  const limits = { displayName: 80, email: 254, phone: 30, city: 80, address: 200 };
  for (const [key, max] of Object.entries(limits)) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || body[key].trim().length > max) {
      throw new AppError(400, 'INVALID_PROFILE', 'Invalid profile field', [{ field: key }]);
    }
    result[key] = body[key].trim();
  }
  if (result.email !== undefined) {
    result.email = result.email.toLowerCase();
    if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) {
      throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address');
    }
    result.email ||= null;
  }
  if (result.phone && !/^[+\d\s().-]{6,30}$/.test(result.phone)) {
    throw new AppError(400, 'INVALID_PHONE', 'Enter a valid phone number');
  }
  return result;
}

module.exports = { publicUser, profileFields };
