const rbacService = require('../services/rbacService');

const getPermissions = async (req, res) => {
    try {
        const permissions = await rbacService.getPermissions();
        res.json({
            success: true,
            data: permissions
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch permissions'
        });
    }
};

const updatePermissions = async (req, res) => {
    try {
        const { role, module, access_level } = req.body;
        if (!role || !module || !access_level) {
            return res.status(400).json({ success: false, message: 'role, module, and access_level are required' });
        }
        
        await rbacService.updatePermission(role, module, access_level);
        res.json({
            success: true,
            message: 'Permission updated successfully'
        });
    } catch (error) {
        console.error('Error updating permission:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update permission'
        });
    }
};

module.exports = {
    getPermissions,
    updatePermissions
};
