const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
        }
        next();
    };
}

const rbacService = require('../services/rbacService');

function requirePermission(moduleName, requiredLevel = 'VIEW') {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        
        // ADMIN can bypass everything
        if (req.user.role === 'ADMIN') {
            return next();
        }

        try {
            const permissions = await rbacService.getRolePermissions(req.user.role);
            const userAccess = permissions[moduleName] || 'NONE';

            if (userAccess === 'NONE') {
                return res.status(403).json({ success: false, message: 'Forbidden: No access to this module' });
            }

            if (requiredLevel === 'FULL_CONTROL' && userAccess !== 'FULL_CONTROL') {
                return res.status(403).json({ success: false, message: 'Forbidden: Full control required' });
            }

            next();
        } catch (error) {
            console.error('Error checking permissions:', error);
            res.status(500).json({ success: false, message: 'Internal server error during permission check' });
        }
    };
}

module.exports = { authenticate, requireRole, requirePermission };
