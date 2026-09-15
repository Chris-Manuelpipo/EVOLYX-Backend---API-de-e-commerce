const router = require('express').Router();
const service = require('../../services/cartService');
const validate = require('../../middleware/validate');
const { mergeCartSchema } = require('../../validators/cartValidator');

router.post('/', async (req, res, next) => {
  try {
    const cart = await service.createCart();
    res.status(201).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.get('/:token', async (req, res, next) => {
  try {
    const cart = await service.getCart(req.params.token);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.post('/:token/items', async (req, res, next) => {
  try {
    const cart = await service.addToCart(req.params.token, req.body);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.post('/:token/merge', validate(mergeCartSchema), async (req, res, next) => {
  try {
    const cart = await service.mergeCart(req.params.token, req.body.items);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.put('/:token/items/:itemId', async (req, res, next) => {
  try {
    const cart = await service.updateCartItem(req.params.token, req.params.itemId, req.body.quantity);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.delete('/:token/items/:itemId', async (req, res, next) => {
  try {
    const cart = await service.removeFromCart(req.params.token, req.params.itemId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

router.delete('/:token', async (req, res, next) => {
  try {
    const data = await service.clearCart(req.params.token);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
