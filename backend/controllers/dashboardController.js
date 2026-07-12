const dashboardService = require('../services/dashboardService');

const getDashboardStats = async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard stats'
        });
    }
};

module.exports = {
    getDashboardStats
};
