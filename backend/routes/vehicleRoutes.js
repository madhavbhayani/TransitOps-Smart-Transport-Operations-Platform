const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

// Apply auth middleware to all vehicle routes
router.use(authenticate);

// Fleet Utilization Summary (MUST be before /:id to prevent parameter conflict)
router.get('/utilization/summary', requireRole(['FLEET_MANAGER']), vehicleController.getFleetUtilizationSummary);

// Lists & Global
router.get('/', requireRole(['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']), vehicleController.getVehicles);
router.post('/', requireRole(['FLEET_MANAGER']), vehicleController.registerVehicle);


// Individual Vehicle Routes
router.get('/:id', requireRole(['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST']), vehicleController.getVehicleById);
router.patch('/:id', requireRole(['FLEET_MANAGER']), vehicleController.updateVehicle);

// Status Updates
router.post('/:id/mark-available', requireRole(['FLEET_MANAGER']), vehicleController.markAvailable);
router.post('/:id/retire', requireRole(['FLEET_MANAGER']), vehicleController.retireVehicle);

// Maintenance Operations
router.post('/:id/maintenance', requireRole(['FLEET_MANAGER']), vehicleController.startMaintenance);
router.post('/:vehicleId/maintenance/:maintenanceId/complete', requireRole(['FLEET_MANAGER']), vehicleController.completeMaintenance);
router.post('/:vehicleId/maintenance/:maintenanceId/cancel', requireRole(['FLEET_MANAGER']), vehicleController.cancelMaintenance);
router.get('/:id/maintenance', requireRole(['FLEET_MANAGER', 'DISPATCHER']), vehicleController.getVehicleMaintenanceList);

// Utilization & History
router.get('/:id/utilization', requireRole(['FLEET_MANAGER']), vehicleController.getVehicleUtilization);
router.get('/:id/status-history', requireRole(['FLEET_MANAGER', 'DISPATCHER']), vehicleController.getVehicleStatusHistory);
router.get('/:id/lifecycle', requireRole(['FLEET_MANAGER', 'DISPATCHER']), vehicleController.getVehicleLifecycle);

module.exports = router;
