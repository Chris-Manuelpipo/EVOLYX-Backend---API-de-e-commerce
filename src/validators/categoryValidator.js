const Joi = require('joi');

exports.createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().allow('', null)
});

// ✅ Schéma pour la modification - CORRIGÉ
exports.updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().optional().allow('')
}).min(1); // Au moins un champ à modifier