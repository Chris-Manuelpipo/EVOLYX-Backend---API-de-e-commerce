const router = require('express').Router();

const categoryRoutes = require('./public/categories');
const productRoutes = require('./public/products');
const variationRoutes = require('./public/variations');
const orderRoutes = require('./public/orders');
const cartRoutes = require('./public/cart');
const promoRoutes = require('./public/promos');
const wishlistRoutes = require('./public/wishlist');
const legalRoutes = require('./public/legal');
const adminRoutes = require('./admin');

router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/variations', variationRoutes);
router.use('/orders', orderRoutes);
router.use('/cart', cartRoutes);
router.use('/promos', promoRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/legal', legalRoutes);
router.use('/admin', adminRoutes);
router.get('/health', (req, res) => {
  res.json({ status: 'API Running' });
});

module.exports = router;
