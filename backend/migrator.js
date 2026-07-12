const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function runMigrations() {
    console.log('[Migration] Checking database migrations...');
    
    const client = await pool.connect();
    
    try {
        // Ensure tracking table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.migrations (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Read and sort migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // ascending order
            
        console.log(`[Migration] Found ${files.length} migration files`);
        
        // Get already executed migrations
        const result = await client.query('SELECT migration_name FROM public.migrations');
        const executedMigrations = new Set(result.rows.map(row => row.migration_name));
        
        for (const file of files) {
            if (executedMigrations.has(file)) {
                console.log(`[Migration] Skipping ${file} - already executed`);
                continue;
            }
            
            console.log(`[Migration] Running ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            try {
                await client.query('BEGIN');
                
                await client.query(sql);
                
                await client.query(
                    'INSERT INTO public.migrations (migration_name) VALUES ($1)',
                    [file]
                );
                
                await client.query('COMMIT');
                console.log(`[Migration] Completed ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[Migration] Failed executing ${file}`);
                console.error(err);
                throw err;
            }
        }
        
        console.log('[Migration] Database is up to date');
    } finally {
        client.release();
    }
}

module.exports = {
    runMigrations
};
