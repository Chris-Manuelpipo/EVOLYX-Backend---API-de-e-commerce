const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const service = require('../../services/productService');

// Configuration multer pour les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// CRUD Produits avec images
router.post('/', upload.array('images', 5), async (req, res, next) => {
  try {
    const product = await service.createProduct(req.body, req.files || []);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', upload.array('images', 5), async (req, res, next) => {
  try {
    const product = await service.updateProduct(req.params.id, req.body, req.files || []);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteProduct(req.params.id);
    res.json({ success: true, message: "Produit supprimé" });
  } catch (err) {
    next(err);
  }
});

// Routes pour les images
router.post('/:id/images', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucune image fournie" });
    }
    
    const isMain = req.body.is_main === 'true';
    const image = await service.addProductImage(req.params.id, req.file, isMain);
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    next(err);
  }
});

router.delete('/images/:imageId', async (req, res, next) => {
  try {
    await service.deleteProductImage(req.params.imageId);
    res.json({ success: true, message: "Image supprimée" });
  } catch (err) {
    next(err);
  }
});

// route pour lister les produits en admin


router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // ✅ Extraire les filtres
    const filters = {};
    
    if (req.query.category_id) {
      filters.category_id = parseInt(req.query.category_id);
    }
    
    if (req.query.stock_min !== undefined) {
      filters.stock_min = parseInt(req.query.stock_min);
    }
    
    if (req.query.stock_max !== undefined) {
      filters.stock_max = parseInt(req.query.stock_max);
    }
    
    const result = await service.getAdminProducts(filters, page, limit);
    
    res.json({ 
      success: true, 
      data: {
        products: result.products,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await service.getOneProduct(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;