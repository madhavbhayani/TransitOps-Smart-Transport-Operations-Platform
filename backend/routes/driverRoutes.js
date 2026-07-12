const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Setup permissions based on RBAC instructions
// SAFETY_OFFICER can do mutations
const requireSafetyOfficer = requireRole(['SAFETY_OFFICER', 'ADMIN']); 
// Both DISPATCHER and SAFETY_OFFICER can read
const requireReader = requireRole(['SAFETY_OFFICER', 'DISPATCHER', 'ADMIN', 'FLEET_MANAGER']); 

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
