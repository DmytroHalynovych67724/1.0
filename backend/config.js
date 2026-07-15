const crypto = require('crypto');

const JWT_ISSUER = 'na-shary-api';
const JWT_AUDIENCE = 'na-shary-web';

let developmentSecret;
let warnedAboutDevelopmentSecret = false;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getJwtSecret() {
  const configuredSecret = (process.env.JWT_SECRET || '').trim();
  const knownWeakSecrets = new Set([
    'change_this_secret',
    'change-me',
    'secret',
    'your-secret-key',
  ]);
  const isStrongEnough = Buffer.byteLength(configuredSecret, 'utf8') >= 32;
  const normalizedSecret = configuredSecret.toLowerCase();
  const isKnownWeak =
    knownWeakSecrets.has(normalizedSecret) ||
    normalizedSecret.includes('replace-with') ||
    normalizedSecret.includes('placeholder');

  if (configuredSecret && isStrongEnough && !isKnownWeak) {
    return configuredSecret;
  }

  if (isProduction()) {
    throw new Error('JWT_SECRET must be set to a unique value of at least 32 bytes in production');
  }

  if (!developmentSecret) {
    developmentSecret = crypto.randomBytes(48).toString('base64url');
  }

  if (!warnedAboutDevelopmentSecret && process.env.NODE_ENV !== 'test') {
    warnedAboutDevelopmentSecret = true;
    console.warn('JWT_SECRET is missing or weak; using an ephemeral development secret');
  }

  return developmentSecret;
}

function getCorsOptions() {
  const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configuredOrigins.length) {
    return { origin: !isProduction() };
  }

  return {
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'));
    },
  };
}

module.exports = {
  JWT_AUDIENCE,
  JWT_ISSUER,
  getCorsOptions,
  getJwtSecret,
  isProduction,
};
