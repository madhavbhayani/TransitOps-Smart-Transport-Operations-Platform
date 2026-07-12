const { pool } = require('../config/db');

async function createTrip(data, userId) {
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = data;
    
    if (!source || !destination) throw new Error('Source and destination are required');
    if (source === destination) throw new Error('Source and destination must not be identical');
    if (cargoWeight <= 0) throw new Error('Cargo weight must be positive');
    if (plannedDistance <= 0) throw new Error('Planned distance must be positive');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const vRes = await client.query('SELECT max_load_capacity FROM vehicles.vehicles WHERE id = $1', [vehicleId]);
        if (!vRes.rows.length) throw new Error('Vehicle not found');
        if (cargoWeight > vRes.rows[0].max_load_capacity) throw new Error('Cargo weight exceeds vehicle max capacity');
        
        const dRes = await client.query('SELECT id FROM drivers.drivers WHERE id = $1', [driverId]);
        if (!dRes.rows.length) throw new Error('Driver not found');
        
        const tripRes = await client.query(`
            INSERT INTO trip_mgmt.trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, status, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $8)
            RETURNING *
        `, [source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue || 0, userId]);
        
        const trip = tripRes.rows[0];
        
        await client.query(`
            INSERT INTO trip_mgmt.trip_status_history (trip_id, previous_status, new_status, reason, changed_by)
            VALUES ($1, NULL, 'DRAFT', 'Trip created', $2)
        `, [trip.id, userId]);
        
        await client.query('COMMIT');
        return trip;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function selectVehicles({ cargoWeight }) {
    const query = `
        SELECT * FROM vehicles.vehicles
        WHERE status = 'AVAILABLE' AND max_load_capacity >= $1
        ORDER BY max_load_capacity ASC
    `;
    const res = await pool.query(query, [cargoWeight || 0]);
    return res.rows;
}

async function selectDrivers() {
    const query = `
        SELECT * FROM drivers.drivers
        WHERE status = 'AVAILABLE' AND license_expiry >= CURRENT_DATE
        ORDER BY name ASC
    `;
    const res = await pool.query(query);
    return res.rows;
}

async function dispatchTrip(id, userId) {
    try {
        await pool.query('SELECT trip_mgmt.dispatch_trip($1, $2)', [id, userId]);
        return { success: true, message: 'Trip dispatched successfully' };
    } catch (err) {
        throw new Error(err.message || 'Failed to dispatch trip');
    }
}

async function getActiveTrips() {
    const query = `
        SELECT t.*, 
               v.registration_number AS vehicle_registration, v.name AS vehicle_name,
               d.name AS driver_name, d.license_number AS driver_license
        FROM trip_mgmt.trips t
        JOIN vehicles.vehicles v ON t.vehicle_id = v.id
        JOIN drivers.drivers d ON t.driver_id = d.id
        WHERE t.status = 'DISPATCHED'
        ORDER BY t.dispatched_at DESC
    `;
    const res = await pool.query(query);
    return res.rows;
}

async function completeTrip(id, { finalOdometer, fuelConsumed }, userId) {
    try {
        await pool.query('SELECT trip_mgmt.complete_trip($1, $2, $3, $4)', [id, finalOdometer, fuelConsumed || 0, userId]);
        return { success: true, message: 'Trip completed successfully' };
    } catch (err) {
        throw new Error(err.message || 'Failed to complete trip');
    }
}

async function cancelTrip(id, { reason }, userId) {
    try {
        await pool.query('SELECT trip_mgmt.cancel_trip($1, $2, $3)', [id, reason || 'Cancelled by dispatcher', userId]);
        return { success: true, message: 'Trip cancelled successfully' };
    } catch (err) {
        throw new Error(err.message || 'Failed to cancel trip');
    }
}

async function searchTrips({ search }) {
    const query = `
        SELECT t.*, v.registration_number, v.name AS vehicle_name, d.name AS driver_name, d.license_number
        FROM trip_mgmt.trips t
        JOIN vehicles.vehicles v ON t.vehicle_id = v.id
        JOIN drivers.drivers d ON t.driver_id = d.id
        WHERE t.source ILIKE $1 
           OR t.destination ILIKE $1
           OR v.registration_number ILIKE $1
           OR v.name ILIKE $1
           OR d.name ILIKE $1
           OR d.license_number ILIKE $1
        ORDER BY t.id DESC
    `;
    const res = await pool.query(query, [`%${search}%`]);
    return res.rows;
}

async function filterTrips(filters) {
    let query = `
        SELECT t.*, v.registration_number, v.name AS vehicle_name, d.name AS driver_name, d.license_number
        FROM trip_mgmt.trips t
        JOIN vehicles.vehicles v ON t.vehicle_id = v.id
        JOIN drivers.drivers d ON t.driver_id = d.id
        WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    
    if (filters.status) { query += ` AND t.status = $${idx++}`; params.push(filters.status); }
    if (filters.vehicleId) { query += ` AND t.vehicle_id = $${idx++}`; params.push(filters.vehicleId); }
    if (filters.driverId) { query += ` AND t.driver_id = $${idx++}`; params.push(filters.driverId); }
    if (filters.source) { query += ` AND t.source = $${idx++}`; params.push(filters.source); }
    if (filters.destination) { query += ` AND t.destination = $${idx++}`; params.push(filters.destination); }
    if (filters.createdFrom) { query += ` AND t.created_at >= $${idx++}`; params.push(filters.createdFrom); }
    if (filters.createdTo) { query += ` AND t.created_at <= $${idx++}`; params.push(filters.createdTo); }
    
    query += ` ORDER BY t.id DESC`;
    const res = await pool.query(query, params);
    return res.rows;
}

async function getTripDetails(id) {
    const tripQuery = `
        SELECT t.*, 
               v.registration_number, v.name AS vehicle_name, v.max_load_capacity, v.type AS vehicle_type, v.odometer,
               d.name AS driver_name, d.license_number, d.license_expiry, d.safety_score
        FROM trip_mgmt.trips t
        JOIN vehicles.vehicles v ON t.vehicle_id = v.id
        JOIN drivers.drivers d ON t.driver_id = d.id
        WHERE t.id = $1
    `;
    const tripRes = await pool.query(tripQuery, [id]);
    if (!tripRes.rows.length) return null;
    
    const row = tripRes.rows[0];
    
    const historyQuery = `
        SELECT h.*, u.name AS changed_by_name
        FROM trip_mgmt.trip_status_history h
        LEFT JOIN users.users u ON h.changed_by = u.id
        WHERE h.trip_id = $1
        ORDER BY h.created_at DESC
    `;
    const historyRes = await pool.query(historyQuery, [id]);
    
    return {
        trip: {
            ...row,
            source: row.source,
            destination: row.destination,
            planned_distance: row.planned_distance,
            revenue: row.revenue,
            status: row.status,
            fuel_consumed: row.fuel_consumed,
            actual_distance: row.actual_distance
        },
        vehicle: {
            id: row.vehicle_id,
            registration_number: row.registration_number,
            name: row.vehicle_name,
            type: row.vehicle_type,
            odometer: row.odometer
        },
        driver: {
            id: row.driver_id,
            name: row.driver_name,
            license_number: row.license_number,
            safety_score: row.safety_score
        },
        history: historyRes.rows
    };
}

module.exports = {
    createTrip,
    selectVehicles,
    selectDrivers,
    dispatchTrip,
    getActiveTrips,
    completeTrip,
    cancelTrip,
    searchTrips,
    filterTrips,
    getTripDetails
};
