const router = require('express').Router();

const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const variationRoutes = require('./variations');
const orderRoutes = require('./orders');

router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/variations', variationRoutes);
router.use('/orders', orderRoutes);

router.get('/health', (req, res) => {
  res.json({ status: "API Running" });
});

module.exports = router;
