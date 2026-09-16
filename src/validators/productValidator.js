const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().allow('', null).max(5000),
  base_price: Joi.number().positive().required(),
  cost_price: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.number().integer().required(),
  is_featured: Joi.boolean(),
  is_active: Joi.boolean(),
});

exports.updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  description: Joi.string().allow('', null).max(5000),
  base_price: Joi.number().positive(),
  cost_price: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0),
  category_id: Joi.number().integer().allow(null),
  is_featured: Joi.boolean(),
  is_active: Joi.boolean(),
}).min(1);