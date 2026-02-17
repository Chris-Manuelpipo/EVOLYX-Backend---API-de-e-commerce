const router = require('express').Router();
const service = require('../../services/statsService');
const statsController = require('../../controllers/admin/statsController');

router.get('/', statsController.getDashboardStats);
 

module.exports = router;
