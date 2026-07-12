const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');

const router = express.Router();

router.use(authenticate);   

// Dynamic permissions
const analystOnly = requirePermission('expenses', 'FULL_CONTROL'); // Using FULL_CONTROL for things only analysts could do before
const writeRoles = requirePermission('expenses', 'FULL_CONTROL');
const viewRoles = requirePermission('expenses', 'VIEW');

// Fuel Logs
router.post('/fuel-logs', writeRoles, financeController.recordFuelLog);
router.get('/fuel-logs', viewRoles, financeController.getFuelLogs);
router.get('/fuel-logs/:id', viewRoles, financeController.getFuelLogDetails);
router.post('/fuel-logs/:id/void', analystOnly, financeController.voidFuelLog); // Voiding remains analyst only

// Expenses
router.post('/expenses', writeRoles, financeController.recordExpense);
router.get('/expenses', viewRoles, financeController.getExpenses);
router.get('/expenses/:id', viewRoles, financeController.getExpenseDetails);
router.post('/expenses/:id/void', analystOnly, financeController.voidExpense); // Voiding remains analyst only

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