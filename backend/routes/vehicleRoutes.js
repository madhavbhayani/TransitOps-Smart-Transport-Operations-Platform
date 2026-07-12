const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

// Apply auth middleware to all vehicle routes
router.use(authenticate);

// Setup permissions
const fleetView = requirePermission('fleet', 'VIEW');
const fleetFull = requirePermission('fleet', 'FULL_CONTROL');
const maintenanceView = requirePermission('maintenance', 'VIEW');
const maintenanceFull = requirePermission('maintenance', 'FULL_CONTROL');

// Global & Summary Routes (MUST be before /:id)
router.get('/utilization/summary', fleetView, vehicleController.getFleetUtilizationSummary);
router.get('/maintenance/all', maintenanceView, vehicleController.getAllMaintenance);
router.get('/', fleetView, vehicleController.getVehicles);
router.post('/', fleetFull, vehicleController.registerVehicle);

// Individual Vehicle Routes
router.get('/:id', fleetView, vehicleController.getVehicleById);
router.patch('/:id', fleetFull, vehicleController.updateVehicle);

// Status Updates
router.post('/:id/mark-available', fleetFull, vehicleController.markAvailable);
router.post('/:id/retire', fleetFull, vehicleController.retireVehicle);

// Maintenance Operations
router.post('/:id/maintenance', maintenanceFull, vehicleController.startMaintenance);
router.post('/:vehicleId/maintenance/:maintenanceId/complete', maintenanceFull, vehicleController.completeMaintenance);
router.post('/:vehicleId/maintenance/:maintenanceId/cancel', maintenanceFull, vehicleController.cancelMaintenance);
router.get('/:id/maintenance', maintenanceView, vehicleController.getVehicleMaintenanceList);

// Utilization & History (Read for Fleet)
router.get('/:id/utilization', fleetView, vehicleController.getVehicleUtilization);
router.get('/:id/status-history', fleetView, vehicleController.getVehicleStatusHistory);
router.get('/:id/lifecycle', fleetView, vehicleController.getVehicleLifecycle);

router.get('/export', maintenanceView, vehicleController.exportData);
module.exports = router;
