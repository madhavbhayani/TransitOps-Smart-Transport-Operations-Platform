const vehicleService = require('../services/vehicleService');

async function registerVehicle(req, res) {
    try {
        const vehicle = await vehicleService.registerVehicle(req.body, req.user.userId);
        res.status(201).json({ success: true, vehicle });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getVehicles(req, res) {
    try {
        const vehicles = await vehicleService.getVehicles(req.query);
        res.json({ success: true, vehicles });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getVehicleById(req, res) {
    try {
        const data = await vehicleService.getVehicleById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: 'Vehicle not found' });
        res.json({ success: true, vehicle: { ...data.vehicle, utilization: data.utilization, activeMaintenance: data.activeMaintenance } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function updateVehicle(req, res) {
    try {
        if (req.body.status) return res.status(400).json({ success: false, message: 'Cannot update status directly' });
        const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
        if (!vehicle) return res.status(400).json({ success: false, message: 'No fields to update' });
        res.json({ success: true, vehicle });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function markAvailable(req, res) {
    try {
        await vehicleService.markAvailable(req.params.id, req.user.userId);
        res.json({ success: true, message: 'Vehicle marked available' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function retireVehicle(req, res) {
    try {
        await vehicleService.retireVehicle(req.params.id, req.body.reason, req.user.userId);
        res.json({ success: true, message: 'Vehicle retired' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function startMaintenance(req, res) {
    try {
        const maintenance = await vehicleService.startMaintenance(req.params.id, req.body, req.user.userId);
        res.status(201).json({ success: true, maintenance });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function completeMaintenance(req, res) {
    try {
        const maintenance = await vehicleService.completeMaintenance(req.params.vehicleId, req.params.maintenanceId, req.body, req.user.userId);
        res.json({ success: true, maintenance });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function cancelMaintenance(req, res) {
    try {
        await vehicleService.cancelMaintenance(req.params.vehicleId, req.params.maintenanceId, req.body, req.user.userId);
        res.json({ success: true, message: 'Maintenance cancelled' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}

async function getVehicleMaintenanceList(req, res) {
    try {
        const maintenance = await vehicleService.getVehicleMaintenanceList(req.params.id, req.query);
        res.json({ success: true, maintenance });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getAllMaintenance(req, res) {
    try {
        const maintenance = await vehicleService.getAllMaintenance(req.query);
        res.json({ success: true, maintenance });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getVehicleStatusHistory(req, res) {
    try {
        const history = await vehicleService.getVehicleStatusHistory(req.params.id);
        res.json({ success: true, history });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getVehicleLifecycle(req, res) {
    try {
        const lifecycle = await vehicleService.getVehicleLifecycle(req.params.id);
        res.json({ success: true, lifecycle });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getFleetUtilizationSummary(req, res) {
    try {
        const summary = await vehicleService.getFleetUtilizationSummary();
        res.json({ success: true, summary });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getVehicleUtilization(req, res) {
    try {
        const utilization = await vehicleService.getVehicleUtilization(req.params.id);
        if (!utilization) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, utilization });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}


const { generateTablePDF } = require('../utils/pdfGenerator');
const { parse } = require('json2csv');

async function exportData(req, res) {
    try {
        const { vehicleId, status, startDate, endDate, format } = req.query;
        const filters = { vehicleId, status, startDate, endDate };

        const maintenance = await vehicleService.getAllMaintenance(filters);
        if (!maintenance || maintenance.length === 0) {
            return res.status(404).json({ success: false, message: 'No maintenance records available for export' });
        }

        const title = "Maintenance Logs Report";
        const fields = ['id', 'vehicle_reg', 'vehicle_name', 'maintenance_type', 'start_date', 'end_date', 'cost', 'status'];
        const headers = ['Maint ID', 'Reg No', 'Vehicle Name', 'Type', 'Start Date', 'End Date', 'Cost', 'Status'];
        const fileNameBase = `export_maintenance_${new Date().getTime()}`;

        if (format === 'pdf') {
            const rows = maintenance.map(item => fields.map(field => {
                let val = item[field];
                if ((field === 'start_date' || field === 'end_date') && val) {
                    val = new Date(val).toISOString().split('T')[0];
                }
                return val !== null && val !== undefined ? val.toString() : '';
            }));
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${fileNameBase}.pdf`);
            generateTablePDF(res, title, headers, rows);
        } else {
            const csvData = maintenance.map(m => {
                const row = { ...m };
                if (row.start_date) row.start_date = new Date(row.start_date).toISOString().split('T')[0];
                if (row.end_date) row.end_date = new Date(row.end_date).toISOString().split('T')[0];
                return row;
            });
            const csv = parse(csvData, { fields });
            res.header('Content-Type', 'text/csv');
            res.attachment(`${fileNameBase}.csv`);
            return res.send(csv);
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    registerVehicle, getVehicles, getVehicleById, updateVehicle, markAvailable, retireVehicle,
    startMaintenance, completeMaintenance, cancelMaintenance, getVehicleMaintenanceList,
    getAllMaintenance, getVehicleStatusHistory, getVehicleLifecycle, getFleetUtilizationSummary, getVehicleUtilization,
    exportData
};
