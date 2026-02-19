const router = require('express').Router();
const service = require('../../services/productService');

// ✅ UNIQUEMENT des routes GET en public
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await service.getProductsPaginated(page, limit);
    res.json({ 
      success: true,
      data: result.products,   
      total: result.total,    
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages });
  } catch (err) {
    next(err);
  }
});

// Ajouter cette route dans votre fichier de routes produits
router.get('/search', async (req, res, next) => {
    try {
        const { q } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        
        // if (!q || q.length < 2) {
        //     return res.json({ success: true, data: [], message: "Requête trop courte" });
        // }
        
        const products = await service.searchProducts(q, page, limit);
        res.json({ success: true, data: products });
    } catch (err) {
        next(err);
    }
});

router.get('/featured', async (req, res, next) => {
  try {
    const products = await service.getFeaturedProducts();
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await service.getOneProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produit non trouvé" });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.get('/category/:categoryId', async (req, res, next) => {
  try {
    const products = await service.getProductsByCategory(req.params.categoryId);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

// ✅ Route pour les images (lecture uniquement)
router.get('/:id/images', async (req, res, next) => {
  try {
    const images = await service.getProductImages(req.params.id);
    res.json({ success: true, data: images });
  } catch (err) {
    next(err);
  }
});

module.exports = router;