const router = require('express').Router();
const controller = require('../../controllers/admin/authController');
const loginThrottle = require('../../middleware/loginThrottle');

router.post('/login', loginThrottle, controller.login);
router.post('/logout', controller.logout);

module.exports = router;
