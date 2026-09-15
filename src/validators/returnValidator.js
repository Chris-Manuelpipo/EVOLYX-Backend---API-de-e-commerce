const Joi = require('joi');

exports.createReturnSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(2000).required(),
  items: Joi.array()
    .items(
      Joi.object({
        product_id: Joi.number().integer().required(),
        variation_id: Joi.number().integer().allow(null),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .optional(),
});

exports.updateReturnSchema = Joi.object({
  status: Joi.string()
    .valid('requested', 'pending', 'approved', 'rejected', 'received', 'refunded')
    .required(),
});
