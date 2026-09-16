require('./config/loadEnv');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');
const { corsOptions, reflectOrigin } = require('./config/cors');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Diagnostic temporaire : quelles dépendances cassent sur Vercel
app.get('/api/boot-check', (req, res) => {
  const checks = {};
  const probes = [
    ['legal', () => require('./routes/public/legal')],
    ['categories', () => require('./routes/public/categories')],
    ['products', () => require('./routes/public/products')],
    ['orders', () => require('./routes/public/orders')],
    ['admin-auth', () => require('./routes/admin/auth')],
    ['admin', () => require('./routes/admin')],
    ['pdfkit', () => require('pdfkit')],
    ['bcryptjs', () => require('bcryptjs')],
    ['cloudinary', () => require('./config/cloudinary')],
  ];
  for (const [name, load] of probes) {
    try {
      load();
      checks[name] = 'ok';
    } catch (err) {
      checks[name] = err && err.message ? err.message : String(err);
    }
  }
  res.json({ ok: Object.values(checks).every((v) => v === 'ok'), checks });
});

app.use('/uploads', (req, res, next) => {
  reflectOrigin(req, res);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/api', require('./routes'));

app.use(errorHandler);

module.exports = app;
