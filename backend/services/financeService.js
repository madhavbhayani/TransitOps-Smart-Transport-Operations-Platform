const { pool } = require('../config/db');
async function recordFuelLog(data, userId) {
    const { vehicleId, tripId, liters, cost, fuelDate, odometer, notes } = data;
    try {
        const result = await pool.query(
            'SELECT * FROM finance_mgmt.record_fuel_log($1, $2, $3, $4, $5, $6, $7, $8)',
            [vehicleId, tripId || null, liters, cost, fuelDate, odometer || null, notes || null, userId]
        );
        return result.rows[0];
    } catch (err) {
        throw new Error(err.message || 'Failed to record fuel log');
    }
}
async function recordExpense(data, userId) {
    const { vehicleId, tripId, expenseType, amount, expenseDate, description } = data;
    if (expenseType === 'MAINTENANCE') {
        throw new Error('Maintenance costs must be tracked through Vehicle Maintenance module');
    }
    try {
        const result = await pool.query(
            'SELECT * FROM finance_mgmt.record_expense($1, $2, $3, $4, $5, $6, $7)',
            [vehicleId, tripId || null, expenseType, amount, expenseDate, description || null, userId]
        );
        return result.rows[0];
    } catch (err) {
        throw new Error(err.message || 'Failed to record expense');
    }
}
async function voidFuelLog(id, reason, userId) {
    try {
        const result = await pool.query(
            'SELECT * FROM finance_mgmt.void_fuel_log($1, $2, $3)',
            [id, reason, userId]
        );
        return result.rows[0];
    } catch (err) {
        throw new Error(err.message || 'Failed to void fuel log');
    }
}
async function voidExpense(id, reason, userId) {
    try {
        const result = await pool.query(
            'SELECT * FROM finance_mgmt.void_expense($1, $2, $3)',
            [id, reason, userId]
        );
        return result.rows[0];
    } catch (err) {
        throw new Error(err.message || 'Failed to void expense');
    }
}
async function getFuelLogs(filters = {}) {
    let query = `
    SELECT fl.*, 
               v.registration_number, v.name AS vehicle_name,
               t.source AS trip_source, t.destination AS trip_destination,
               u.name AS recorded_by_name
    FROM finance_mgmt.fuel_logs fl
    JOIN vehicles.vehicles v ON fl.vehicle_id = v.id
    LEFT JOIN trip_mgmt.trips t ON fl.trip_id = t.id
    JOIN users.users u ON fl.recorded_by = u.id
    WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (filters.vehicleId) { query += ` AND fl.vehicle_id = $${idx++}`; params.push(filters.vehicleId); }
    if (filters.tripId) { query += ` AND fl.trip_id = $${idx++}`; params.push(filters.tripId); }
    if (filters.startDate) { query += ` AND fl.fuel_date >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { query += ` AND fl.fuel_date <= $${idx++}`; params.push(filters.endDate); }


    if (filters.onlyVoided === 'true' || filters.onlyVoided === true) {
        query += ` AND fl.is_voided = TRUE`;
    } else if (filters.includeVoided === 'true' || filters.includeVoided === true) {
        // no additional filter
    } else {
        query += ` AND fl.is_voided = FALSE`;
    }
    query += ` ORDER BY fl.fuel_date DESC, fl.id DESC`;
    const result = await pool.query(query, params);
    return result.rows;
}
async function getFuelLogDetails(id) {
    const query = `
    SELECT fl.*, 
               v.registration_number, v.name AS vehicle_name,
               t.source AS trip_source, t.destination AS trip_destination,
               u.name AS recorded_by_name,
               vu.name AS voided_by_name
    FROM finance_mgmt.fuel_logs fl
    JOIN vehicles.vehicles v ON fl.vehicle_id = v.id
    LEFT JOIN trip_mgmt.trips t ON fl.trip_id = t.id
    JOIN users.users u ON fl.recorded_by = u.id
    LEFT JOIN users.users vu ON fl.voided_by = vu.id
    WHERE fl.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows.length ? result.rows[0] : null;
}
async function getExpenses(filters = {}) {
    let query = `
    SELECT e.*, 
               v.registration_number, v.name AS vehicle_name,
               t.source AS trip_source, t.destination AS trip_destination,
               u.name AS recorded_by_name
    FROM finance_mgmt.expenses e
    JOIN vehicles.vehicles v ON e.vehicle_id = v.id
    LEFT JOIN trip_mgmt.trips t ON e.trip_id = t.id
    JOIN users.users u ON e.recorded_by = u.id
    WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (filters.vehicleId) { query += ` AND e.vehicle_id = $${idx++}`; params.push(filters.vehicleId); }
    if (filters.tripId) { query += ` AND e.trip_id = $${idx++}`; params.push(filters.tripId); }
    if (filters.expenseType) { query += ` AND e.expense_type = $${idx++}`; params.push(filters.expenseType); }
    if (filters.status) { query += ` AND e.status = $${idx++}`; params.push(filters.status); }
    else { query += ` AND e.status = 'RECORDED'`; }
    if (filters.startDate) { query += ` AND e.expense_date >= $${idx++}`; params.push(filters.startDate); }
    if (filters.endDate) { query += ` AND e.expense_date <= $${idx++}`; params.push(filters.endDate); }
    query += ` ORDER BY e.expense_date DESC, e.id DESC`;
    const result = await pool.query(query, params);
    return result.rows;
}
async function getExpenseDetails(id) {
    const expenseQuery = `
    SELECT e.*, 
               v.registration_number, v.name AS vehicle_name,
               t.source AS trip_source, t.destination AS trip_destination,
               u.name AS recorded_by_name,
               vu.name AS voided_by_name
    FROM finance_mgmt.expenses e
    JOIN vehicles.vehicles v ON e.vehicle_id = v.id
    LEFT JOIN trip_mgmt.trips t ON e.trip_id = t.id
    JOIN users.users u ON e.recorded_by = u.id
    LEFT JOIN users.users vu ON e.voided_by = vu.id
    WHERE e.id = $1
    `;
    const expenseRes = await pool.query(expenseQuery, [id]);
    if (!expenseRes.rows.length) return null;
    const historyQuery = `
    SELECT h.*, u.name AS changed_by_name
    FROM finance_mgmt.expense_status_history h
    JOIN users.users u ON h.changed_by = u.id
    WHERE h.expense_id = $1
    ORDER BY h.created_at DESC
    `;
    const historyRes = await pool.query(historyQuery, [id]);
    return {
        expense: expenseRes.rows[0],
        statusHistory: historyRes.rows
    };
}
async function getVehicleOperationalCost(vehicleId) {
    const fuelRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_fuel_cost
    FROM finance_mgmt.fuel_logs
    WHERE vehicle_id = $1 AND is_voided = FALSE
    `, [vehicleId]);

    const maintRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_maintenance_cost
    FROM vehicles.vehicle_maintenance
    WHERE vehicle_id = $1 AND status = 'COMPLETED'
    `, [vehicleId]);
    const otherRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_other_expenses
    FROM finance_mgmt.expenses
    WHERE vehicle_id = $1 AND status = 'RECORDED'
    `, [vehicleId]);
    const fuelCost = parseFloat(fuelRes.rows[0].total_fuel_cost);
    const maintenanceCost = parseFloat(maintRes.rows[0].total_maintenance_cost);
    const otherExpenses = parseFloat(otherRes.rows[0].total_other_expenses);
    const operationalCost = fuelCost + maintenanceCost;
    const totalTrackedExpenses = operationalCost + otherExpenses;
    return {
        vehicleId: parseInt(vehicleId, 10),
        fuelCost,
        maintenanceCost,
        operationalCost,
        otherExpenses,
        totalTrackedExpenses
    };
}
async function getVehicleFuelEfficiency(vehicleId) {
    const tripRes = await pool.query(`
    SELECT COALESCE(SUM(actual_distance), 0) AS total_completed_distance
    FROM trip_mgmt.trips
    WHERE vehicle_id = $1 AND status = 'COMPLETED'
    `, [vehicleId]);
    const fuelRes = await pool.query(`
    SELECT COALESCE(SUM(liters), 0) AS total_fuel_liters
    FROM finance_mgmt.fuel_logs
    WHERE vehicle_id = $1 AND is_voided = FALSE
    `, [vehicleId]);
    const totalCompletedDistance = parseFloat(tripRes.rows[0].total_completed_distance);
    const totalFuelLiters = parseFloat(fuelRes.rows[0].total_fuel_liters);
    let fuelEfficiency = null;
    if (totalFuelLiters > 0) {
        fuelEfficiency = totalCompletedDistance / totalFuelLiters;
        fuelEfficiency = parseFloat(fuelEfficiency.toFixed(2));
    }
    return {
        vehicleId: parseInt(vehicleId, 10),
        totalCompletedDistance,
        totalFuelLiters,
        fuelEfficiency,
        unit: 'KM/L'
    };
}
async function getVehicleROI(vehicleId) {
    const vehicleRes = await pool.query('SELECT acquisition_cost FROM vehicles.vehicles WHERE id = $1', [vehicleId]);
    if (!vehicleRes.rows.length) throw new Error('Vehicle not found');
    const acquisitionCost = parseFloat(vehicleRes.rows[0].acquisition_cost);
    const tripRes = await pool.query(`
    SELECT COALESCE(SUM(revenue), 0) AS total_revenue
    FROM trip_mgmt.trips
    WHERE vehicle_id = $1 AND status = 'COMPLETED'
    `, [vehicleId]);
    const fuelRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_fuel_cost
    FROM finance_mgmt.fuel_logs
    WHERE vehicle_id = $1 AND is_voided = FALSE
    `, [vehicleId]);

    const maintRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_maintenance_cost
    FROM vehicles.vehicle_maintenance
    WHERE vehicle_id = $1 AND status = 'COMPLETED'
    `, [vehicleId]);
    const revenue = parseFloat(tripRes.rows[0].total_revenue);
    const fuelCost = parseFloat(fuelRes.rows[0].total_fuel_cost);
    const maintenanceCost = parseFloat(maintRes.rows[0].total_maintenance_cost);
    let roiRatio = null;
    let roiPercentage = null;
    if (acquisitionCost > 0) {
        roiRatio = (revenue - (maintenanceCost + fuelCost)) / acquisitionCost;
        roiPercentage = parseFloat((roiRatio * 100).toFixed(2));
        roiRatio = parseFloat(roiRatio.toFixed(4));
    }
    return {
        vehicleId: parseInt(vehicleId, 10),
        revenue,
        maintenanceCost,
        fuelCost,
        acquisitionCost,
        roiRatio,
        roiPercentage
    };
}
async function getVehicleFinancialSummary(vehicleId) {
    const [vehicleInfo, opCost, efficiency, roi] = await Promise.all([
        pool.query('SELECT id, registration_number, name FROM vehicles.vehicles WHERE id = $1', [vehicleId]),
        getVehicleOperationalCost(vehicleId),
        getVehicleFuelEfficiency(vehicleId),
        getVehicleROI(vehicleId)
    ]);
    if (!vehicleInfo.rows.length) throw new Error('Vehicle not found');
    return {
        vehicle: vehicleInfo.rows[0],
        totalFuelLiters: efficiency.totalFuelLiters,
        fuelCost: opCost.fuelCost,
        maintenanceCost: opCost.maintenanceCost,
        operationalCost: opCost.operationalCost,
        otherExpenses: opCost.otherExpenses,
        totalTrackedExpenses: opCost.totalTrackedExpenses,
        completedTripDistance: efficiency.totalCompletedDistance,
        fuelEfficiency: efficiency.fuelEfficiency,
        completedTripRevenue: roi.revenue,
        roiRatio: roi.roiRatio,
        roiPercentage: roi.roiPercentage
    };
}
async function getDashboardSummary() {
    const fuelRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_fuel_cost, COALESCE(SUM(liters), 0) AS total_fuel_liters
    FROM finance_mgmt.fuel_logs
    WHERE is_voided = FALSE
    `);

    const maintRes = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) AS total_maintenance_cost
    FROM vehicles.vehicle_maintenance
    WHERE status = 'COMPLETED'
    `);
    const otherRes = await pool.query(`
    SELECT COALESCE(SUM(amount), 0) AS total_other_expenses
    FROM finance_mgmt.expenses
    WHERE status = 'RECORDED'
    `);
    const tripRes = await pool.query(`
    SELECT COALESCE(SUM(revenue), 0) AS total_revenue, COALESCE(SUM(actual_distance), 0) AS total_distance
    FROM trip_mgmt.trips
    WHERE status = 'COMPLETED'
    `);
    const totalFuelCost = parseFloat(fuelRes.rows[0].total_fuel_cost);
    const totalFuelLiters = parseFloat(fuelRes.rows[0].total_fuel_liters);
    const totalMaintenanceCost = parseFloat(maintRes.rows[0].total_maintenance_cost);
    const totalOtherExpenses = parseFloat(otherRes.rows[0].total_other_expenses);
    const totalCompletedTripRevenue = parseFloat(tripRes.rows[0].total_revenue);
    const totalCompletedDistance = parseFloat(tripRes.rows[0].total_distance);
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
    const totalTrackedExpenses = totalOperationalCost + totalOtherExpenses;
    let averageFleetFuelEfficiency = null;
    if (totalFuelLiters > 0) {
        averageFleetFuelEfficiency = parseFloat((totalCompletedDistance / totalFuelLiters).toFixed(2));
    }
    return {
        totalFuelCost,
        totalMaintenanceCost,
        totalOperationalCost,
        totalOtherExpenses,
        totalTrackedExpenses,
        totalFuelLiters,
        averageFleetFuelEfficiency,
        totalCompletedTripRevenue
    };
}
async function searchFinancials({ search }) {
    const param = `%${search}%`;
    const fuelRes = await pool.query(`
    SELECT fl.*, v.registration_number, v.name AS vehicle_name
    FROM finance_mgmt.fuel_logs fl
    JOIN vehicles.vehicles v ON fl.vehicle_id = v.id
    WHERE v.registration_number ILIKE $1 OR v.name ILIKE $1 OR fl.notes ILIKE $1
    ORDER BY fl.id DESC LIMIT 50
    `, [param]);
    const expenseRes = await pool.query(`
    SELECT e.*, v.registration_number, v.name AS vehicle_name
    FROM finance_mgmt.expenses e
    JOIN vehicles.vehicles v ON e.vehicle_id = v.id
    WHERE v.registration_number ILIKE $1 OR v.name ILIKE $1 OR e.description ILIKE $1
    ORDER BY e.id DESC LIMIT 50
    `, [param]);
    return {
        fuelLogs: fuelRes.rows,
        expenses: expenseRes.rows
    };
}
module.exports = {
    recordFuelLog,
    recordExpense,
    voidFuelLog,
    voidExpense,
    getFuelLogs,
    getFuelLogDetails,
    getExpenses,
    getExpenseDetails,
    getVehicleOperationalCost,
    getVehicleFuelEfficiency,
    getVehicleROI,
    getVehicleFinancialSummary,
    getDashboardSummary,
    searchFinancials
}
