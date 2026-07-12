const { pool } = require('../config/db');

async function getFuelEfficiency(filters) {
    const { startDate, endDate } = filters;
    const result = await pool.query(
        'SELECT * FROM analytics.get_vehicle_financials($1, $2)',
        [startDate || null, endDate || null]
    );

    let totalDistance = 0;
    let totalLiters = 0;
    const vehicles = [];

    for (const row of result.rows) {
        const distance = parseFloat(row.total_completed_distance);
        const liters = parseFloat(row.total_fuel_liters);

        totalDistance += distance;
        totalLiters += liters;

        let efficiency = null;
        if (liters > 0) {
            efficiency = parseFloat((distance / liters).toFixed(2));
        }

        vehicles.push({
            vehicleId: row.vehicle_id,
            registrationNumber: row.registration_number,
            name: row.name,
            distance,
            fuelLiters: liters,
            fuelEfficiency: efficiency
        });
    }

    let fleetAverage = null;
    if (totalLiters > 0) {
        fleetAverage = parseFloat((totalDistance / totalLiters).toFixed(2));
    }

    return {
        unit: 'KM/L',
        fleetAverage,
        vehicles
    };
}

async function getFleetUtilization() {
    const result = await pool.query(`
        SELECT status, COUNT(*) as count 
        FROM vehicles.vehicles 
        WHERE status != 'RETIRED'
        GROUP BY status
    `);

    let totalOperational = 0;
    let onTrip = 0;
    const distribution = [];

    for (const row of result.rows) {
        const count = parseInt(row.count, 10);
        totalOperational += count;
        if (row.status === 'ON_TRIP') onTrip = count;
        distribution.push({
            status: row.status,
            count
        });
    }

    let percentage = 0;
    if (totalOperational > 0) {
        percentage = parseFloat(((onTrip / totalOperational) * 100).toFixed(2));
    }

    return {
        fleetUtilizationPercentage: percentage,
        totalOperationalVehicles: totalOperational,
        onTripVehicles: onTrip,
        statusDistribution: distribution
    };
}

async function getOperationalCost(filters) {
    const { startDate, endDate } = filters;
    const result = await pool.query(
        'SELECT * FROM analytics.get_vehicle_financials($1, $2)',
        [startDate || null, endDate || null]
    );

    let totalOpCost = 0;
    let totalFuel = 0;
    let totalMaint = 0;
    const vehicles = [];

    for (const row of result.rows) {
        const fuelCost = parseFloat(row.total_fuel_cost);
        const maintCost = parseFloat(row.total_maintenance_cost);
        const opCost = parseFloat((fuelCost + maintCost).toFixed(2));

        totalOpCost += opCost;
        totalFuel += fuelCost;
        totalMaint += maintCost;

        vehicles.push({
            vehicleId: row.vehicle_id,
            registrationNumber: row.registration_number,
            name: row.name,
            fuelCost,
            maintenanceCost: maintCost,
            operationalCost: opCost
        });
    }

    return {
        totalOperationalCost: parseFloat(totalOpCost.toFixed(2)),
        totalFuelCost: parseFloat(totalFuel.toFixed(2)),
        totalMaintenanceCost: parseFloat(totalMaint.toFixed(2)),
        vehicles
    };
}

async function getVehicleROI(filters) {
    const { startDate, endDate } = filters;
    const result = await pool.query(
        'SELECT * FROM analytics.get_vehicle_financials($1, $2)',
        [startDate || null, endDate || null]
    );

    const vehicles = [];

    for (const row of result.rows) {
        const revenue = parseFloat(row.total_revenue);
        const fuelCost = parseFloat(row.total_fuel_cost);
        const maintCost = parseFloat(row.total_maintenance_cost);
        const opCost = fuelCost + maintCost;
        const acqCost = parseFloat(row.acquisition_cost);

        let roiRatio = null;
        let roiPercentage = null;

        if (acqCost > 0) {
            roiRatio = parseFloat(((revenue - opCost) / acqCost).toFixed(4));
            roiPercentage = parseFloat((roiRatio * 100).toFixed(2));
        }

        vehicles.push({
            vehicleId: row.vehicle_id,
            registrationNumber: row.registration_number,
            name: row.name,
            revenue,
            operationalCost: parseFloat(opCost.toFixed(2)),
            acquisitionCost: acqCost,
            roiRatio,
            roiPercentage
        });
    }

    return { vehicles };
}

