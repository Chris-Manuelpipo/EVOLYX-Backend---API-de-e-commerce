const router = require('express').Router();
const service = require('../../services/promoService');
const validate = require('../../middleware/validate');
const { validatePromoQuerySchema } = require('../../validators/promoValidator');

router.get('/validate', validate(validatePromoQuerySchema, 'query'), async (req, res, next) => {
  try {
    const data = await service.validateCode(req.query.code, req.query.cart_total);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
