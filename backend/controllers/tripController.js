const tripService = require('../services/tripService');

async function createTrip(req, res) {
    try {
        const trip = await tripService.createTrip(req.body, req.user.userId);
        res.status(201).json({ success: true, trip });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function selectVehicles(req, res) {
    try {
        const vehicles = await tripService.selectVehicles(req.body);
        res.json({ success: true, vehicles });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function selectDrivers(req, res) {
    try {
        const drivers = await tripService.selectDrivers();
        res.json({ success: true, drivers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function dispatchTrip(req, res) {
    try {
        const result = await tripService.dispatchTrip(req.params.id, req.user.userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getActiveTrips(req, res) {
    try {
        const trips = await tripService.getActiveTrips();
        res.json({ success: true, trips });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function completeTrip(req, res) {
    try {
        const result = await tripService.completeTrip(req.params.id, req.body, req.user.userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function cancelTrip(req, res) {
    try {
        const result = await tripService.cancelTrip(req.params.id, req.body, req.user.userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function searchTrips(req, res) {
    try {
        const trips = await tripService.searchTrips(req.body);
        res.json({ success: true, trips });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function filterTrips(req, res) {
    try {
        const trips = await tripService.filterTrips(req.body);
        res.json({ success: true, trips });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getTripDetails(req, res) {
    try {
        const details = await tripService.getTripDetails(req.params.id);
        if (!details) return res.status(404).json({ success: false, message: 'Trip not found' });
        res.json({ success: true, ...details });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    createTrip,
    selectVehicles,
    selectDrivers,
    dispatchTrip,
    getActiveTrips,
    completeTrip,
    cancelTrip,
    searchTrips,
    filterTrips,
    getTripDetails
};
