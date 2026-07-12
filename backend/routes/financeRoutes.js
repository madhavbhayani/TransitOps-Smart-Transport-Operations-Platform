const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');

const router = express.Router();

router.use(authenticate);

// Allow FINANCIAL_ANALYST full access, others restricted where appropriate.
const analystOnly = requireRole(['FINANCIAL_ANALYST']);
const viewRoles = requireRole(['FINANCIAL_ANALYST', 'FLEET_MANAGER', 'DISPATCHER']); // Adjust view permissions

// Fuel Logs
router.post('/fuel-logs', analystOnly, financeController.recordFuelLog);
router.get('/fuel-logs', viewRoles, financeController.getFuelLogs);
router.get('/fuel-logs/:id', viewRoles, financeController.getFuelLogDetails);
router.post('/fuel-logs/:id/void', analystOnly, financeController.voidFuelLog);

// Expenses
router.post('/expenses', analystOnly, financeController.recordExpense);
router.get('/expenses', viewRoles, financeController.getExpenses);
router.get('/expenses/:id', viewRoles, financeController.getExpenseDetails);
router.post('/expenses/:id/void', analystOnly, financeController.voidExpense);

// Vehicle Analytics
router.get('/vehicles/:vehicleId/operational-cost', viewRoles, financeController.getVehicleOperationalCost);
router.get('/vehicles/:vehicleId/fuel-efficiency', viewRoles, financeController.getVehicleFuelEfficiency);
router.get('/vehicles/:vehicleId/roi', viewRoles, financeController.getVehicleROI);
router.get('/vehicles/:vehicleId/summary', viewRoles, financeController.getVehicleSummary);

// Dashboard
router.get('/summary', analystOnly, financeController.getDashboardSummary);

// Search & Filter
router.get('/search', viewRoles, financeController.searchFinancials);
router.post('/filter', viewRoles, financeController.filterFinancials);

// Export
router.get('/export/csv', viewRoles, financeController.exportCSV);

module.exports = router;
