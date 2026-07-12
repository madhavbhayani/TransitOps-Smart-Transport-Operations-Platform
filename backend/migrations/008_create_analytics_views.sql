CREATE SCHEMA IF NOT EXISTS analytics;

-- Function: Get vehicle financials with optional date filtering
CREATE OR REPLACE FUNCTION analytics.get_vehicle_financials(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    vehicle_id INTEGER,
    registration_number VARCHAR(50),
    name VARCHAR(150),
    status VARCHAR(30),
    acquisition_cost NUMERIC(15,2),
    total_fuel_cost NUMERIC,
    total_fuel_liters NUMERIC,
    total_maintenance_cost NUMERIC,
    total_revenue NUMERIC,
    total_completed_distance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH fuel_agg AS (
        SELECT 
            f.vehicle_id, 
            SUM(f.cost) AS fuel_cost, 
            SUM(f.liters) AS fuel_liters
        FROM finance_mgmt.fuel_logs f
        WHERE f.is_voided = FALSE
          AND (p_start_date IS NULL OR f.fuel_date >= p_start_date)
          AND (p_end_date IS NULL OR f.fuel_date <= p_end_date)
        GROUP BY f.vehicle_id
    ),
    maint_agg AS (
        SELECT 
            m.vehicle_id, 
            SUM(m.cost) AS maint_cost
        FROM vehicles.vehicle_maintenance m
        WHERE m.status = 'COMPLETED'
          AND (p_start_date IS NULL OR m.end_date >= p_start_date)
          AND (p_end_date IS NULL OR m.end_date <= p_end_date)
        GROUP BY m.vehicle_id
    ),
    trip_agg AS (
        SELECT 
            t.vehicle_id, 
            SUM(t.revenue) AS revenue, 
            SUM(t.actual_distance) AS distance
        FROM trip_mgmt.trips t
        WHERE t.status = 'COMPLETED'
          AND (p_start_date IS NULL OR t.completed_at::DATE >= p_start_date)
          AND (p_end_date IS NULL OR t.completed_at::DATE <= p_end_date)
        GROUP BY t.vehicle_id
    )
    SELECT 
        v.id,
        v.registration_number,
        v.name,
        v.status,
        v.acquisition_cost,
        COALESCE(f.fuel_cost, 0) AS total_fuel_cost,
        COALESCE(f.fuel_liters, 0) AS total_fuel_liters,
        COALESCE(m.maint_cost, 0) AS total_maintenance_cost,
        COALESCE(t.revenue, 0) AS total_revenue,
        COALESCE(t.distance, 0) AS total_completed_distance
    FROM vehicles.vehicles v
    LEFT JOIN fuel_agg f ON v.id = f.vehicle_id
    LEFT JOIN maint_agg m ON v.id = m.vehicle_id
    LEFT JOIN trip_agg t ON v.id = t.vehicle_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get trip specific financials with optional date filtering
CREATE OR REPLACE FUNCTION analytics.get_trip_financials(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_vehicle_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    trip_id INTEGER,
    source VARCHAR(255),
    destination VARCHAR(255),
    vehicle_id INTEGER,
    registration_number VARCHAR(50),
    status trip_mgmt.trip_status,
    completed_at TIMESTAMP,
    revenue NUMERIC,
    actual_distance NUMERIC,
    trip_fuel_cost NUMERIC,
    trip_fuel_liters NUMERIC,
    trip_other_expenses NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH trip_fuel AS (
        SELECT 
            f.trip_id, 
            SUM(f.cost) AS fuel_cost, 
            SUM(f.liters) AS fuel_liters
        FROM finance_mgmt.fuel_logs f
        WHERE f.is_voided = FALSE AND f.trip_id IS NOT NULL
        GROUP BY f.trip_id
    ),
    trip_expenses AS (
        SELECT 
            e.trip_id, 
            SUM(e.amount) AS other_amount
        FROM finance_mgmt.expenses e
        WHERE e.status = 'RECORDED' AND e.trip_id IS NOT NULL
        GROUP BY e.trip_id
    )
    SELECT 
        t.id,
        t.source,
        t.destination,
        t.vehicle_id,
        v.registration_number,
        t.status,
        t.completed_at,
        t.revenue,
        t.actual_distance,
        COALESCE(tf.fuel_cost, 0) AS trip_fuel_cost,
        COALESCE(tf.fuel_liters, 0) AS trip_fuel_liters,
        COALESCE(te.other_amount, 0) AS trip_other_expenses
    FROM trip_mgmt.trips t
    JOIN vehicles.vehicles v ON t.vehicle_id = v.id
    LEFT JOIN trip_fuel tf ON t.id = tf.trip_id
    LEFT JOIN trip_expenses te ON t.id = te.trip_id
    WHERE t.status = 'COMPLETED'
      AND (p_start_date IS NULL OR t.completed_at::DATE >= p_start_date)
      AND (p_end_date IS NULL OR t.completed_at::DATE <= p_end_date)
      AND (p_vehicle_id IS NULL OR t.vehicle_id = p_vehicle_id);
END;
$$ LANGUAGE plpgsql;
