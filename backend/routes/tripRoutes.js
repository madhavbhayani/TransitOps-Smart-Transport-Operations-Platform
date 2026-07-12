const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const tripController = require('../controllers/tripController');

const router = express.Router();

router.use(authenticate);

// List / Operations that don't need an ID
router.post('/', requireRole(['DISPATCHER']), tripController.createTrip);
router.post('/select-vehicles', requireRole(['DISPATCHER']), tripController.selectVehicles);
router.post('/select-drivers', requireRole(['DISPATCHER']), tripController.selectDrivers);
router.post('/active', requireRole(['DISPATCHER']), tripController.getActiveTrips);
router.post('/search', requireRole(['DISPATCHER']), tripController.searchTrips);
router.post('/filter', requireRole(['DISPATCHER']), tripController.filterTrips);

// Operations with IDs
router.post('/:id/dispatch', requireRole(['DISPATCHER']), tripController.dispatchTrip);
router.post('/:id/complete', requireRole(['DISPATCHER']), tripController.completeTrip);
router.post('/:id/cancel', requireRole(['DISPATCHER']), tripController.cancelTrip);
router.post('/:id/details', requireRole(['DISPATCHER']), tripController.getTripDetails);

module.exports = router;
