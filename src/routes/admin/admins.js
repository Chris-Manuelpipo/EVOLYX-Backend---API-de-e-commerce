const router = require('express').Router();
const controller = require('../../controllers/admin/adminController')

// Routeur Création admin (super_admin uniquement)
router.post('/', controller.createAdmin);

module.exports = router;
