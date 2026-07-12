const { pool } = require('../config/db');
async function registerVehicle(data, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query(`
            INSERT INTO vehicles.vehicles 
            (registration_number, name, type, max_load_capacity, odometer, acquisition_cost)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [data.registrationNumber, data.name, data.type, data.maxLoadCapacity, data.odometer, data.acquisitionCost]);
        const vehicle = vRes.rows[0];

        await client.query('INSERT INTO vehicles.vehicle_utilization (vehicle_id) VALUES ($1)', [vehicle.id]);

        await client.query(`
            INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by)
            VALUES ($1, 'REGISTERED', 'Vehicle added to fleet', $2)
        `, [vehicle.id, userId]);

        await client.query(`
            INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by)
            VALUES ($1, NULL, 'AVAILABLE', 'Vehicle registered', $2)
        `, [vehicle.id, userId]);

        await client.query('COMMIT');
        return vehicle;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function getVehicles({ status, type, search }) {
    let query = `SELECT * FROM vehicles.vehicles WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (type) { params.push(type); query += ` AND type = $${params.length}`; }
    if (search) {
        params.push(`%${search}%`);
        query += ` AND (registration_number ILIKE $${params.length} OR name ILIKE $${params.length})`;
    }
    query += ` ORDER BY id DESC`;
    const res = await pool.query(query, params);
    return res.rows;
}
async function getVehicleById(id) {
    const vRes = await pool.query('SELECT * FROM vehicles.vehicles WHERE id = $1', [id]);
    if (!vRes.rows.length) return null;
    const vehicle = vRes.rows[0];

    const uRes = await pool.query('SELECT * FROM vehicles.vehicle_utilization WHERE vehicle_id = $1', [id]);
    const utilization = uRes.rows[0] || null;

    const mRes = await pool.query("SELECT * FROM vehicles.vehicle_maintenance WHERE vehicle_id = $1 AND status = 'ACTIVE'", [id]);
    const activeMaintenance = mRes.rows[0] || null;

    return { vehicle, utilization, activeMaintenance };
}
async function updateVehicle(id, data) {
    const { name, type, maxLoadCapacity, odometer, acquisitionCost } = data;
    const current = await pool.query('SELECT odometer FROM vehicles.vehicles WHERE id = $1', [id]);
    if (!current.rows.length) throw new Error('NOT_FOUND');
    if (odometer !== undefined && Number(odometer) < Number(current.rows[0].odometer)) {
        throw new Error('Odometer cannot decrease');
    }
    const updates = [];
    const params = [];
    let idx = 1;
    if (name) { updates.push(`name = $${idx++}`); params.push(name); }
    if (type) { updates.push(`type = $${idx++}`); params.push(type); }
    if (maxLoadCapacity !== undefined) { updates.push(`max_load_capacity = $${idx++}`); params.push(maxLoadCapacity); }
    if (odometer !== undefined) { updates.push(`odometer = $${idx++}`); params.push(odometer); }
    if (acquisitionCost !== undefined) { updates.push(`acquisition_cost = $${idx++}`); params.push(acquisitionCost); }
    if (updates.length === 0) return null;
    params.push(id);
    const query = `UPDATE vehicles.vehicles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
    const res = await pool.query(query, params);
    return res.rows[0];
}
async function markAvailable(id, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query('SELECT * FROM vehicles.vehicles WHERE id = $1 FOR UPDATE', [id]);
        if (!vRes.rows.length) throw new Error('NOT_FOUND');
        const vehicle = vRes.rows[0];
        if (vehicle.status === 'RETIRED') throw new Error('Vehicle is RETIRED');
        if (vehicle.status === 'ON_TRIP') throw new Error('Vehicle is ON_TRIP');
        const mRes = await client.query("SELECT id FROM vehicles.vehicle_maintenance WHERE vehicle_id = $1 AND status = 'ACTIVE'", [id]);
        if (mRes.rows.length > 0) throw new Error('Vehicle has ACTIVE maintenance');
        if (vehicle.status !== 'AVAILABLE') {
            await client.query("UPDATE vehicles.vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
            await client.query("INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by) VALUES ($1, $2, 'AVAILABLE', 'Marked available', $3)", [id, vehicle.status, userId]);
            await client.query("INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by) VALUES ($1, 'STATUS_CHANGED', 'Vehicle marked available', $2)", [id, userId]);
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function retireVehicle(id, reason, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query('SELECT * FROM vehicles.vehicles WHERE id = $1 FOR UPDATE', [id]);
        if (!vRes.rows.length) throw new Error('NOT_FOUND');
        const vehicle = vRes.rows[0];
        if (vehicle.status === 'RETIRED') throw new Error('Vehicle is already RETIRED');
        if (vehicle.status === 'ON_TRIP') throw new Error('Vehicle is ON_TRIP');
        const mRes = await client.query("SELECT id FROM vehicles.vehicle_maintenance WHERE vehicle_id = $1 AND status = 'ACTIVE'", [id]);
        if (mRes.rows.length > 0) throw new Error('Vehicle has ACTIVE maintenance');
        await client.query("UPDATE vehicles.vehicles SET status = 'RETIRED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
        await client.query("INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by) VALUES ($1, $2, 'RETIRED', $3, $4)", [id, vehicle.status, reason || 'Vehicle reached end of operational lifecycle', userId]);
        await client.query("INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by) VALUES ($1, 'RETIRED', $2, $3)", [id, reason || 'Vehicle retired from fleet', userId]);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function startMaintenance(vehicleId, data, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query('SELECT * FROM vehicles.vehicles WHERE id = $1 FOR UPDATE', [vehicleId]);
        if (!vRes.rows.length) throw new Error('NOT_FOUND');
        const vehicle = vRes.rows[0];
        if (vehicle.status === 'RETIRED') throw new Error('Vehicle is RETIRED');
        if (vehicle.status === 'ON_TRIP') throw new Error('Vehicle is ON_TRIP');
        if (data.cost !== undefined && data.cost < 0) throw new Error('Cost cannot be negative');
        const mRes = await client.query("SELECT id FROM vehicles.vehicle_maintenance WHERE vehicle_id = $1 AND status = 'ACTIVE'", [vehicleId]);
        if (mRes.rows.length > 0) throw new Error('Vehicle already has ACTIVE maintenance');

        const maintRes = await client.query(`
            INSERT INTO vehicles.vehicle_maintenance (vehicle_id, maintenance_type, description, start_date, cost, created_by)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
        `, [vehicleId, data.maintenanceType, data.description, data.startDate, data.cost || 0, userId]);

        await client.query("UPDATE vehicles.vehicles SET status = 'IN_SHOP', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicleId]);
        await client.query("INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by) VALUES ($1, $2, 'IN_SHOP', 'Maintenance started', $3)", [vehicleId, vehicle.status, userId]);
        await client.query("INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by) VALUES ($1, 'MAINTENANCE_STARTED', $2, $3)", [vehicleId, `${data.maintenanceType} started`, userId]);

        await client.query('COMMIT');
        return maintRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function completeMaintenance(vehicleId, maintenanceId, data, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query('SELECT * FROM vehicles.vehicles WHERE id = $1 FOR UPDATE', [vehicleId]);
        if (!vRes.rows.length) throw new Error('NOT_FOUND');
        const vehicle = vRes.rows[0];
        const mRes = await client.query('SELECT * FROM vehicles.vehicle_maintenance WHERE id = $1 AND vehicle_id = $2 FOR UPDATE', [maintenanceId, vehicleId]);
        if (!mRes.rows.length) throw new Error('MAINTENANCE_NOT_FOUND');
        const maintenance = mRes.rows[0];
        if (maintenance.status !== 'ACTIVE') throw new Error('Maintenance is not ACTIVE');
        if (data.endDate && new Date(data.endDate) < new Date(maintenance.start_date)) throw new Error('endDate cannot be before startDate');
        const cost = data.cost !== undefined ? data.cost : maintenance.cost;
        if (cost < 0) throw new Error('Cost cannot be negative');

        const updatedMaint = await client.query(`UPDATE vehicles.vehicle_maintenance SET status = 'COMPLETED', end_date = $1, cost = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`, [data.endDate || null, cost, maintenanceId]);
        if (vehicle.status !== 'RETIRED') {
            await client.query("UPDATE vehicles.vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicleId]);
            await client.query("INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by) VALUES ($1, $2, 'AVAILABLE', 'Maintenance completed', $3)", [vehicleId, vehicle.status, userId]);
        }
        await client.query("INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by) VALUES ($1, 'MAINTENANCE_COMPLETED', $2, $3)", [vehicleId, `${maintenance.maintenance_type} completed`, userId]);

        await client.query('COMMIT');
        return updatedMaint.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function cancelMaintenance(vehicleId, maintenanceId, data, userId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const vRes = await client.query('SELECT * FROM vehicles.vehicles WHERE id = $1 FOR UPDATE', [vehicleId]);
        if (!vRes.rows.length) throw new Error('NOT_FOUND');
        const vehicle = vRes.rows[0];
        const mRes = await client.query('SELECT * FROM vehicles.vehicle_maintenance WHERE id = $1 AND vehicle_id = $2 FOR UPDATE', [maintenanceId, vehicleId]);
        if (!mRes.rows.length) throw new Error('MAINTENANCE_NOT_FOUND');
        const maintenance = mRes.rows[0];
        if (maintenance.status !== 'ACTIVE') throw new Error('Maintenance is not ACTIVE');

        await client.query("UPDATE vehicles.vehicle_maintenance SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [maintenanceId]);
        const activeMaintRes = await client.query("SELECT id FROM vehicles.vehicle_maintenance WHERE vehicle_id = $1 AND status = 'ACTIVE' AND id != $2", [vehicleId, maintenanceId]);
        if (activeMaintRes.rows.length === 0 && vehicle.status !== 'RETIRED' && vehicle.status !== 'ON_TRIP') {
            await client.query("UPDATE vehicles.vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [vehicleId]);
            await client.query("INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by) VALUES ($1, $2, 'AVAILABLE', $3, $4)", [vehicleId, vehicle.status, data.reason || 'Maintenance cancelled', userId]);
            await client.query("INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by) VALUES ($1, 'STATUS_CHANGED', 'Maintenance cancelled', $2)", [vehicleId, userId]);
        }
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
async function getVehicleMaintenanceList(vehicleId, { status, startDate, endDate }) {
    let query = `
        SELECT m.*, v.name as vehicle_name, v.registration_number as vehicle_reg 
        FROM vehicles.vehicle_maintenance m 
        JOIN vehicles.vehicles v ON m.vehicle_id = v.id 
        WHERE m.vehicle_id = $1
    `;
    const params = [vehicleId];
    if (status) { params.push(status); query += ` AND m.status = $${params.length}`; }
    if (startDate) { params.push(startDate); query += ` AND m.start_date >= $${params.length}`; }
    if (endDate) { params.push(endDate); query += ` AND m.start_date <= $${params.length}`; }
    query += ` ORDER BY m.id DESC`;
    const res = await pool.query(query, params);
    return res.rows;
}

async function getAllMaintenance({ vehicleId, status, startDate, endDate, search }) {
    let query = `
        SELECT m.*, v.name as vehicle_name, v.registration_number as vehicle_reg
        FROM vehicles.vehicle_maintenance m
        JOIN vehicles.vehicles v ON m.vehicle_id = v.id
        WHERE 1=1
    `;
    const params = [];
    if (vehicleId) { params.push(vehicleId); query += ` AND m.vehicle_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND m.status = $${params.length}`; }
    if (startDate) { params.push(startDate); query += ` AND m.start_date >= $${params.length}`; }
    if (endDate) { params.push(endDate); query += ` AND m.start_date <= $${params.length}`; }
    if (search) {
        params.push(`%${search}%`);
        query += ` AND (v.registration_number ILIKE $${params.length} OR v.name ILIKE $${params.length} OR m.maintenance_type ILIKE $${params.length})`;
    }
    query += ` ORDER BY m.id DESC`;
    const res = await pool.query(query, params);
    return res.rows;
}

async function getVehicleStatusHistory(vehicleId) {
    const res = await pool.query(`SELECT * FROM vehicles.vehicle_status_history WHERE vehicle_id = $1 ORDER BY id DESC`, [vehicleId]);
    return res.rows;
}

async function getVehicleLifecycle(vehicleId) {
    const res = await pool.query(`SELECT * FROM vehicles.vehicle_lifecycle WHERE vehicle_id = $1 ORDER BY event_date ASC`, [vehicleId]);
    return res.rows;
}

async function getFleetUtilizationSummary() {
    const vRes = await pool.query('SELECT status FROM vehicles.vehicles');
    const vehicles = vRes.rows;
    const summary = {
        totalVehicles: vehicles.length,
        availableVehicles: vehicles.filter(v => v.status === 'AVAILABLE').length,
        vehiclesOnTrip: vehicles.filter(v => v.status === 'ON_TRIP').length,
        vehiclesInMaintenance: vehicles.filter(v => v.status === 'IN_SHOP').length,
        retiredVehicles: vehicles.filter(v => v.status === 'RETIRED').length,
        fleetUtilizationPercentage: 0
    };
    const activeFleet = summary.totalVehicles - summary.retiredVehicles;
    if (activeFleet > 0) {
        summary.fleetUtilizationPercentage = (summary.vehiclesOnTrip / activeFleet) * 100;
    }
    return summary;
}

async function getVehicleUtilization(vehicleId) {
    const res = await pool.query('SELECT * FROM vehicles.vehicle_utilization WHERE vehicle_id = $1', [vehicleId]);
    return res.rows[0] || null;
}

module.exports = {
    registerVehicle, getVehicles, getVehicleById, updateVehicle, markAvailable, retireVehicle,
    startMaintenance, completeMaintenance, cancelMaintenance, getVehicleMaintenanceList,
    getAllMaintenance, getVehicleStatusHistory, getVehicleLifecycle, getFleetUtilizationSummary, getVehicleUtilization
};
