const router = require('express').Router();
const service = require('../../services/wishlistService');
const validate = require('../../middleware/validate');
const { createWishlistSchema, addWishlistItemSchema } = require('../../validators/wishlistValidator');

router.post('/', validate(createWishlistSchema), async (req, res, next) => {
  try {
    const wishlist = await service.createWishlist(req.body.token);
    res.status(201).json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
});

router.get('/:token', async (req, res, next) => {
  try {
    const wishlist = await service.getWishlist(req.params.token);
    res.json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
});

router.post('/:token/items', validate(addWishlistItemSchema), async (req, res, next) => {
  try {
    const wishlist = await service.addItem(req.params.token, req.body.product_id);
    res.json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
});

router.delete('/:token/items/:itemId', async (req, res, next) => {
  try {
    const wishlist = await service.removeItem(req.params.token, req.params.itemId);
    res.json({ success: true, data: wishlist });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
