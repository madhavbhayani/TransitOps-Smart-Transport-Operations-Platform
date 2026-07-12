const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
});

pool.connect()
  .then(() => {
    console.log("Database Connection Sucessful");
  })
  .catch((err) => {
    console.error("Database connection error", err.stack);
  });

module.exports = {
  pool
};
