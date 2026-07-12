-- Insert Admin into roles
INSERT INTO roles.roles (name) VALUES ('ADMIN') ON CONFLICT (name) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS auth;

DO $$ BEGIN
    CREATE TYPE auth.access_level AS ENUM ('NONE', 'VIEW', 'FULL_CONTROL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    access_level auth.access_level NOT NULL DEFAULT 'NONE',
    UNIQUE(role, module)
);

-- Modules: 'dashboard', 'fleet', 'drivers', 'trips', 'maintenance', 'expenses', 'analytics', 'settings'

-- Insert initial permissions based on the old static config
INSERT INTO auth.role_permissions (role, module, access_level) VALUES
-- ADMIN (Full control everywhere)
('ADMIN', 'dashboard', 'FULL_CONTROL'),
('ADMIN', 'fleet', 'FULL_CONTROL'),
('ADMIN', 'drivers', 'FULL_CONTROL'),
('ADMIN', 'trips', 'FULL_CONTROL'),
('ADMIN', 'maintenance', 'FULL_CONTROL'),
('ADMIN', 'expenses', 'FULL_CONTROL'),
('ADMIN', 'analytics', 'FULL_CONTROL'),
('ADMIN', 'settings', 'FULL_CONTROL'),

-- FLEET_MANAGER
('FLEET_MANAGER', 'dashboard', 'VIEW'),
('FLEET_MANAGER', 'fleet', 'FULL_CONTROL'),
('FLEET_MANAGER', 'drivers', 'VIEW'),
('FLEET_MANAGER', 'trips', 'VIEW'),
('FLEET_MANAGER', 'maintenance', 'FULL_CONTROL'),
('FLEET_MANAGER', 'expenses', 'NONE'),
('FLEET_MANAGER', 'analytics', 'NONE'),
('FLEET_MANAGER', 'settings', 'VIEW'),

-- DISPATCHER
('DISPATCHER', 'dashboard', 'VIEW'),
('DISPATCHER', 'fleet', 'VIEW'),
('DISPATCHER', 'drivers', 'VIEW'),
('DISPATCHER', 'trips', 'FULL_CONTROL'),
('DISPATCHER', 'maintenance', 'NONE'),
('DISPATCHER', 'expenses', 'FULL_CONTROL'),
('DISPATCHER', 'analytics', 'NONE'),
('DISPATCHER', 'settings', 'VIEW'),

-- SAFETY_OFFICER
('SAFETY_OFFICER', 'dashboard', 'VIEW'),
('SAFETY_OFFICER', 'fleet', 'NONE'),
('SAFETY_OFFICER', 'drivers', 'FULL_CONTROL'),
('SAFETY_OFFICER', 'trips', 'VIEW'),
('SAFETY_OFFICER', 'maintenance', 'VIEW'),
('SAFETY_OFFICER', 'expenses', 'VIEW'),
('SAFETY_OFFICER', 'analytics', 'NONE'),
('SAFETY_OFFICER', 'settings', 'VIEW'),

-- FINANCIAL_ANALYST
('FINANCIAL_ANALYST', 'dashboard', 'VIEW'),
('FINANCIAL_ANALYST', 'fleet', 'VIEW'),
('FINANCIAL_ANALYST', 'drivers', 'VIEW'),
('FINANCIAL_ANALYST', 'trips', 'VIEW'),
('FINANCIAL_ANALYST', 'maintenance', 'FULL_CONTROL'),
('FINANCIAL_ANALYST', 'expenses', 'FULL_CONTROL'),
('FINANCIAL_ANALYST', 'analytics', 'FULL_CONTROL'),
('FINANCIAL_ANALYST', 'settings', 'VIEW')
ON CONFLICT (role, module) DO NOTHING;
