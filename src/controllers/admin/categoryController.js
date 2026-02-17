const categoryService = require('../../services/categoryService');

exports.createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}; 
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ success: false, message: "Catégorie non trouvée" });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: "Catégorie supprimée" });
  } catch (err) {
    next(err);
  }
};