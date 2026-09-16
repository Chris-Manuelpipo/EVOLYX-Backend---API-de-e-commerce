// const router = require('express').Router();
// const multer = require('multer');
// const path = require('path');
// const service = require('../../services/productService');

// // Configuration multer pour les images
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/products/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({ 
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = /jpeg|jpg|png|gif|webp/;
//     const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = allowedTypes.test(file.mimetype);
    
//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb(new Error('Seules les images sont autorisées'));
//     }
//   }
// });

// // CRUD Produits avec images
// router.post('/', upload.array('images', 5), async (req, res, next) => {
//   try {
//     const product = await service.createProduct(req.body, req.files || []);
//     res.status(201).json({ success: true, data: product });
//   } catch (err) {
//     next(err);
//   }
// });

// router.put('/:id', upload.array('images', 5), async (req, res, next) => {
//   try {
//     const product = await service.updateProduct(req.params.id, req.body, req.files || []);
//     res.json({ success: true, data: product });
//   } catch (err) {
//     next(err);
//   }
// });

// router.delete('/:id', async (req, res, next) => {
//   try {
//     await service.deleteProduct(req.params.id);
//     res.json({ success: true, message: "Produit supprimé" });
//   } catch (err) {
//     next(err);
//   }
// });

// // Routes pour les images
// router.post('/:id/images', upload.single('image'), async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: "Aucune image fournie" });
//     }
    
//     const isMain = req.body.is_main === 'true';
//     const image = await service.addProductImage(req.params.id, req.file, isMain);
//     res.status(201).json({ success: true, data: image });
//   } catch (err) {
//     next(err);
//   }
// });

// router.delete('/images/:imageId', async (req, res, next) => {
//   try {
//     await service.deleteProductImage(req.params.imageId);
//     res.json({ success: true, message: "Image supprimée" });
//   } catch (err) {
//     next(err);
//   }
// });

const router = require('express').Router();
const multer = require('multer');
const {cloudinary, storage } = require('../../config/cloudinary');
const service = require('../../services/productService');

const upload = multer({
  storage: storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype) {
      return cb(null, true);
    }
    cb(new Error('Seules les images sont autorisées'));
  }
});

// CRUD Produits avec images - MODIFIÉ
router.post('/', upload.array('images', 12), async (req, res, next) => {
  try {
    // ✅ Récupérer les URLs Cloudinary des fichiers uploadés
    const imageUrls = req.files ? req.files.map(file => ({
      url: file.path,        // URL Cloudinary
      public_id: file.filename // ID Cloudinary pour suppression
    })) : [];

    const product = await service.createProduct(req.body, imageUrls);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', upload.array('images', 12), async (req, res, next) => {
  try {
    const imageUrls = req.files ? req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    })) : [];

    const product = await service.updateProduct(req.params.id, req.body, imageUrls);
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

// Route pour upload d'image seule - MODIFIÉE
router.post('/:id/images', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Aucune image fournie" });
    }

    const imageData = {
      url: req.file.path,
      public_id: req.file.filename
    };

    const isMain = req.body.is_main === 'true';
    const image = await service.addProductImage(req.params.id, imageData, isMain);
    res.status(201).json({ success: true, data: image });
  } catch (err) {
    console.error('Erreur upload:', err);
    next(err);
  }
});

// Route pour supprimer une image - MODIFIÉE
router.delete('/images/:imageId', async (req, res, next) => {
  try {
    // Récupérer l'image pour avoir le public_id
    const image = await service.getImageById(req.params.imageId);
    
    // Supprimer de Cloudinary
    if (image && image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    // Supprimer de la base
    await service.deleteProductImage(req.params.imageId);
    res.json({ success: true, message: "Image supprimée" });
  } catch (err) {
    next(err);
  }
});

// ... le reste de vos routes (GET, etc.) reste identique

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
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;