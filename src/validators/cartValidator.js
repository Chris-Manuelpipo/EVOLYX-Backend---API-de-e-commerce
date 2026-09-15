const Joi = require('joi');

exports.mergeCartSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().required(),
      variation_id: Joi.number().integer().allow(null),
      quantity: Joi.number().integer().min(1).required(),
    })
  ).required(),
});
