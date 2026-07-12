-- 1. Alter existing table drivers.drivers to add new columns
ALTER TABLE drivers.drivers
ADD COLUMN IF NOT EXISTS license_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_number VARCHAR(30);

-- Set defaults for existing rows (if any) then set NOT NULL
UPDATE drivers.drivers SET license_category = 'UNKNOWN' WHERE license_category IS NULL;
UPDATE drivers.drivers SET contact_number = 'UNKNOWN' WHERE contact_number IS NULL;

ALTER TABLE drivers.drivers ALTER COLUMN license_category SET NOT NULL;
ALTER TABLE drivers.drivers ALTER COLUMN contact_number SET NOT NULL;

-- 2. Create drivers.driver_status_history
CREATE TABLE IF NOT EXISTS drivers.driver_status_history (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    reason TEXT,
    changed_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_status_driver FOREIGN KEY (driver_id) REFERENCES drivers.drivers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_driver_status_user FOREIGN KEY (changed_by) REFERENCES users.users(id) ON DELETE RESTRICT
);

-- 3. Create drivers.driver_safety_history
CREATE TABLE IF NOT EXISTS drivers.driver_safety_history (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    previous_score INTEGER,
    new_score INTEGER NOT NULL,
    reason TEXT,
    changed_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_driver_safety_driver FOREIGN KEY (driver_id) REFERENCES drivers.drivers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_driver_safety_user FOREIGN KEY (changed_by) REFERENCES users.users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_new_score CHECK (new_score >= 0 AND new_score <= 100)
);

-- 4. Update trip_mgmt PL/pgSQL functions to log into driver_status_history
-- FUNCTION: trip_mgmt.dispatch_trip
CREATE OR REPLACE FUNCTION trip_mgmt.dispatch_trip(p_trip_id INT, p_user_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
    v_vehicle RECORD;
    v_driver RECORD;
BEGIN
    SELECT * INTO v_trip FROM trip_mgmt.trips WHERE id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    SELECT * INTO v_vehicle FROM vehicles.vehicles WHERE id = v_trip.vehicle_id FOR UPDATE;
    SELECT * INTO v_driver FROM drivers.drivers WHERE id = v_trip.driver_id FOR UPDATE;

    IF v_trip.status != 'DRAFT' THEN
        RAISE EXCEPTION 'Trip must be in DRAFT status to be dispatched';
    END IF;
    IF v_vehicle.status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Vehicle is not AVAILABLE';
    END IF;
    IF v_driver.status != 'AVAILABLE' THEN
        RAISE EXCEPTION 'Driver is not AVAILABLE';
    END IF;
    IF v_driver.license_expiry < CURRENT_DATE THEN
        RAISE EXCEPTION 'Driver license is expired';
    END IF;
    IF v_trip.cargo_weight > v_vehicle.max_load_capacity THEN
        RAISE EXCEPTION 'Cargo weight exceeds vehicle max load capacity';
    END IF;

    UPDATE trip_mgmt.trips 
    SET status = 'DISPATCHED', dispatched_at = CURRENT_TIMESTAMP, initial_odometer = v_vehicle.odometer, updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_trip_id;

    UPDATE vehicles.vehicles SET status = 'ON_TRIP', updated_at = CURRENT_TIMESTAMP WHERE id = v_trip.vehicle_id;
    UPDATE drivers.drivers SET status = 'ON_TRIP' WHERE id = v_trip.driver_id;

    INSERT INTO trip_mgmt.trip_status_history (trip_id, previous_status, new_status, reason, changed_by)
    VALUES (p_trip_id, 'DRAFT', 'DISPATCHED', 'Trip dispatched', p_user_id);

    INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by)
    VALUES (v_trip.vehicle_id, 'AVAILABLE', 'ON_TRIP', 'Trip dispatched', p_user_id);

    INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by)
    VALUES (v_trip.vehicle_id, 'STATUS_CHANGED', 'Dispatched on trip ' || p_trip_id, p_user_id);

    -- NEW: DRIVER STATUS HISTORY
    INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
    VALUES (v_trip.driver_id, 'AVAILABLE', 'ON_TRIP', 'Dispatched on trip ' || p_trip_id, p_user_id);

    UPDATE vehicles.vehicle_utilization SET total_trips = total_trips + 1, updated_at = CURRENT_TIMESTAMP WHERE vehicle_id = v_trip.vehicle_id;
END;
$$;

