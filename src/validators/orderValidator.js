const Joi = require('joi');

exports.createOrderSchema = Joi.object({
  customer_name: Joi.string().required(),
  customer_phone: Joi.string().required(),
  customer_address: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().required(),
      variation_id: Joi.number().allow(null),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});
