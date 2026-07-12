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
const { generateTablePDF } = require('../utils/pdfGenerator');

exports.exportData = tryCatch(async (req, res) => {
    const { type, year, startDate, endDate, format } = req.query;

    let fields = [];
    let headers = [];
    let dataList = [];
    let title = "";
    let fileNameBase = `analytics_${type}_${new Date().toISOString().split('T')[0]}`;

    switch (type) {
        case 'fuel-efficiency': {
            title = "Fuel Efficiency Report";
            const data = await analyticsService.getFuelEfficiency({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'distance', 'fuelLiters', 'fuelEfficiency'];
            headers = ['Vehicle ID', 'Registration', 'Name', 'Distance (km)', 'Fuel (L)', 'Efficiency'];
            break;
        }
        case 'operational-cost': {
            title = "Operational Cost Report";
            const data = await analyticsService.getOperationalCost({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'fuelCost', 'maintenanceCost', 'operationalCost'];
            headers = ['Vehicle ID', 'Registration', 'Name', 'Fuel Cost', 'Maintenance Cost', 'Total Cost'];
            break;
        }
        case 'vehicle-roi': {
            title = "Vehicle ROI Report";
            const data = await analyticsService.getVehicleROI({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['vehicleId', 'registrationNumber', 'name', 'revenue', 'operationalCost', 'acquisitionCost', 'roiRatio', 'roiPercentage'];
            headers = ['Vehicle ID', 'Registration', 'Name', 'Revenue', 'Op Cost', 'Acq Cost', 'ROI Ratio', 'ROI %'];
            break;
        }
        case 'monthly-revenue': {
            title = "Monthly Revenue Report";
            const data = await analyticsService.getMonthlyRevenue(year);
            dataList = data.months;
            fields = ['month', 'monthName', 'revenue'];
            headers = ['Month #', 'Month', 'Revenue'];
            break;
        }
        case 'top-costliest-vehicles': {
            title = "Top Costliest Vehicles Report";
            const data = await analyticsService.getTopCostliestVehicles({ startDate, endDate });
            dataList = data.vehicles;
            fields = ['rank', 'vehicleId', 'registrationNumber', 'name', 'operationalCost'];
            headers = ['Rank', 'Vehicle ID', 'Registration', 'Name', 'Operational Cost'];
            break;
        }
        case 'trip-profitability': {
            title = "Trip Profitability Report";
            const data = await analyticsService.getTripProfitability(req.query);
            dataList = data.trips;
            fields = ['tripId', 'source', 'destination', 'registrationNumber', 'revenue', 'operationalCost', 'profit'];
            headers = ['Trip ID', 'Source', 'Destination', 'Registration', 'Revenue', 'Op Cost', 'Profit'];
            break;
        }
        default:
            return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    if (dataList.length === 0) {
        return res.status(404).json({ success: false, message: 'No data available for export' });
    }

    if (format === 'pdf') {
        const rows = dataList.map(item => fields.map(field => {
            const val = item[field];
            return val !== null && val !== undefined ? val.toString() : '';
        }));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileNameBase}.pdf`);
        generateTablePDF(res, title, headers, rows);
    } else {
        const csv = parse(dataList, { fields });
        res.header('Content-Type', 'text/csv');
        res.attachment(`${fileNameBase}.csv`);
        return res.send(csv);
    }
});
