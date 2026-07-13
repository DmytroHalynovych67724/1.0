const path = require('path');
const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { initDB } = require('./db');

const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ecommerce-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

app.get('/api', (_req, res) => {
  res.json({ message: 'API ready', routes: ['/api/health', '/api/products', '/api/auth'] });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

async function setup() {
  await initDB();
}

module.exports = { app, setup };