-- FUNCTION: trip_mgmt.complete_trip
CREATE OR REPLACE FUNCTION trip_mgmt.complete_trip(p_trip_id INT, p_final_odometer NUMERIC, p_fuel_consumed NUMERIC, p_user_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
    v_vehicle RECORD;
    v_driver RECORD;
    v_actual_distance NUMERIC;
BEGIN
    SELECT * INTO v_trip FROM trip_mgmt.trips WHERE id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    SELECT * INTO v_vehicle FROM vehicles.vehicles WHERE id = v_trip.vehicle_id FOR UPDATE;
    SELECT * INTO v_driver FROM drivers.drivers WHERE id = v_trip.driver_id FOR UPDATE;

    IF v_trip.status != 'DISPATCHED' THEN
        RAISE EXCEPTION 'Trip must be in DISPATCHED status to be completed';
    END IF;
    IF v_vehicle.status != 'ON_TRIP' THEN
        RAISE EXCEPTION 'Vehicle is not ON_TRIP';
    END IF;
    IF v_driver.status != 'ON_TRIP' THEN
        RAISE EXCEPTION 'Driver is not ON_TRIP';
    END IF;
    IF p_final_odometer < v_vehicle.odometer THEN
        RAISE EXCEPTION 'Final odometer cannot be less than current vehicle odometer';
    END IF;

    v_actual_distance := p_final_odometer - COALESCE(v_trip.initial_odometer, v_vehicle.odometer);

    UPDATE trip_mgmt.trips 
    SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, 
        final_odometer = p_final_odometer, actual_distance = v_actual_distance, fuel_consumed = p_fuel_consumed, updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_trip_id;

    UPDATE vehicles.vehicles SET status = 'AVAILABLE', odometer = p_final_odometer, updated_at = CURRENT_TIMESTAMP WHERE id = v_trip.vehicle_id;
    UPDATE drivers.drivers SET status = 'AVAILABLE' WHERE id = v_trip.driver_id;

    INSERT INTO trip_mgmt.trip_status_history (trip_id, previous_status, new_status, reason, changed_by)
    VALUES (p_trip_id, 'DISPATCHED', 'COMPLETED', 'Trip completed', p_user_id);

    INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by)
    VALUES (v_trip.vehicle_id, 'ON_TRIP', 'AVAILABLE', 'Trip completed', p_user_id);

    INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by)
    VALUES (v_trip.vehicle_id, 'STATUS_CHANGED', 'Completed trip ' || p_trip_id, p_user_id);

    -- NEW: DRIVER STATUS HISTORY
    INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
    VALUES (v_trip.driver_id, 'ON_TRIP', 'AVAILABLE', 'Completed trip ' || p_trip_id, p_user_id);

    UPDATE vehicles.vehicle_utilization 
    SET completed_trips = completed_trips + 1, total_distance = total_distance + v_actual_distance, active_distance = active_distance + v_actual_distance, updated_at = CURRENT_TIMESTAMP 
    WHERE vehicle_id = v_trip.vehicle_id;
END;
$$;

-- FUNCTION: trip_mgmt.cancel_trip
CREATE OR REPLACE FUNCTION trip_mgmt.cancel_trip(p_trip_id INT, p_reason TEXT, p_user_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip RECORD;
    v_vehicle RECORD;
    v_driver RECORD;
BEGIN
    SELECT * INTO v_trip FROM trip_mgmt.trips WHERE id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip % not found', p_trip_id;
    END IF;

    IF v_trip.status = 'COMPLETED' OR v_trip.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot cancel a COMPLETED or CANCELLED trip';
    END IF;

    UPDATE trip_mgmt.trips 
    SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = p_reason, updated_at = CURRENT_TIMESTAMP 
    WHERE id = p_trip_id;

    INSERT INTO trip_mgmt.trip_status_history (trip_id, previous_status, new_status, reason, changed_by)
    VALUES (p_trip_id, v_trip.status, 'CANCELLED', p_reason, p_user_id);

    IF v_trip.status = 'DISPATCHED' THEN
        SELECT * INTO v_vehicle FROM vehicles.vehicles WHERE id = v_trip.vehicle_id FOR UPDATE;
        SELECT * INTO v_driver FROM drivers.drivers WHERE id = v_trip.driver_id FOR UPDATE;

        UPDATE vehicles.vehicles SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = v_trip.vehicle_id;
        UPDATE drivers.drivers SET status = 'AVAILABLE' WHERE id = v_trip.driver_id;

        INSERT INTO vehicles.vehicle_status_history (vehicle_id, previous_status, new_status, reason, changed_by)
        VALUES (v_trip.vehicle_id, 'ON_TRIP', 'AVAILABLE', 'Trip cancelled', p_user_id);

        INSERT INTO vehicles.vehicle_lifecycle (vehicle_id, event_type, description, recorded_by)
        VALUES (v_trip.vehicle_id, 'STATUS_CHANGED', 'Trip cancelled ' || p_trip_id, p_user_id);

        -- NEW: DRIVER STATUS HISTORY
        INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
        VALUES (v_trip.driver_id, 'ON_TRIP', 'AVAILABLE', 'Trip cancelled ' || p_trip_id, p_user_id);
    END IF;
END;
$$;
