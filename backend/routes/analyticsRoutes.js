const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate);

// Role groupings based on dynamic permissions
const analystOnly = requirePermission('analytics', 'VIEW');
const analyticsViewRoles = requirePermission('analytics', 'VIEW');
const tripAnalyticsViewRoles = requirePermission('analytics', 'VIEW');

// Analytics Overview (NUMBER / KPI CARDS)
router.get('/overview', analystOnly, analyticsController.getOverview);

// Fleet & Financial Analytics (Charts)
router.get('/fuel-efficiency', analyticsViewRoles, analyticsController.getFuelEfficiency);
router.get('/fleet-utilization', analyticsViewRoles, analyticsController.getFleetUtilization);
router.get('/operational-cost', analyticsViewRoles, analyticsController.getOperationalCost);
router.get('/vehicle-roi', analyticsViewRoles, analyticsController.getVehicleROI);
router.get('/top-costliest-vehicles', analyticsViewRoles, analyticsController.getTopCostliestVehicles);
router.get('/monthly-revenue', analyticsViewRoles, analyticsController.getMonthlyRevenue);
router.get('/monthly-profitability', analystOnly, analyticsController.getMonthlyProfitability);

// Trip Level Analytics
router.get('/trips/profitability', tripAnalyticsViewRoles, analyticsController.getTripProfitability);
router.get('/trips/:tripId', tripAnalyticsViewRoles, analyticsController.getSpecificTripAnalytics);

// CSV Export
// Allowed roles: Analyst, Fleet Manager, Dispatcher (all analytics view roles combined safely)
const exportViewRoles = requirePermission('analytics', 'VIEW');
router.get('/export', exportViewRoles, analyticsController.exportData);

module.exports = router;
