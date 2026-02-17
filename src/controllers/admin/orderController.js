const orderService = require('../../services/orderService')

// ============================================
// GET ORDER BY ID (Admin)
// ============================================
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === 'Commande non trouvée') {
      res.status(404).json({ success: false, message: err.message });
    } else {
      next(err);
    }
  }
};