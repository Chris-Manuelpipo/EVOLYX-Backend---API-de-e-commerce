const router = require('express').Router();
const service = require('../../services/orderService');
const controller = require('../../controllers/admin/orderController')

router.get('/', async (req, res, next) => {
  try {
    const orders = await service.getAllOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}); 

router.put('/:id/status', async (req, res, next) => {
  try {
    await service.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
  
// GET /api/admin/orders/:id
router.get('/:id', controller.getOrderById);
 

// Voir une commande spécifique
router.get('/:id', async (req, res, next) => {
  try {
    const order = await service.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// Mettre à jour le statut
router.put('/:id/status', async (req, res, next) => {
  try {
    await service.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true, message: "Statut mis à jour" });
  } catch (err) {
    next(err);
  }
});

// Annuler une commande
router.put('/:id/cancel', async (req, res, next) => {
  try {
    await service.cancelOrder(req.params.id);
    res.json({ success: true, message: "Commande annulée" });
  } catch (err) {
    next(err);
  }
});
 

module.exports = router;
