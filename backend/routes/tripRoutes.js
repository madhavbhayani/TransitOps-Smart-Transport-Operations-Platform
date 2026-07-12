const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const tripController = require('../controllers/tripController');
const router = express.Router();
router.use(authenticate);
// Allow view access to multiple roles
const viewRoles = requirePermission('trips', 'VIEW');
const dispatchOnly = requirePermission('trips', 'FULL_CONTROL');
// List / Operations that don't need an ID
router.post('/', dispatchOnly, tripController.createTrip);
router.post('/select-vehicles', dispatchOnly, tripController.selectVehicles);
router.post('/select-drivers', dispatchOnly, tripController.selectDrivers);
router.post('/active', viewRoles, tripController.getActiveTrips);
router.post('/search', viewRoles, tripController.searchTrips);
router.post('/filter', viewRoles, tripController.filterTrips);
router.get('/export', viewRoles, tripController.exportData);
// Operations with IDs
router.patch('/:id', dispatchOnly, tripController.updateTrip);
router.post('/:id/dispatch', dispatchOnly, tripController.dispatchTrip);
router.post('/:id/complete', dispatchOnly, tripController.completeTrip);
router.post('/:id/cancel', dispatchOnly, tripController.cancelTrip);
router.post('/:id/details', viewRoles, tripController.getTripDetails);

router.get('/export', viewRoles, tripController.exportData);
module.exports = router;
