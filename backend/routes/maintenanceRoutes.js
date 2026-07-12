const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('maintenance', 'VIEW'), vehicleController.getAllMaintenance);

module.exports = router;
