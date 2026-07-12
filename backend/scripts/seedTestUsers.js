const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const usersToSeed = [
    {
        name: 'Fleet Manager',
        email: 'fleet@transitops.com',
        password: 'fleet',
        roleName: 'FLEET_MANAGER'
    },
    {
        name: 'Dispatcher',
        email: 'dispatcher@transitops.com',
        password: 'dispatcher',
        roleName: 'DISPATCHER'
    },
    {
        name: 'Safety Officer',
        email: 'safety@transitops.com',
        password: 'safety',
        roleName: 'SAFETY_OFFICER'
    },
    {
        name: 'Financial Analyst',
        email: 'finance@transitops.com',
        password: 'finance',
        roleName: 'FINANCIAL_ANALYST'
    },
    {
        name: 'System Admin',
        email: 'admin@transitops.com',
        password: 'admin',
        roleName: 'ADMIN'
    }
];

async function seedTestUsers() {
    console.log('[Seed] Starting test user seed...');
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        for (const userData of usersToSeed) {
            // Find role ID
            const roleResult = await client.query('SELECT id FROM roles.roles WHERE name = $1', [userData.roleName]);
            if (roleResult.rows.length === 0) {
                throw new Error(`Role ${userData.roleName} not found in database. Ensure migrations have run.`);
            }
            const roleId = roleResult.rows[0].id;
            
            // Hash password
            const passwordHash = await bcrypt.hash(userData.password, 10);
            
            // Upsert user
            await client.query(`
                INSERT INTO users.users (name, email, password_hash, role_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (email) DO UPDATE SET
                    name = EXCLUDED.name,
                    password_hash = EXCLUDED.password_hash,
                    role_id = EXCLUDED.role_id,
                    updated_at = CURRENT_TIMESTAMP
            `, [userData.name, userData.email, passwordHash, roleId]);
            
            console.log(`[Seed] Successfully seeded user: ${userData.email} (${userData.roleName})`);
        }
        
        await client.query('COMMIT');
        console.log('[Seed] All test users seeded successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Seed] Failed to seed test users:', error);
        process.exit(1);
    } finally {
        client.release();
        // Close the pool since this is a standalone script
        await pool.end();
    }
}

seedTestUsers();
