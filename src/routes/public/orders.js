const router = require('express').Router();
const service = require('../../services/orderService');
const returnService = require('../../services/returnService');
const validate = require('../../middleware/validate');
const rateLimit = require('../../middleware/rateLimit');
const HttpError = require('../../utils/httpError');
const { createOrderSchema } = require('../../validators/orderValidator');
const { createReturnSchema } = require('../../validators/returnValidator');

const orderCreateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Trop de commandes, réessayez plus tard',
});

router.post('/', orderCreateLimit, validate(createOrderSchema), async (req, res, next) => {
  try {
    const result = await service.createOrderWithWhatsApp(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/track', async (req, res, next) => {
  try {
    const order = await service.getOrderStatus(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/invoice', (req, res, next) => {
  next(new HttpError('Facture réservée à l’administration', 403));
});

router.post('/:id/returns', validate(createReturnSchema), async (req, res, next) => {
  try {
    const data = await returnService.createReturn(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await service.getOrderStatus(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
