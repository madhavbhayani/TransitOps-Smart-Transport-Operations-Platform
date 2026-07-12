const express = require('express');
const dotenv = require('dotenv');
const { pool } = require('./config/db');
const { runMigrations } = require('./migrator');
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const tripRoutes = require('./routes/tripRoutes');
const driverRoutes = require('./routes/driverRoutes');

const cors = require('cors');

dotenv.config();
    
const app = express();
const PORT = process.env.SERVER_PORT || 6001;
const API_PREFIX = '/api/transitops';

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('TransitOPS API is running');
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
app.use(`${API_PREFIX}/drivers`, driverRoutes);
app.use(`${API_PREFIX}/maintenance`, maintenanceRoutes);
app.use(`${API_PREFIX}/trips`, tripRoutes);
app.use(`${API_PREFIX}/finance`, require('./routes/financeRoutes'));
app.use(`${API_PREFIX}/analytics`, require('./routes/analyticsRoutes'));
app.use(`${API_PREFIX}/dashboard`, require('./routes/dashboardRoutes'));
app.use(`${API_PREFIX}/rbac`, require('./routes/rbacRoutes'));



async function startServer() {
    try {
        await pool.query('SELECT NOW()');
        console.log('Database connected successfully');

        await runMigrations();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start TransitOPS server:', error);
        process.exit(1);
    }
}

startServer();
