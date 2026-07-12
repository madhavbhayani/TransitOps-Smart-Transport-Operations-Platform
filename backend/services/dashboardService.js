const { pool } = require('../config/db');

async function getDashboardStats() {
    // Queries can be run concurrently
    const [vehiclesRes, tripsRes, maintenanceRes, alertsRes] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM vehicles.vehicles WHERE status IN ('AVAILABLE', 'ON_TRIP')`),
        pool.query(`SELECT COUNT(*) FROM trip_mgmt.trips WHERE status = 'DISPATCHED'`),
        pool.query(`SELECT COUNT(*) FROM vehicles.vehicle_maintenance WHERE status = 'IN_PROGRESS'`),
        pool.query(`SELECT COUNT(*) FROM vehicles.vehicles WHERE status = 'IN_SHOP'`)
    ]);

    return {
        activeVehicles: parseInt(vehiclesRes.rows[0].count, 10),
        activeTrips: parseInt(tripsRes.rows[0].count, 10),
        currentMaintenance: parseInt(maintenanceRes.rows[0].count, 10),
        alerts: parseInt(alertsRes.rows[0].count, 10) // Number of vehicles in shop
    };
}

module.exports = {
    getDashboardStats
};
