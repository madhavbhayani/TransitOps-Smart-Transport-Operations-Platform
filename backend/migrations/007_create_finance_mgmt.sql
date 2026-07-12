CREATE SCHEMA IF NOT EXISTS finance_mgmt;

DO $$ BEGIN
    CREATE TYPE finance_mgmt.expense_type AS ENUM ('TOLL', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE finance_mgmt.expense_status AS ENUM ('RECORDED', 'VOIDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS finance_mgmt.fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    trip_id INTEGER,
    liters NUMERIC(12,3) NOT NULL,
    cost NUMERIC(15,2) NOT NULL,
    fuel_date DATE NOT NULL,
    odometer NUMERIC(15,2),
    recorded_by INTEGER NOT NULL,
    notes TEXT,
    is_voided BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT,
    voided_by INTEGER,
    voided_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles.vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_trip FOREIGN KEY (trip_id) REFERENCES trip_mgmt.trips(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_recorded_by FOREIGN KEY (recorded_by) REFERENCES users.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fuel_voided_by FOREIGN KEY (voided_by) REFERENCES users.users(id) ON DELETE RESTRICT,

    CONSTRAINT chk_fuel_liters CHECK (liters > 0),
    CONSTRAINT chk_fuel_cost CHECK (cost >= 0),
    CONSTRAINT chk_fuel_odometer CHECK (odometer IS NULL OR odometer >= 0)
);

CREATE TABLE IF NOT EXISTS finance_mgmt.expenses (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    trip_id INTEGER,
    expense_type finance_mgmt.expense_type NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    status finance_mgmt.expense_status NOT NULL DEFAULT 'RECORDED',
    recorded_by INTEGER NOT NULL,
    voided_by INTEGER,
    voided_at TIMESTAMP,
    void_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles.vehicles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_expense_trip FOREIGN KEY (trip_id) REFERENCES trip_mgmt.trips(id) ON DELETE RESTRICT,
    CONSTRAINT fk_expense_recorded_by FOREIGN KEY (recorded_by) REFERENCES users.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_expense_voided_by FOREIGN KEY (voided_by) REFERENCES users.users(id) ON DELETE RESTRICT,

    CONSTRAINT chk_expense_amount CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS finance_mgmt.expense_status_history (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL,
    previous_status finance_mgmt.expense_status,
    new_status finance_mgmt.expense_status NOT NULL,
    reason TEXT,
    changed_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expense_history FOREIGN KEY (expense_id) REFERENCES finance_mgmt.expenses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_expense_history_user FOREIGN KEY (changed_by) REFERENCES users.users(id) ON DELETE RESTRICT
);

-- PL/pgSQL Function: record_fuel_log
CREATE OR REPLACE FUNCTION finance_mgmt.record_fuel_log(
    p_vehicle_id INT, p_trip_id INT, p_liters NUMERIC, p_cost NUMERIC, 
    p_fuel_date DATE, p_odometer NUMERIC, p_notes TEXT, p_user_id INT
) RETURNS finance_mgmt.fuel_logs AS $$
DECLARE
    v_vehicle RECORD;
    v_trip RECORD;
    v_log finance_mgmt.fuel_logs;
BEGIN
    SELECT * INTO v_vehicle FROM vehicles.vehicles WHERE id = p_vehicle_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF p_trip_id IS NOT NULL THEN
        SELECT * INTO v_trip FROM trip_mgmt.trips WHERE id = p_trip_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Trip % not found', p_trip_id;
        END IF;
        IF v_trip.vehicle_id != p_vehicle_id THEN
            RAISE EXCEPTION 'Trip vehicle_id does not match requested vehicle_id';
        END IF;
    END IF;

    INSERT INTO finance_mgmt.fuel_logs (
        vehicle_id, trip_id, liters, cost, fuel_date, odometer, notes, recorded_by
    ) VALUES (
        p_vehicle_id, p_trip_id, p_liters, p_cost, p_fuel_date, p_odometer, p_notes, p_user_id
    ) RETURNING * INTO v_log;

    RETURN v_log;
END;
$$ LANGUAGE plpgsql;

-- PL/pgSQL Function: record_expense
CREATE OR REPLACE FUNCTION finance_mgmt.record_expense(
    p_vehicle_id INT, p_trip_id INT, p_expense_type finance_mgmt.expense_type, 
    p_amount NUMERIC, p_expense_date DATE, p_description TEXT, p_user_id INT
) RETURNS finance_mgmt.expenses AS $$
DECLARE
    v_vehicle RECORD;
    v_trip RECORD;
    v_expense finance_mgmt.expenses;
BEGIN
    SELECT * INTO v_vehicle FROM vehicles.vehicles WHERE id = p_vehicle_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle % not found', p_vehicle_id;
    END IF;

    IF p_trip_id IS NOT NULL THEN
        SELECT * INTO v_trip FROM trip_mgmt.trips WHERE id = p_trip_id FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Trip % not found', p_trip_id;
        END IF;
        IF v_trip.vehicle_id != p_vehicle_id THEN
            RAISE EXCEPTION 'Trip vehicle_id does not match requested vehicle_id';
        END IF;
    END IF;

    INSERT INTO finance_mgmt.expenses (
        vehicle_id, trip_id, expense_type, amount, expense_date, description, recorded_by
    ) VALUES (
        p_vehicle_id, p_trip_id, p_expense_type, p_amount, p_expense_date, p_description, p_user_id
    ) RETURNING * INTO v_expense;

    INSERT INTO finance_mgmt.expense_status_history (
        expense_id, previous_status, new_status, reason, changed_by
    ) VALUES (
        v_expense.id, NULL, 'RECORDED', 'Initial record', p_user_id
    );

    RETURN v_expense;
END;
$$ LANGUAGE plpgsql;

-- PL/pgSQL Function: void_fuel_log
CREATE OR REPLACE FUNCTION finance_mgmt.void_fuel_log(
    p_id INT, p_reason TEXT, p_user_id INT
) RETURNS finance_mgmt.fuel_logs AS $$
DECLARE
    v_log finance_mgmt.fuel_logs;
BEGIN
    SELECT * INTO v_log FROM finance_mgmt.fuel_logs WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Fuel log % not found', p_id;
    END IF;
    IF v_log.is_voided THEN
        RAISE EXCEPTION 'Fuel log is already voided';
    END IF;

    UPDATE finance_mgmt.fuel_logs
    SET is_voided = TRUE, void_reason = p_reason, voided_by = p_user_id, voided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id
    RETURNING * INTO v_log;

    RETURN v_log;
END;
$$ LANGUAGE plpgsql;

-- PL/pgSQL Function: void_expense
CREATE OR REPLACE FUNCTION finance_mgmt.void_expense(
    p_id INT, p_reason TEXT, p_user_id INT
) RETURNS finance_mgmt.expenses AS $$
DECLARE
    v_expense finance_mgmt.expenses;
BEGIN
    SELECT * INTO v_expense FROM finance_mgmt.expenses WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense % not found', p_id;
    END IF;
    IF v_expense.status = 'VOIDED' THEN
        RAISE EXCEPTION 'Expense is already voided';
    END IF;

    UPDATE finance_mgmt.expenses
    SET status = 'VOIDED', void_reason = p_reason, voided_by = p_user_id, voided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_id
    RETURNING * INTO v_expense;

    INSERT INTO finance_mgmt.expense_status_history (
        expense_id, previous_status, new_status, reason, changed_by
    ) VALUES (
        p_id, 'RECORDED', 'VOIDED', p_reason, p_user_id
    );

    RETURN v_expense;
END;
$$ LANGUAGE plpgsql;
