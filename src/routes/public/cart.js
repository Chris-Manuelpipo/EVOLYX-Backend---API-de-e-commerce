const router = require('express').Router();
const service = require('../../services/cartService');

// Créer un panier
router.post('/', async (req, res, next) => {
  try {
    const cart = await service.createCart();
    res.status(201).json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// ✅ CORRIGER: Ajouter le token dans l'URL
router.get('/:token', async (req, res, next) => {
  try {
    const cart = await service.getCart(req.params.token);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// ✅ CORRIGER: Ajouter le token dans l'URL
router.post('/:token/items', async (req, res, next) => {
  try {
    const cart = await service.addToCart(req.params.token, req.body);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// ✅ CORRIGER: Ajouter le token dans l'URL
router.put('/:token/items/:itemId', async (req, res, next) => {
  try {
    const cart = await service.updateCartItem(req.params.token, req.params.itemId, req.body.quantity);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

// ✅ CORRIGER: Ajouter le token dans l'URL
router.delete('/:token/items/:itemId', async (req, res, next) => {
  try {
    const cart = await service.removeFromCart(req.params.token, req.params.itemId);
    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
});

module.exports = router;