const { pool } = require('../config/db');

const getPermissions = async () => {
    const result = await pool.query(`
        SELECT id, role, module, access_level 
        FROM auth.role_permissions 
        ORDER BY role, module
    `);
    
    // Group permissions by role
    const permissionsByRole = {};
    for (const row of result.rows) {
        if (!permissionsByRole[row.role]) {
            permissionsByRole[row.role] = {};
        }
        permissionsByRole[row.role][row.module] = row.access_level;
    }
    
    return permissionsByRole;
};

const updatePermission = async (role, module, access_level) => {
    await pool.query(`
        INSERT INTO auth.role_permissions (role, module, access_level)
        VALUES ($1, $2, $3)
        ON CONFLICT (role, module) 
        DO UPDATE SET access_level = EXCLUDED.access_level
    `, [role, module, access_level]);
};

// Also fetch a single role's permissions, used by authMiddleware
const getRolePermissions = async (role) => {
    const result = await pool.query(`
        SELECT module, access_level 
        FROM auth.role_permissions 
        WHERE role = $1
    `, [role]);
    
    const permissions = {};
    for (const row of result.rows) {
        permissions[row.module] = row.access_level;
    }
    return permissions;
};

module.exports = {
    getPermissions,
    updatePermission,
    getRolePermissions
};
