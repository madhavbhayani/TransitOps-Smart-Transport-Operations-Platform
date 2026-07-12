const express = require('express');
const { authenticate, requirePermission } = require('../middleware/authMiddleware');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// All authenticated users can access the dashboard stats if they have VIEW
router.get('/stats', authenticate, requirePermission('dashboard', 'VIEW'), dashboardController.getDashboardStats);

module.exports = router;
