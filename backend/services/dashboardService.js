const { pool } = require('../config/db');

async function getDashboardStats(filters = {}) {
    const { vehicleType, status, region } = filters;

    // We use parameterized queries where filters apply
    const vehicleParams = [];
    let vehicleWhere = 'WHERE 1=1';
    
    if (vehicleType) {
        vehicleParams.push(vehicleType);
        vehicleWhere += ` AND type = $${vehicleParams.length}`;
    }
    
    // Note: status filter might be meant for vehicles, but we also want to display the status breakdown.
    // If they pass a status filter, we apply it.
    if (status) {
        vehicleParams.push(status);
        vehicleWhere += ` AND status = $${vehicleParams.length}`;
    }

    const tripParams = [];
    let tripWhere = 'WHERE 1=1';
    if (region) {
        tripParams.push(`%${region}%`);
        tripWhere += ` AND (source ILIKE $${tripParams.length} OR destination ILIKE $${tripParams.length})`;
    }

    // Drivers don't have region or vehicle type directly, but we just count them
    
    // Execute all queries concurrently
    const [
        vehiclesStatusCount,
        totalVehicles,
        activeTrips,
        pendingTrips,
        driversOnDuty
    ] = await Promise.all([
        pool.query(`SELECT status, COUNT(*) FROM vehicles.vehicles ${vehicleWhere} GROUP BY status`, vehicleParams),
        pool.query(`SELECT COUNT(*) FROM vehicles.vehicles ${vehicleWhere}`, vehicleParams),
        pool.query(`SELECT COUNT(*) FROM trip_mgmt.trips ${tripWhere} AND status = 'DISPATCHED'`, tripParams),
        pool.query(`SELECT COUNT(*) FROM trip_mgmt.trips ${tripWhere} AND status = 'DRAFT'`, tripParams),
        pool.query(`SELECT COUNT(*) FROM drivers.drivers WHERE status = 'ON_TRIP'`)
    ]);

    // Parse status breakdown
    const vehicleStatusBreakdown = {
        AVAILABLE: 0,
        ON_TRIP: 0,
        IN_SHOP: 0,
        RETIRED: 0
    };
    
    vehiclesStatusCount.rows.forEach(row => {
        vehicleStatusBreakdown[row.status] = parseInt(row.count, 10);
    });

    const activeVehicles = vehicleStatusBreakdown['ON_TRIP'];
    const availableVehicles = vehicleStatusBreakdown['AVAILABLE'];
    const maintenanceVehicles = vehicleStatusBreakdown['IN_SHOP'];
    const totalV = parseInt(totalVehicles.rows[0].count, 10);
    
    const fleetUtilization = totalV > 0 
        ? parseFloat(((activeVehicles / totalV) * 100).toFixed(2)) 
        : 0;

    return {
        // Keeping original fields just in case frontend relies on them temporarily
        activeVehicles: activeVehicles,
        availableVehicles: availableVehicles,
        maintenanceVehicles: maintenanceVehicles,
        
        // New Requested Fields
        activeTrips: parseInt(activeTrips.rows[0].count, 10),
        pendingTrips: parseInt(pendingTrips.rows[0].count, 10),
        driversOnDuty: parseInt(driversOnDuty.rows[0].count, 10),
        fleetUtilization: fleetUtilization,
        vehicleStatusBreakdown: vehicleStatusBreakdown,
        
        // Original field backward compatibility
        currentMaintenance: maintenanceVehicles,
        alerts: maintenanceVehicles // or something else if alerts means something else
    };
}

module.exports = {
    getDashboardStats
};
