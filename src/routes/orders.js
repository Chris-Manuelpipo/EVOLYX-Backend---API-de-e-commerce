const router = require('express').Router();
const service = require('../services/orderService');
const validate = require('../middleware/validate');
const { createOrderSchema } = require('../validators/orderValidator');

router.post('/', validate(createOrderSchema), async (req, res, next) => {
  try {
    const order = await service.createOrder(req.body);
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

router.put('/:id/cancel', async (req, res, next) => {
  try {
    await service.cancelOrder(req.params.id);
    res.json({ message: "Commande annulée" });
  } catch (err) {
    next(err);
  }
});


router.get('/', async (req, res, next) => {
  try {
    const orders = await service.getAllOrders();
    res.json(orders);
  } catch (err) {
    next(err);
  }
});



module.exports = router;
