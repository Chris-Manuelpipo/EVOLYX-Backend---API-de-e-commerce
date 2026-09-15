const router = require('express').Router();
const service = require('../../services/orderService');
const invoiceService = require('../../services/invoiceService');
const controller = require('../../controllers/admin/orderController');

router.get('/', async (req, res, next) => {
  try {
    const orders = await service.getAllOrders();
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/confirm', async (req, res, next) => {
  try {
    await service.confirmOrder(req.params.id);
    res.json({ success: true, message: 'Commande confirmée' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const order = await service.updateOrderStatus(req.params.id, req.body.status);
    res.json({ success: true, data: order, message: 'Statut mis à jour' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/cancel', async (req, res, next) => {
  try {
    await service.cancelOrder(req.params.id);
    res.json({ success: true, message: 'Commande annulée' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/invoice', async (req, res, next) => {
  try {
    const order = await service.getOrderWithItems(req.params.id);
    const pdf = await invoiceService.buildPdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="facture-EVOLYX-${order.id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', controller.getOrderById);

module.exports = router;
