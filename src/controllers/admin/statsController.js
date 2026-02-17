const statsService = require('../../services/statsService');

exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await statsService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};