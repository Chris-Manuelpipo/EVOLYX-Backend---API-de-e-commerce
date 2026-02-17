const router = require('express').Router();
const controller = require('../../controllers/admin/authController')

router.post('/login', controller.login );

module.exports = router;
