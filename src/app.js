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
app.use(express.json({ limit: '200kb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/boot-check', (req, res) => {
  if (isProd) {
    const expected = process.env.BOOT_CHECK_SECRET;
    const provided = req.get('x-boot-secret') || req.query.secret;
    if (!expected || provided !== expected) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
  }
  const checks = {};
  const probes = [
    ['legal', () => require('./routes/public/legal')],
    ['categories', () => require('./routes/public/categories')],
    ['products', () => require('./routes/public/products')],
    ['orders', () => require('./routes/public/orders')],
    ['routes', () => require('./routes')],
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
      checks[name] = isProd ? 'error' : (err && err.message ? err.message : String(err));
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

let apiRouter;
app.use('/api', (req, res, next) => {
  try {
    if (!apiRouter) apiRouter = require('./routes');
    return apiRouter(req, res, next);
  } catch (err) {
    return next(err);
  }
});

app.use(errorHandler);

module.exports = app;
