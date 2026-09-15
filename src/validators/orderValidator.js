const Joi = require('joi');

const orderItem = Joi.object({
  product_id: Joi.number().required(),
  variation_id: Joi.number().allow(null),
  quantity: Joi.number().integer().min(1).required(),
});

exports.createOrderSchema = Joi.object({
  customer_name: Joi.string().required(),
  customer_phone: Joi.string().required(),
  customer_address: Joi.string().required(),
  items: Joi.array().items(orderItem).min(1).optional(),
  cart_token: Joi.string().uuid().optional(),
  promo_code: Joi.string().trim().max(50).allow('', null).optional(),
}).or('items', 'cart_token');
