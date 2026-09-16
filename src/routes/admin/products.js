const router = require('express').Router();
const multer = require('multer');
const { cloudinary, uploadImageBuffer } = require('../../config/cloudinary');
const service = require('../../services/productService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Seules les images jpeg, png, gif ou webp sont autorisées'));
  },
});

function multerErrorHandler(err, _req, res, next) {
  if (!err) return next();
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image trop lourde (max 8 Mo)' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (/images sont autorisées/i.test(String(err.message || ''))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  return next(err);
}

// Création produit (JSON) — les images passent par POST /:id/images
router.post('/', async (req, res, next) => {
  try {
    const product = await service.createProduct(req.body, []);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const product = await service.updateProduct(req.params.id, req.body, []);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await service.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/images', upload.single('image'), multerErrorHandler, async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Aucune image fournie' });
    }

    const uploaded = await uploadImageBuffer(req.file.buffer, req.file.originalname);
    const isMain = req.body.is_main === 'true';
    const image = await service.addProductImage(req.params.id, uploaded, isMain);
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    console.error('Erreur upload:', err.message || err);
    next(err);
  }
});

router.delete('/images/:imageId', async (req, res, next) => {
  try {
    const image = await service.getImageById(req.params.imageId);
    if (image && image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }
    await service.deleteProductImage(req.params.imageId);
    res.json({ success: true, message: 'Image supprimée' });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const filters = {};
    if (req.query.category_id) filters.category_id = parseInt(req.query.category_id, 10);
    if (req.query.stock_min !== undefined) filters.stock_min = parseInt(req.query.stock_min, 10);
    if (req.query.stock_max !== undefined) filters.stock_max = parseInt(req.query.stock_max, 10);

    const result = await service.getAdminProducts(filters, page, limit);
    res.json({
      success: true,
      data: {
        products: result.products,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await service.getOneProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
