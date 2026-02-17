const router = require('express').Router();
const controller = require('../../controllers/variationController');

// Routes publiques (lecture seule)
router.get('/', controller.getVariations);
router.get('/product/:productId', controller.getVariationsByProduct);
router.get('/product/:productId/colors', controller.getAvailableColors);
router.get('/product/:productId/sizes', controller.getAvailableSizes);
router.get('/:id', controller.getVariationById);
router.get('/:id/check-stock', controller.checkStock);

module.exports = router;