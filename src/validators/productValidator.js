const Joi = require('joi');

exports.createProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  base_price: Joi.number().positive().required(),
  cost_price: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0).required(),
  category_id: Joi.number().required(),
  is_featured: Joi.boolean(),
  is_active: Joi.boolean(),
});
