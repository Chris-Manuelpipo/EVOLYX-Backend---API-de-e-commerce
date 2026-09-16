const router = require('express').Router();

router.use('/categories', require('./public/categories'));
router.use('/products', require('./public/products'));
router.use('/variations', require('./public/variations'));
router.use('/orders', require('./public/orders'));
router.use('/cart', require('./public/cart'));
router.use('/promos', require('./public/promos'));
router.use('/wishlist', require('./public/wishlist'));
router.use('/legal', require('./public/legal'));

// Admin (pdfkit, multer, etc.) chargé seulement sur /api/admin/*
router.use('/admin', (req, res, next) => {
  try {
    require('./admin')(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
