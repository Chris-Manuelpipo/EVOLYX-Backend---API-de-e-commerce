const router = require('express').Router();
const controller = require('../controllers/productController');
const validate = require('../middleware/validate');
const { createProductSchema } = require('../validators/productValidator');
const upload = require('../middleware/upload');
const imageService = require('../services/imageService');

router.post('/:id/images', upload.single('image'), async (req, res) => {
  const image = await imageService.addImage(
    req.params.id,
    `/uploads/${req.file.filename}`
  );

  res.status(201).json(image);
});


router.post('/', validate(createProductSchema), controller.createProduct);
router.get('/', controller.getProducts);
router.get('/paginated', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const products = await service.getProductsPaginated(page, limit);
  res.json(products);
});

module.exports = router;
