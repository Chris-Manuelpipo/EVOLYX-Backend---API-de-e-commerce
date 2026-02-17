const router = require('express').Router();

// Route login (publique)
router.use('/', require('./auth'));

const protect = require('../../middleware/auth');

// Toutes les routes après sont protégées
router.use(protect);

router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/stats', require('./stats'));
router.use('/admins', require('./admins'));
router.use('/categories', require('./categories'));
router.use('/variations', require('./variations'));

module.exports = router;
