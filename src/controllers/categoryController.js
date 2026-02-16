const service = require('../services/categoryService');

exports.createCategory = async (req, res, next) => {
  try {
    const category = await service.createCategory(req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await service.deleteCategory(req.params.id);
    res.json({ message: "Catégorie supprimée" });
  } catch (err) {
    next(err);
  }
};


exports.getCategories = async (req, res, next) => {
  try {
    const categories = await service.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
};
