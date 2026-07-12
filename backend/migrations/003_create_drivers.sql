CREATE SCHEMA IF NOT EXISTS drivers;

CREATE TABLE IF NOT EXISTS drivers.drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    license_expiry DATE NOT NULL,
    safety_score INTEGER NOT NULL DEFAULT 100,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT chk_driver_safety_score
        CHECK (safety_score >= 0 AND safety_score <= 100),

    CONSTRAINT chk_driver_status
        CHECK (
            status IN (
                'AVAILABLE',
                'ON_TRIP',
                'OFF_DUTY',
                'SUSPENDED'
            )
        )
);
