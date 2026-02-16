const router = require('express').Router();
const controller = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { createCategorySchema } = require('../validators/categoryValidator');

router.post('/', validate(createCategorySchema), controller.createCategory);
router.delete('/:id', async (req, res, next) => {
  try {
    await controller.deleteCategory(req.params.id);
    res.json({ message: "Catégorie supprimée" });
  } catch (err) {
    next(err);
  }
});

router.get('/', controller.getCategories);

module.exports = router;
