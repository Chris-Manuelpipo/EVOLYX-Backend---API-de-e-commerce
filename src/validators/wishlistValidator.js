const Joi = require('joi');

exports.createWishlistSchema = Joi.object({
  token: Joi.string().uuid().optional(),
});

exports.addWishlistItemSchema = Joi.object({
  product_id: Joi.number().integer().required(),
});
