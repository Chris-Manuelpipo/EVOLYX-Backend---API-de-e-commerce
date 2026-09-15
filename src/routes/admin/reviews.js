const router = require('express').Router();
const service = require('../../services/reviewService');

router.delete('/:id', async (req, res, next) => {
  try {
    const data = await service.deleteReview(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
