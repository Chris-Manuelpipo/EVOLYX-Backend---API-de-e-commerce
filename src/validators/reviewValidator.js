const Joi = require('joi');

exports.createReviewSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  author_name: Joi.string().trim().min(1).max(255),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().allow('', null).max(2000).optional(),
  body: Joi.string().trim().allow('', null).max(2000).optional(),
}).or('name', 'author_name');
