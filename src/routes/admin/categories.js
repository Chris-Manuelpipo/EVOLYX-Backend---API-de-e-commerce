const router = require('express').Router();
const controller = require('../../controllers/admin/categoryController');
const validate = require('../../middleware/validate');
const { createCategorySchema, updateCategorySchema } = require('../../validators/categoryValidator');
const auth  = require('../../middleware/auth');

router.use(auth);

router.post('/', validate(createCategorySchema), controller.createCategory);
router.put('/:id', validate(updateCategorySchema), controller.updateCategory); 
router.delete('/:id', controller.deleteCategory);

module.exports = router;