const router = require('express').Router();
const service = require('../../services/returnService');
const validate = require('../../middleware/validate');
const { updateReturnSchema } = require('../../validators/returnValidator');

router.get('/', async (req, res, next) => {
  try {
    const returns = await service.listReturns();
    res.json({ success: true, data: returns });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await service.getReturn(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

async function patchReturn(req, res, next) {
  try {
    const data = await service.updateReturnStatus(req.params.id, req.body.status);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

router.patch('/:id', validate(updateReturnSchema), patchReturn);
router.put('/:id', validate(updateReturnSchema), patchReturn);

module.exports = router;
