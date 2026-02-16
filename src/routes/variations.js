const router = require('express').Router();
const service = require('../services/variationService');

router.post('/', async (req, res) => {
  const variation = await service.createVariation(req.body);
  res.status(201).json(variation);
});

module.exports = router;
