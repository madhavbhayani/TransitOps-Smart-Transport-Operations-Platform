const express = require('express');
const dotenv = require('dotenv');
const { pool } = require('./config/db');
const { runMigrations } = require('./migrator');
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 6000;
const API_PREFIX = '/api/transitops';

app.use(express.json());

app.get('/', (req, res) => {
    res.send('TransitOPS API is running');
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/vehicles`, vehicleRoutes);
app.use(`${API_PREFIX}/maintenance`, maintenanceRoutes);




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
