const analyticsService = require('../services/analyticsService');
const { parse } = require('json2csv');

const tryCatch = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFuelEfficiency = tryCatch(async (req, res) => {
    const data = await analyticsService.getFuelEfficiency(req.query);
    res.json({ success: true, ...data });
});

exports.getFleetUtilization = tryCatch(async (req, res) => {
    const data = await analyticsService.getFleetUtilization();
    res.json({ success: true, ...data });
});

exports.getOperationalCost = tryCatch(async (req, res) => {
    const data = await analyticsService.getOperationalCost(req.query);
    res.json({ success: true, ...data });
});

exports.getVehicleROI = tryCatch(async (req, res) => {
    const data = await analyticsService.getVehicleROI(req.query);
    res.json({ success: true, ...data });
});

exports.getMonthlyRevenue = tryCatch(async (req, res) => {
    const data = await analyticsService.getMonthlyRevenue(req.query.year);
    res.json({ success: true, ...data });
});

exports.getTopCostliestVehicles = tryCatch(async (req, res) => {
    const data = await analyticsService.getTopCostliestVehicles(req.query);
    res.json({ success: true, ...data });
});

exports.getOverview = tryCatch(async (req, res) => {
    const data = await analyticsService.getOverview();
    res.json({ success: true, ...data });
});

exports.getSpecificTripAnalytics = tryCatch(async (req, res) => {
    const data = await analyticsService.getSpecificTripAnalytics(req.params.tripId);
    res.json({ success: true, ...data });
});

exports.getTripProfitability = tryCatch(async (req, res) => {
    const data = await analyticsService.getTripProfitability(req.query);
    res.json({ success: true, ...data });
});

exports.getMonthlyProfitability = tryCatch(async (req, res) => {
    const data = await analyticsService.getMonthlyProfitability(req.query.year);
    res.json({ success: true, ...data });
});

exports.exportCSV = tryCatch(async (req, res) => {
    const { type, year, startDate, endDate } = req.query;
    
    let fields = [];
    let dataList = [];
    let fileName = `analytics_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    switch (type) {
        case 'fuel-efficiency': {
            const data = await analyticsService.getFuelEfficiency({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'distance', 'fuelLiters', 'fuelEfficiency'];
            break;
        }
        case 'operational-cost': {
            const data = await analyticsService.getOperationalCost({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'fuelCost', 'maintenanceCost', 'operationalCost'];
            break;
        }
        case 'vehicle-roi': {
            const data = await analyticsService.getVehicleROI({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'revenue', 'operationalCost', 'acquisitionCost', 'roiRatio', 'roiPercentage'];
            break;
        }
        case 'monthly-revenue': {
            const data = await analyticsService.getMonthlyRevenue(year);
            dataList = data.months;
            fields = ['month', 'monthName', 'revenue'];
            break;
        }
        case 'top-costliest-vehicles': {
            const data = await analyticsService.getTopCostliestVehicles({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['rank', 'vehicleId', 'registrationNumber', 'name', 'operationalCost'];
            break;
        }
        case 'trip-profitability': {
            const data = await analyticsService.getTripProfitability(req.query);
            dataList = data.trips;
            fields = ['tripId', 'source', 'destination', 'registrationNumber', 'revenue', 'operationalCost', 'profit'];
            break;
        }
        default:
            return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    if (dataList.length === 0) {
        return res.status(404).json({ success: false, message: 'No data available for export' });
    }

    const csv = parse(dataList, { fields });
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    return res.send(csv);
});
