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

app.use('/uploads', (req, res, next) => {
  reflectOrigin(req, res);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, '../uploads')));

app.use('/api', (req, res, next) => {
  try {
    require('./routes')(req, res, next);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

module.exports = app;
