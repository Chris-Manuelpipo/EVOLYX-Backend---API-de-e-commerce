const router = require('express').Router();
const controller = require('../../controllers/variationController');
const adminAuth  = require('../../middleware/auth');

// Toutes les routes protégées
router.use(adminAuth);

// CRUD complet
router.post('/', controller.createVariation);
router.get('/', controller.getVariations);
router.get('/product/:productId', controller.getVariationsByProduct);
router.get('/:id', controller.getVariationById);
router.put('/:id', controller.updateVariation);
router.patch('/:id/stock', controller.updateStock);
router.delete('/:id', controller.deleteVariation);

// Routes utilitaires
router.get('/product/:productId/colors', controller.getAvailableColors);
router.get('/product/:productId/sizes', controller.getAvailableSizes);
router.get('/:id/check-stock', controller.checkStock);

module.exports = router;