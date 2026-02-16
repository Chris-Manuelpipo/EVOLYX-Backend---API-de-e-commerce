const service = require('../services/productService');

exports.createProduct = async (req, res, next) => {
  try {
    const product = await service.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await service.getProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
};
