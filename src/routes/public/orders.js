const router = require('express').Router();
const service = require('../../services/orderService');
const validate = require('../../middleware/validate');
const { createOrderSchema } = require('../../validators/orderValidator');

router.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const order = await service.createOrderWithWhatsApp(req.body);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});
 

router.put('/:id/confirm', async (req, res, next) => {
  try {
    await service.confirmOrder(req.params.id);
    res.json({ message: "Commande confirmée" });
  } catch (err) {
    next(err);
  }
});


// ✅ Route pour suivre une commande (utile en public)
router.get('/:id/track', async (req, res, next) => {
  try {
    const order = await service.getOrderStatus(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
