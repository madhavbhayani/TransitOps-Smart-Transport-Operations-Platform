const financeService = require('../services/financeService');
async function recordFuelLog(req, res) {
    try {
        const fuelLog = await financeService.recordFuelLog(req.body, req.user.userId);
        res.status(201).json({ success: true, fuelLog });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getFuelLogs(req, res) {
    try {
        const fuelLogs = await financeService.getFuelLogs(req.query);
        res.json({ success: true, fuelLogs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getFuelLogDetails(req, res) {
    try {
        const fuelLog = await financeService.getFuelLogDetails(req.params.id);
        if (!fuelLog) return res.status(404).json({ success: false, message: 'Fuel log not found' });
        res.json({ success: true, fuelLog });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function voidFuelLog(req, res) {
    try {
        const fuelLog = await financeService.voidFuelLog(req.params.id, req.body.reason, req.user.userId);
        res.json({ success: true, fuelLog });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function recordExpense(req, res) {
    try {
        const expense = await financeService.recordExpense(req.body, req.user.userId);
        res.status(201).json({ success: true, expense });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getExpenses(req, res) {
    try {
        const expenses = await financeService.getExpenses(req.query);
        res.json({ success: true, expenses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getExpenseDetails(req, res) {
    try {
        const details = await financeService.getExpenseDetails(req.params.id);
        if (!details) return res.status(404).json({ success: false, message: 'Expense not found' });
        res.json({ success: true, ...details });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function voidExpense(req, res) {
    try {
        const expense = await financeService.voidExpense(req.params.id, req.body.reason, req.user.userId);
        res.json({ success: true, expense });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getVehicleOperationalCost(req, res) {
    try {
        const data = await financeService.getVehicleOperationalCost(req.params.vehicleId);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getVehicleFuelEfficiency(req, res) {
    try {
        const data = await financeService.getVehicleFuelEfficiency(req.params.vehicleId);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getVehicleROI(req, res) {
    try {
        const data = await financeService.getVehicleROI(req.params.vehicleId);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getVehicleSummary(req, res) {
    try {
        const data = await financeService.getVehicleFinancialSummary(req.params.vehicleId);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function getDashboardSummary(req, res) {
    try {
        const data = await financeService.getDashboardSummary();
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function searchFinancials(req, res) {
    try {
        const data = await financeService.searchFinancials(req.query);
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}
async function filterFinancials(req, res) {
    try {
        const [fuelLogs, expenses] = await Promise.all([
            financeService.getFuelLogs(req.body),
            financeService.getExpenses(req.body)
        ]);
        res.json({ success: true, fuelLogs, expenses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const { generateTablePDF } = require('../utils/pdfGenerator');
const { parse } = require('json2csv');

async function exportData(req, res) {
    try {
        const { type, vehicleId, startDate, endDate, format } = req.query;
        const filters = { vehicleId, startDate, endDate };

        let headers = [];
        let rows = [];
        let csvContent = "";
        let title = "";

        if (type === 'fuel') {
            title = "Fuel Logs Report";
            const data = await financeService.getFuelLogs(filters);
            headers = ["ID", "Vehicle", "Trip ID", "Liters", "Cost", "Date", "Odometer", "Recorded By", "Voided"];
            
            data.forEach(row => {
                const dateStr = new Date(row.fuel_date).toISOString().split('T')[0];
                rows.push([
                    row.id.toString(), 
                    row.registration_number, 
                    (row.trip_id || '').toString(), 
                    row.liters.toString(), 
                    row.cost.toString(), 
                    dateStr, 
                    (row.odometer || '').toString(), 
                    row.recorded_by_name, 
                    row.is_voided ? 'Yes' : 'No'
                ]);
            });
        } else if (type === 'expenses') {
            title = "Expenses Report";
            const data = await financeService.getExpenses(filters);
            headers = ["ID", "Vehicle", "Trip ID", "Type", "Amount", "Date", "Description", "Status", "Recorded By"];
            
            data.forEach(row => {
                const dateStr = new Date(row.expense_date).toISOString().split('T')[0];
                const desc = (row.description || '').replace(/,/g, ' ');
                rows.push([
                    row.id.toString(), 
                    row.registration_number, 
                    (row.trip_id || '').toString(), 
                    row.expense_type, 
                    row.amount.toString(), 
                    dateStr, 
                    desc, 
                    row.status, 
                    row.recorded_by_name
                ]);
            });
        } else if (type === 'vehicle-summary') {
            if (!vehicleId) throw new Error('vehicleId is required for vehicle-summary export');
            title = "Vehicle Financial Summary";
            const data = await financeService.getVehicleFinancialSummary(vehicleId);
            headers = ["Vehicle ID", "Registration", "Fuel Cost", "Maintenance Cost", "Operational Cost", "Other Expenses", "Total Tracked Expenses", "Total Liters", "Efficiency", "Revenue", "ROI Ratio"];
            
            rows.push([
                data.vehicle.id.toString(),
                data.vehicle.registration_number,
                data.fuelCost.toString(),
                data.maintenanceCost.toString(),
                data.operationalCost.toString(),
                data.otherExpenses.toString(),
                data.totalTrackedExpenses.toString(),
                data.totalFuelLiters.toString(),
                (data.fuelEfficiency || '').toString(),
                data.completedTripRevenue.toString(),
                (data.roiRatio || '').toString()
            ]);
        } else {
            throw new Error('Invalid export type. Use fuel, expenses, or vehicle-summary');
        }

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${new Date().getTime()}.pdf`);
            generateTablePDF(res, title, headers, rows);
        } else {
            // Default to CSV
            csvContent = headers.join(',') + '\n';
            rows.forEach(r => {
                csvContent += r.join(',') + '\n';
            });
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${new Date().getTime()}.csv`);
            res.send(csvContent);
        }
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

module.exports = {
    recordFuelLog,
    getFuelLogs,
    getFuelLogDetails,
    voidFuelLog,
    recordExpense,
    getExpenses,
    getExpenseDetails,
    voidExpense,
    getVehicleOperationalCost,
    getVehicleFuelEfficiency,
    getVehicleROI,
    getVehicleSummary,
    getDashboardSummary,
    searchFinancials,
    filterFinancials,
    exportData
};
