const router = require('express').Router();
const service = require('../../services/productService');
const reviewService = require('../../services/reviewService');
const validate = require('../../middleware/validate');
const rateLimit = require('../../middleware/rateLimit');
const { createReviewSchema } = require('../../validators/reviewValidator');

const reviewLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop d’avis envoyés, réessayez plus tard',
});

function paginationPayload(result) {
  return {
    success: true,
    data: result.products,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

function listFilters(query) {
  return {
    q: query.q,
    category_id: query.category_id,
    min_price: query.min_price,
    max_price: query.max_price,
    sort: query.sort,
    in_stock: query.in_stock,
    page: query.page,
    limit: query.limit,
    publicOnly: true,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await service.listPublicProducts(listFilters(req.query));
    res.json(paginationPayload(result));
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const result = await service.listPublicProducts(listFilters(req.query));
    res.json(paginationPayload(result));
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

router.get('/category/:categoryId', async (req, res, next) => {
  try {
    const result = await service.listPublicProducts({
      ...listFilters(req.query),
      category_id: req.params.categoryId,
    });
    res.json(paginationPayload(result));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/images', async (req, res, next) => {
  try {
    const images = await service.getProductImages(req.params.id);
    res.json({ success: true, data: images });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/related', async (req, res, next) => {
  try {
    const products = await service.getRelatedProducts(req.params.id);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/reviews', async (req, res, next) => {
  try {
    const data = await reviewService.listByProduct(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reviews', reviewLimit, validate(createReviewSchema), async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.params.id, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await service.getOneProduct(req.params.id, { publicOnly: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