async function getMonthlyRevenue(year) {
    const targetYear = year || new Date().getFullYear();
    const query = `
        WITH months AS (
            SELECT generate_series(1, 12) AS month_num
        ),
        monthly_revenue AS (
            SELECT 
                EXTRACT(MONTH FROM completed_at) AS month_num,
                SUM(revenue) AS revenue
            FROM trip_mgmt.trips
            WHERE status = 'COMPLETED' AND EXTRACT(YEAR FROM completed_at) = $1
            GROUP BY EXTRACT(MONTH FROM completed_at)
        )
        SELECT 
            m.month_num,
            TO_CHAR(TO_DATE(m.month_num::text, 'MM'), 'Month') AS month_name,
            COALESCE(mr.revenue, 0) AS revenue
        FROM months m
        LEFT JOIN monthly_revenue mr ON m.month_num = mr.month_num
        ORDER BY m.month_num;
    `;

    const result = await pool.query(query, [targetYear]);

    let totalRev = 0;
    const months = result.rows.map(r => {
        const rev = parseFloat(r.revenue);
        totalRev += rev;
        return {
            month: parseInt(r.month_num, 10),
            monthName: r.month_name.trim(),
            revenue: rev
        };
    });

    return {
        year: parseInt(targetYear, 10),
        totalRevenue: parseFloat(totalRev.toFixed(2)),
        months
    };
}

async function getTopCostliestVehicles(filters) {
    const { startDate, endDate, limit = 5 } = filters;
    const maxLimit = Math.min(parseInt(limit, 10) || 5, 20);

    const result = await pool.query(
        'SELECT * FROM analytics.get_vehicle_financials($1, $2)',
        [startDate || null, endDate || null]
    );

    const mapped = result.rows.map(row => {
        const fuel = parseFloat(row.total_fuel_cost);
        const maint = parseFloat(row.total_maintenance_cost);
        return {
            vehicleId: row.vehicle_id,
            registrationNumber: row.registration_number,
            name: row.name,
            operationalCost: parseFloat((fuel + maint).toFixed(2))
        };
    });

    mapped.sort((a, b) => b.operationalCost - a.operationalCost);

    const sliced = mapped.slice(0, maxLimit);
    const vehicles = sliced.map((v, i) => ({ rank: i + 1, ...v }));

    return { vehicles };
}

async function getOverview() {
    const fe = await getFuelEfficiency({});
    const util = await getFleetUtilization();
    const op = await getOperationalCost({});
    const roi = await getVehicleROI({});

    let totalRevenue = 0;
    let sumRoi = 0;
    let countRoi = 0;

    for (const v of roi.vehicles) {
        totalRevenue += v.revenue;
        if (v.roiPercentage !== null) {
            sumRoi += v.roiPercentage;
            countRoi++;
        }
    }

    const totalProfit = parseFloat((totalRevenue - op.totalOperationalCost).toFixed(2));
    const avgRoi = countRoi > 0 ? parseFloat((sumRoi / countRoi).toFixed(2)) : null;

    return {
        metrics: {
            fleetFuelEfficiency: fe.fleetAverage,
            fleetUtilizationPercentage: util.fleetUtilizationPercentage,
            totalOperationalCost: op.totalOperationalCost,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalProfit,
            averageVehicleRoiPercentage: avgRoi
        }
    };
}

async function getSpecificTripAnalytics(tripId) {
    const result = await pool.query(`
        SELECT 
            t.id AS trip_id,
            t.source,
            t.destination,
            t.status,
            t.vehicle_id,
            v.registration_number,
            t.actual_distance,
            t.revenue
        FROM trip_mgmt.trips t
        JOIN vehicles.vehicles v ON t.vehicle_id = v.id
        WHERE t.id = $1
    `, [tripId]);

    if (result.rows.length === 0) {
        throw new Error('Trip not found');
    }

    const tripData = result.rows[0];

    if (tripData.status !== 'COMPLETED') {
        return {
            analyticsFinalized: false,
            trip: {
                tripId: tripData.trip_id,
                source: tripData.source,
                destination: tripData.destination,
                status: tripData.status,
                vehicleId: tripData.vehicle_id,
                registrationNumber: tripData.registration_number,
                actualDistance: parseFloat(tripData.actual_distance || 0)
            }
        };
    }

    const finResult = await pool.query(`
        WITH fuel AS (
            SELECT COALESCE(SUM(cost), 0) AS cost, COALESCE(SUM(liters), 0) AS liters
            FROM finance_mgmt.fuel_logs
            WHERE trip_id = $1 AND is_voided = FALSE
        ),
        expenses AS (
            SELECT COALESCE(SUM(amount), 0) AS amount
            FROM finance_mgmt.expenses
            WHERE trip_id = $1 AND status = 'RECORDED'
        )
        SELECT 
            f.cost AS fuel_cost,
            f.liters AS fuel_liters,
            e.amount AS other_expenses
        FROM fuel f, expenses e;
    `, [tripId]);

    const fin = finResult.rows[0];
    const fuelCost = parseFloat(fin.fuel_cost);
    const fuelLiters = parseFloat(fin.fuel_liters);
    const otherExp = parseFloat(fin.other_expenses);
    const revenue = parseFloat(tripData.revenue);
    const distance = parseFloat(tripData.actual_distance);
    
    const opCost = parseFloat((fuelCost + otherExp).toFixed(2));
    const profit = parseFloat((revenue - opCost).toFixed(2));
    
    let fe = null;
    if (fuelLiters > 0) {
        fe = parseFloat((distance / fuelLiters).toFixed(2));
    }

    return {
        analyticsFinalized: true,
        trip: {
            tripId: tripData.trip_id,
            source: tripData.source,
            destination: tripData.destination,
            status: tripData.status,
            vehicleId: tripData.vehicle_id,
            registrationNumber: tripData.registration_number,
            actualDistance: distance
        },
        metrics: {
            revenue,
            operationalCost: opCost,
            profit,
            fuelLiters,
            fuelEfficiency: fe
        },
        costBreakdown: [
            { category: 'FUEL', amount: fuelCost },
            { category: 'OTHER_EXPENSES', amount: otherExp }
        ]
    };
}

