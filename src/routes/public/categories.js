const router = require('express').Router();
const categoryService = require('../../services/categoryService');
const productService = require('../../services/productService');
 
// ✅ GET toutes les catégories
router.get('/', async (req, res, next) => {
  try {
    const categories = await categoryService.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// ✅ GET une catégorie par ID
router.get('/:id', async (req, res, next) => {
  try {
    const category = await categoryService.getOneCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie non trouvée" });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// ✅ GET produits d'une catégorie
router.get('/:id/products', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const products = await productService.getProductsByCategory(req.params.id, page, limit);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

module.exports = router;