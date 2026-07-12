const { pool } = require('../config/db');

const createDriver = async (data, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Create driver
        const result = await client.query(
            `INSERT INTO drivers.drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'AVAILABLE') RETURNING *`,
            [data.name, data.licenseNumber, data.licenseCategory, data.licenseExpiry, data.contactNumber, data.safetyScore]
        );
        const driver = result.rows[0];

        // 2. Initial status history
        await client.query(
            `INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, NULL, 'AVAILABLE', 'Driver registered', $2)`,
            [driver.id, userId]
        );

        // 3. Initial safety history
        await client.query(
            `INSERT INTO drivers.driver_safety_history (driver_id, previous_score, new_score, reason, changed_by)
             VALUES ($1, NULL, $2, 'Driver registered', $3)`,
            [driver.id, data.safetyScore, userId]
        );

        await client.query('COMMIT');
        return driver;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const listDrivers = async (status, licenseCategory) => {
    let query = 'SELECT * FROM drivers.drivers WHERE 1=1';
    const params = [];

    if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
    }
    if (licenseCategory) {
        params.push(licenseCategory);
        query += ` AND license_category = $${params.length}`;
    }
    
    query += ' ORDER BY id DESC';

    const result = await pool.query(query, params);
    return result.rows;
};

const getDriverDetails = async (id) => {
    const result = await pool.query('SELECT * FROM drivers.drivers WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;

    const driver = result.rows[0];
    const expiryDate = new Date(driver.license_expiry);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    let licenseStatus = 'VALID';
    if (expiryDate < today) {
        licenseStatus = 'EXPIRED';
    } else if (expiryDate <= thirtyDaysFromNow) {
        licenseStatus = 'EXPIRING_SOON';
    }

    return {
        ...driver,
        compliance: { licenseStatus }
    };
};

const updateDriver = async (id, data) => {
    const result = await pool.query(
        `UPDATE drivers.drivers 
         SET name = $1, license_number = $2, license_category = $3, license_expiry = $4, contact_number = $5
         WHERE id = $6 RETURNING *`,
        [data.name, data.licenseNumber, data.licenseCategory, data.licenseExpiry, data.contactNumber, id]
    );
    return result.rows[0];
};

const suspendDriver = async (id, reason, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1 FOR UPDATE', [id]);
        if (res.rows.length === 0) throw new Error('Driver not found');
        const driver = res.rows[0];

        if (driver.status === 'ON_TRIP') throw new Error('Cannot suspend driver ON_TRIP');
        if (driver.status === 'SUSPENDED') throw new Error('Driver is already SUSPENDED');

        await client.query('UPDATE drivers.drivers SET status = $1 WHERE id = $2', ['SUSPENDED', id]);
        
        await client.query(
            `INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, driver.status, 'SUSPENDED', reason, userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const restoreDriver = async (id, reason, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1 FOR UPDATE', [id]);
        if (res.rows.length === 0) throw new Error('Driver not found');
        const driver = res.rows[0];

        if (driver.status !== 'SUSPENDED') throw new Error('Driver is not SUSPENDED');
        if (new Date(driver.license_expiry) < new Date()) throw new Error('Cannot restore driver with EXPIRED license');

        await client.query('UPDATE drivers.drivers SET status = $1 WHERE id = $2', ['AVAILABLE', id]);
        
        await client.query(
            `INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, driver.status, 'AVAILABLE', reason, userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const markOffDuty = async (id, reason, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1 FOR UPDATE', [id]);
        if (res.rows.length === 0) throw new Error('Driver not found');
        const driver = res.rows[0];

        if (driver.status === 'ON_TRIP') throw new Error('Driver is ON_TRIP');
        if (driver.status === 'SUSPENDED') throw new Error('Driver is SUSPENDED');

        await client.query('UPDATE drivers.drivers SET status = $1 WHERE id = $2', ['OFF_DUTY', id]);
        
        await client.query(
            `INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, driver.status, 'OFF_DUTY', reason || 'Driver requested leave', userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const markAvailable = async (id, userId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1 FOR UPDATE', [id]);
        if (res.rows.length === 0) throw new Error('Driver not found');
        const driver = res.rows[0];

        if (driver.status === 'ON_TRIP') throw new Error('Driver is ON_TRIP');
        if (driver.status === 'SUSPENDED') throw new Error('Driver is SUSPENDED');
        if (new Date(driver.license_expiry) < new Date()) throw new Error('Driver license is EXPIRED');

        await client.query('UPDATE drivers.drivers SET status = $1 WHERE id = $2', ['AVAILABLE', id]);
        
        await client.query(
            `INSERT INTO drivers.driver_status_history (driver_id, previous_status, new_status, reason, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, driver.status, 'AVAILABLE', 'Marked available by admin', userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const updateSafetyScore = async (id, score, reason, userId) => {
    if (score < 0 || score > 100) throw new Error('Score must be between 0 and 100');
    if (!reason) throw new Error('Reason required for safety score update');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1 FOR UPDATE', [id]);
        if (res.rows.length === 0) throw new Error('Driver not found');
        const driver = res.rows[0];

        await client.query('UPDATE drivers.drivers SET safety_score = $1 WHERE id = $2', [score, id]);
        
        await client.query(
            `INSERT INTO drivers.driver_safety_history (driver_id, previous_score, new_score, reason, changed_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, driver.safety_score, score, reason, userId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getDriverStatusHistory = async (id) => {
    const result = await pool.query(
        'SELECT * FROM drivers.driver_status_history WHERE driver_id = $1 ORDER BY id DESC',
        [id]
    );
    return result.rows;
};

const getDriverSafetyHistory = async (id) => {
    const result = await pool.query(
        'SELECT * FROM drivers.driver_safety_history WHERE driver_id = $1 ORDER BY id DESC',
        [id]
    );
    return result.rows;
};

const getComplianceData = async (statusFilter) => {
    // Dynamic logic in SQL
    let query = `
        SELECT *, 
        CASE 
            WHEN license_expiry < CURRENT_DATE THEN 'EXPIRED'
            WHEN license_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
            ELSE 'VALID'
        END as licenseStatus
        FROM drivers.drivers
    `;

    const result = await pool.query(query);
    const drivers = result.rows;

    let totalDrivers = 0;
    let validLicenses = 0;
    let expiringSoon = 0;
    let expiredLicenses = 0;

    const filtered = drivers.filter(d => {
        totalDrivers++;
        if (d.licensestatus === 'VALID') validLicenses++;
        if (d.licensestatus === 'EXPIRING_SOON') expiringSoon++;
        if (d.licensestatus === 'EXPIRED') expiredLicenses++;

        if (statusFilter && d.licensestatus !== statusFilter) return false;
        return true;
    });

    return {
        drivers: filtered,
        summary: { totalDrivers, validLicenses, expiringSoon, expiredLicenses }
    };
};

const searchDrivers = async (term) => {
    const likeTerm = `%${term}%`;
    const result = await pool.query(
        `SELECT * FROM drivers.drivers 
         WHERE name ILIKE $1 OR license_number ILIKE $2 OR contact_number ILIKE $3
         ORDER BY id DESC`,
        [likeTerm, likeTerm, likeTerm]
    );
    return result.rows;
};

const filterDrivers = async (status, licenseCategory, licenseStatus, minSafetyScore, maxSafetyScore) => {
    let query = `
        SELECT *, 
        CASE 
            WHEN license_expiry < CURRENT_DATE THEN 'EXPIRED'
            WHEN license_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
            ELSE 'VALID'
        END as calculated_license_status
        FROM drivers.drivers WHERE 1=1
    `;
    const params = [];

    if (status) {
        params.push(status);
        query += ` AND status = $${params.length}`;
    }
    if (licenseCategory) {
        params.push(licenseCategory);
        query += ` AND license_category = $${params.length}`;
    }
    if (minSafetyScore) {
        params.push(minSafetyScore);
        query += ` AND safety_score >= $${params.length}`;
    }
    if (maxSafetyScore) {
        params.push(maxSafetyScore);
        query += ` AND safety_score <= $${params.length}`;
    }

    const result = await pool.query(query, params);
    
    if (licenseStatus) {
        return result.rows.filter(d => d.calculated_license_status === licenseStatus);
    }
    return result.rows;
};

const deleteDriver = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Ensure driver exists
        const res = await client.query('SELECT * FROM drivers.drivers WHERE id = $1', [id]);
        if (res.rows.length === 0) {
            throw new Error('Driver not found');
        }

        // Delete history records first (cascade manually because of RESTRICT)
        await client.query('DELETE FROM drivers.driver_safety_history WHERE driver_id = $1', [id]);
        await client.query('DELETE FROM drivers.driver_status_history WHERE driver_id = $1', [id]);

        // Delete driver. Will fail with 23503 if trips exist (RESTRICT)
        await client.query('DELETE FROM drivers.drivers WHERE id = $1', [id]);
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    createDriver,
    listDrivers,
    getDriverDetails,
    updateDriver,
    suspendDriver,
    restoreDriver,
    markOffDuty,
    markAvailable,
    updateSafetyScore,
    getDriverStatusHistory,
    getDriverSafetyHistory,
    getComplianceData,
    searchDrivers,
    filterDrivers,
    deleteDriver
};