async function getTripProfitability(filters) {
    const { startDate, endDate, vehicleId, limit = 100, sort = 'profit_desc' } = filters;
    const maxLimit = Math.min(parseInt(limit, 10) || 100, 500);

    const result = await pool.query(
        'SELECT * FROM analytics.get_trip_financials($1, $2, $3)',
        [startDate || null, endDate || null, vehicleId || null]
    );

    const mapped = result.rows.map(row => {
        const revenue = parseFloat(row.revenue);
        const fCost = parseFloat(row.trip_fuel_cost);
        const oExp = parseFloat(row.trip_other_expenses);
        const opCost = parseFloat((fCost + oExp).toFixed(2));
        const profit = parseFloat((revenue - opCost).toFixed(2));

        return {
            tripId: row.trip_id,
            source: row.source,
            destination: row.destination,
            registrationNumber: row.registration_number,
            revenue,
            operationalCost: opCost,
            profit
        };
    });

    if (sort === 'profit_desc') mapped.sort((a, b) => b.profit - a.profit);
    else if (sort === 'profit_asc') mapped.sort((a, b) => a.profit - b.profit);
    else if (sort === 'revenue_desc') mapped.sort((a, b) => b.revenue - a.revenue);
    else if (sort === 'cost_desc') mapped.sort((a, b) => b.operationalCost - a.operationalCost);

    return { trips: mapped.slice(0, maxLimit) };
}

async function getMonthlyProfitability(year) {
    const targetYear = year || new Date().getFullYear();
    const query = `
        WITH months AS (
            SELECT generate_series(1, 12) AS month_num
        ),
        monthly_data AS (
            SELECT 
                EXTRACT(MONTH FROM t.completed_at) AS month_num,
                SUM(t.revenue) AS revenue,
                COALESCE((
                    SELECT SUM(f.cost) FROM finance_mgmt.fuel_logs f 
                    WHERE f.trip_id = t.id AND f.is_voided = FALSE
                ), 0) AS fuel_cost,
                COALESCE((
                    SELECT SUM(e.amount) FROM finance_mgmt.expenses e 
                    WHERE e.trip_id = t.id AND e.status = 'RECORDED'
                ), 0) AS other_expenses
            FROM trip_mgmt.trips t
            WHERE t.status = 'COMPLETED' AND EXTRACT(YEAR FROM t.completed_at) = $1
            GROUP BY t.id
        ),
        aggregated_months AS (
            SELECT 
                month_num,
                SUM(revenue) AS revenue,
                SUM(fuel_cost + other_expenses) AS operational_cost
            FROM monthly_data
            GROUP BY month_num
        )
        SELECT 
            m.month_num,
            TO_CHAR(TO_DATE(m.month_num::text, 'MM'), 'Month') AS month_name,
            COALESCE(am.revenue, 0) AS revenue,
            COALESCE(am.operational_cost, 0) AS operational_cost
        FROM months m
        LEFT JOIN aggregated_months am ON m.month_num = am.month_num
        ORDER BY m.month_num;
    `;

    const result = await pool.query(query, [targetYear]);

    const months = result.rows.map(r => {
        const rev = parseFloat(r.revenue);
        const opCost = parseFloat(r.operational_cost);
        return {
            month: parseInt(r.month_num, 10),
            monthName: r.month_name.trim(),
            revenue: rev,
            operationalCost: opCost,
            profit: parseFloat((rev - opCost).toFixed(2))
        };
    });

    return {
        year: parseInt(targetYear, 10),
        months
    };
}

module.exports = {
    getFuelEfficiency,
    getFleetUtilization,
    getOperationalCost,
    getVehicleROI,
    getMonthlyRevenue,
    getTopCostliestVehicles,
    getOverview,
    getSpecificTripAnalytics,
    getTripProfitability,
    getMonthlyProfitability
};
