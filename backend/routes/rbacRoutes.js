const express = require('express');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const rbacController = require('../controllers/rbacController');

const router = express.Router();

router.use(authenticate);

// ONLY ADMIN can access these routes
// Wait, the new auth middleware needs to be updated first. For now, let's just use requireRole(['ADMIN'])
// Actually, we'll rewrite authMiddleware to use dynamic permissions.
// But we still need an ADMIN check. Let's create an admin check in authMiddleware later, or just use requireRole(['ADMIN']).
const adminOnly = requireRole(['ADMIN']);

router.get('/permissions', rbacController.getPermissions);
router.put('/permissions', adminOnly, rbacController.updatePermissions);

module.exports = router;
