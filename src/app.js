const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const listEndpoints = require('express-list-endpoints');

const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// 1️⃣ D'ABORD LES MIDDLEWARES DE SÉCURITÉ
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // ← POUR LES IMAGES
}));

// 2️⃣ CONFIGURATION CORS
app.use(cors({
    origin: ['https://evolyx-frontend-e-commerce.vercel.app','http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3️⃣ MIDDLEWARES STANDARD
app.use(express.json());
app.use(morgan('dev'));

// 4️⃣ SERVIR LES FICHIERS STATIQUES AVEC BONNES EN-TÊTES
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// 5️⃣ MONTER LES ROUTES API (UNE SEULE FOIS !)
app.use('/api', routes);

// 6️⃣ MIDDLEWARE ERROR HANDLER (TOUJOURS EN DERNIER)
app.use(errorHandler);

// DÉBOGAGE : lister les routes
console.log('✅ Routes montées:');
console.log(listEndpoints(app).map(endpoint => 
  `${endpoint.methods.join(', ')} ${endpoint.path}`
).join('\n'));

module.exports = app;