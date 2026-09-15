const Joi = require('joi');

const optionalDate = Joi.alternatives()
  .try(Joi.date(), Joi.string().allow('', null))
  .optional();

const promoFields = {
  code: Joi.string().trim().uppercase().max(50),
  type: Joi.string().valid('percent', 'fixed', 'amount'),
  value: Joi.when('type', {
    is: 'percent',
    then: Joi.number().positive().max(100),
    otherwise: Joi.number().positive(),
  }),
  min_amount: Joi.number().min(0).allow(null),
  min_order: Joi.number().min(0).allow(null),
  starts_at: optionalDate,
  ends_at: optionalDate,
  max_uses: Joi.number().integer().min(1).allow(null),
  is_active: Joi.boolean(),
};

exports.createPromoSchema = Joi.object({
  ...promoFields,
  code: promoFields.code.required(),
  type: promoFields.type.required(),
  value: promoFields.value.required(),
});

exports.updatePromoSchema = Joi.object(promoFields).min(1);

exports.validatePromoQuerySchema = Joi.object({
  code: Joi.string().trim().required(),
  cart_total: Joi.number().min(0).required(),
});
