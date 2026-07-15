const path = require('path');
const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { getCorsOptions, getJwtSecret } = require('./config');
const { initDB } = require('./db');
const { bootstrapAdminFromEnv } = require('./services/admin');
const { AppError, sendError } = require('./utils/errors');

const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const chatsRouter = require('./routes/chats');
const trustRouter = require('./routes/trust');
const rewardsRouter = require('./routes/rewards');
const marketplaceRouter = require('./routes/marketplace');
const deviceSpecsRouter = require('./routes/deviceSpecs');

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
app.use(cors(getCorsOptions()));
app.use(morgan('dev'));
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
const frontendRoot = path.join(__dirname, '..', 'frontend');
const frontendDist = path.join(frontendRoot, 'dist');
app.use('/assets', express.static(path.join(frontendRoot, 'assets')));
app.use(express.static(frontendDist));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    sendError(res, 429, 'RATE_LIMITED', 'Too many requests; please try again later');
  },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req, res) {
    sendError(
      res,
      429,
      'AUTH_RATE_LIMITED',
      'Too many authentication attempts; please try again later'
    );
  },
});
app.use('/api/', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'na-shary-api' });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/trust', trustRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/device-specs', deviceSpecsRouter);

app.get('/api', (_req, res) => {
  res.json({
    message: 'API ready',
    routes: [
      '/api/health',
      '/api/products',
      '/api/auth',
      '/api/orders',
      '/api/chats',
      '/api/trust',
      '/api/rewards',
      '/api/marketplace',
      '/api/device-specs',
    ],
  });
});

app.get(/^\/(?!api(?:\/|$)).*/, (_req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((_req, res) => {
  sendError(res, 404, 'ROUTE_NOT_FOUND', 'Route not found');
});

app.use((error, _req, res, _next) => {
  void _next;
  if (error instanceof AppError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }
  if (error && error.type === 'entity.too.large') {
    return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'Request payload is too large');
  }
  if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return sendError(res, 400, 'INVALID_JSON', 'Request body contains invalid JSON');
  }
  if (error && error.message === 'Origin is not allowed by CORS') {
    return sendError(res, 403, 'CORS_ORIGIN_DENIED', 'Request origin is not allowed');
  }

  console.error('Unhandled request error', error);
  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected server error occurred');
});

async function setup() {
  getJwtSecret();
  const db = initDB();
  await bootstrapAdminFromEnv(db);
  return db;
}

module.exports = { app, setup };
