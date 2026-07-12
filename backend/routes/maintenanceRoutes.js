const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

router.use(authenticate);

router.get('/', requireRole(['FLEET_MANAGER']), vehicleController.getAllMaintenance);

module.exports = router;
