const driverService = require('../services/driverService');

const createDriver = async (req, res) => {
    try {
        const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore } = req.body;
        if (!name || !licenseNumber || !licenseCategory || !licenseExpiry || !contactNumber) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        const driver = await driverService.createDriver(req.body, req.user.id);
        res.status(201).json({ success: true, driver });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'License number already exists' });
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const listDrivers = async (req, res) => {
    try {
        const { status, licenseCategory } = req.query;
        const drivers = await driverService.listDrivers(status, licenseCategory);
        res.json({ success: true, drivers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getDriverDetails = async (req, res) => {
    try {
        if (isNaN(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid driver ID format' });
        }
        const driver = await driverService.getDriverDetails(req.params.id);
        if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
        res.json({ success: true, driver });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const updateDriver = async (req, res) => {
    try {
        const driver = await driverService.updateDriver(req.params.id, req.body);
        res.json({ success: true, driver });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const suspendDriver = async (req, res) => {
    try {
        await driverService.suspendDriver(req.params.id, req.body.reason, req.user.id);
        res.json({ success: true, message: 'Driver suspended successfully' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const restoreDriver = async (req, res) => {
    try {
        await driverService.restoreDriver(req.params.id, req.body.reason, req.user.id);
        res.json({ success: true, message: 'Driver restored successfully' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const markOffDuty = async (req, res) => {
    try {
        await driverService.markOffDuty(req.params.id, req.body.reason, req.user.id);
        res.json({ success: true, message: 'Driver marked off duty' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const markAvailable = async (req, res) => {
    try {
        await driverService.markAvailable(req.params.id, req.user.id);
        res.json({ success: true, message: 'Driver marked available' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateSafetyScore = async (req, res) => {
    try {
        await driverService.updateSafetyScore(req.params.id, req.body.safetyScore, req.body.reason, req.user.id);
        res.json({ success: true, message: 'Safety score updated' });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

const getDriverStatusHistory = async (req, res) => {
    try {
        const history = await driverService.getDriverStatusHistory(req.params.id);
        res.json({ success: true, history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getDriverSafetyHistory = async (req, res) => {
    try {
        const history = await driverService.getDriverSafetyHistory(req.params.id);
        res.json({ success: true, history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getComplianceData = async (req, res) => {
    try {
        const data = await driverService.getComplianceData(req.query.status);
        res.json({ success: true, ...data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const searchDrivers = async (req, res) => {
    try {
        const drivers = await driverService.searchDrivers(req.query.search);
        res.json({ success: true, drivers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const filterDrivers = async (req, res) => {
    try {
        const { status, licenseCategory, licenseStatus, minSafetyScore, maxSafetyScore } = req.query;
        const drivers = await driverService.filterDrivers(status, licenseCategory, licenseStatus, minSafetyScore, maxSafetyScore);
        res.json({ success: true, drivers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const deleteDriver = async (req, res) => {
    try {
        if (isNaN(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid driver ID format' });
        }
        await driverService.deleteDriver(req.params.id);
        res.json({ success: true, message: 'Driver deleted successfully' });
    } catch (error) {
        console.error(error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: 'Cannot delete a driver with existing trips.' });
        }
        res.status(400).json({ success: false, message: error.message });
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
