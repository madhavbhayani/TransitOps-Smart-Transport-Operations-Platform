CREATE SCHEMA IF NOT EXISTS vehicles;

CREATE TABLE IF NOT EXISTS vehicles.vehicles (
    id SERIAL PRIMARY KEY,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL,
    max_load_capacity NUMERIC(12,2) NOT NULL,
    odometer NUMERIC(15,2) NOT NULL DEFAULT 0,
    acquisition_cost NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_vehicle_load CHECK (max_load_capacity > 0),
    CONSTRAINT chk_vehicle_odometer CHECK (odometer >= 0),
    CONSTRAINT chk_vehicle_cost CHECK (acquisition_cost >= 0),
    CONSTRAINT chk_vehicle_status CHECK (
        status IN ('AVAILABLE', 'ON_TRIP', 'IN_SHOP', 'RETIRED')
    )
);

CREATE TABLE IF NOT EXISTS vehicles.vehicle_status_history (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    reason VARCHAR(255),
    changed_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles.vehicles(id)
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_status_user
        FOREIGN KEY (changed_by)
        REFERENCES users.users(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS vehicles.vehicle_maintenance (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles.vehicles(id)
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_maintenance_user
        FOREIGN KEY (created_by)
        REFERENCES users.users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_maintenance_cost CHECK (cost >= 0),
    CONSTRAINT chk_maintenance_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_maintenance_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS vehicles.vehicle_lifecycle (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lifecycle_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles.vehicles(id)
        ON DELETE RESTRICT,
        
    CONSTRAINT fk_lifecycle_user
        FOREIGN KEY (recorded_by)
        REFERENCES users.users(id)
        ON DELETE RESTRICT,
        
    CONSTRAINT chk_lifecycle_event CHECK (
        event_type IN (
            'REGISTERED',
            'STATUS_CHANGED',
            'MAINTENANCE_STARTED',
            'MAINTENANCE_COMPLETED',
            'RETIRED'
        )
    )
);

CREATE TABLE IF NOT EXISTS vehicles.vehicle_utilization (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL UNIQUE,
    total_trips INTEGER NOT NULL DEFAULT 0,
    completed_trips INTEGER NOT NULL DEFAULT 0,
    total_distance NUMERIC(15,2) NOT NULL DEFAULT 0,
    active_distance NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_operational_hours NUMERIC(15,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_utilization_vehicle
        FOREIGN KEY (vehicle_id)
        REFERENCES vehicles.vehicles(id)
        ON DELETE RESTRICT,
        
    CONSTRAINT chk_utilization_metrics CHECK (
        total_trips >= 0 AND
        completed_trips >= 0 AND
        total_distance >= 0 AND
        active_distance >= 0 AND
        total_operational_hours >= 0
    )
);
