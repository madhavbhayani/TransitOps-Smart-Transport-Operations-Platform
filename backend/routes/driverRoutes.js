const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');

// Setup permissions based on RBAC instructions
// FULL_CONTROL can do mutations
const requireSafetyOfficer = requirePermission('drivers', 'FULL_CONTROL'); 
// VIEW can read
const requireReader = requirePermission('drivers', 'VIEW'); 

// Apply authentication to all routes
router.use(authenticate);

// List, Search, Filter (Readers)
router.get('/', requireReader, driverController.listDrivers);
router.get('/search', requireReader, driverController.searchDrivers);
router.get('/filter', requireReader, driverController.filterDrivers);
router.get('/compliance/licenses', requireReader, driverController.getComplianceData);

// Detail and Histories (Readers)
router.get('/:id', requireReader, driverController.getDriverDetails);
router.get('/:id/status-history', requireSafetyOfficer, driverController.getDriverStatusHistory);
router.get('/:id/safety-history', requireSafetyOfficer, driverController.getDriverSafetyHistory);

// Create, Update, Status changes (Mutations)
router.post('/', requireSafetyOfficer, driverController.createDriver);
router.patch('/:id', requireSafetyOfficer, driverController.updateDriver);
router.post('/:id/suspend', requireSafetyOfficer, driverController.suspendDriver);
router.post('/:id/restore', requireSafetyOfficer, driverController.restoreDriver);
router.post('/:id/off-duty', requireSafetyOfficer, driverController.markOffDuty);
router.post('/:id/available', requireSafetyOfficer, driverController.markAvailable);
router.post('/:id/safety-score', requireSafetyOfficer, driverController.updateSafetyScore);
router.delete('/:id', requireSafetyOfficer, driverController.deleteDriver);

module.exports = router;
