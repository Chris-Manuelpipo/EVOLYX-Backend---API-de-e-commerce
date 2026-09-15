const router = require('express').Router();
const service = require('../../services/promoService');
const validate = require('../../middleware/validate');
const { createPromoSchema, updatePromoSchema } = require('../../validators/promoValidator');

router.get('/', async (req, res, next) => {
  try {
    const promos = await service.listPromos();
    res.json({ success: true, data: promos });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const promo = await service.getPromo(req.params.id);
    res.json({ success: true, data: promo });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createPromoSchema), async (req, res, next) => {
  try {
    const promo = await service.createPromo(req.body);
    res.status(201).json({ success: true, data: promo });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updatePromoSchema), async (req, res, next) => {
  try {
    const promo = await service.updatePromo(req.params.id, req.body);
    res.json({ success: true, data: promo });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', validate(updatePromoSchema), async (req, res, next) => {
  try {
    const promo = await service.updatePromo(req.params.id, req.body);
    res.json({ success: true, data: promo });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await service.deletePromo(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
