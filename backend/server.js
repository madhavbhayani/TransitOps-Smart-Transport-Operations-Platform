const express = require('express');
const dotenv = require('dotenv');
const { pool } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 6000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('TransitOPS API is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
