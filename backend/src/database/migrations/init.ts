import { pool } from '../../config/database';
import logger from '../../config/logger';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'operator',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create robots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS robots (
        id SERIAL PRIMARY KEY,
        robot_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        model VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'offline',
        location_x DECIMAL(10, 6) DEFAULT 0,
        location_y DECIMAL(10, 6) DEFAULT 0,
        battery_level INTEGER DEFAULT 100,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        configuration JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create telemetry_data table for historical data
    await client.query(`
      CREATE TABLE IF NOT EXISTS telemetry_data (
        id SERIAL PRIMARY KEY,
        robot_id INTEGER REFERENCES robots(id) ON DELETE CASCADE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        location_x DECIMAL(10, 6),
        location_y DECIMAL(10, 6),
        battery_level INTEGER,
        status VARCHAR(20),
        speed DECIMAL(5, 2),
        temperature DECIMAL(5, 2),
        additional_data JSONB DEFAULT '{}'
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_robots_status ON robots(status);
      CREATE INDEX IF NOT EXISTS idx_robots_robot_id ON robots(robot_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_robot_id ON telemetry_data(robot_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_data(timestamp);
    `);

    // Insert default admin user (password: admin123)
    await client.query(`
      INSERT INTO users (username, email, password_hash, role) 
      VALUES ('admin', 'admin@robotics.com', '$2a$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQ', 'admin')
      ON CONFLICT (username) DO NOTHING
    `);

    // Insert sample robots
    const sampleRobots = [
      { robot_id: 'AMR-001', name: 'Navigator Alpha', model: 'NX-2000', status: 'active' },
      { robot_id: 'AMR-002', name: 'Cargo Beta', model: 'CX-1500', status: 'active' },
      { robot_id: 'AMR-003', name: 'Scout Gamma', model: 'SX-1000', status: 'maintenance' },
      { robot_id: 'AMR-004', name: 'Heavy Delta', model: 'HX-3000', status: 'active' },
      { robot_id: 'AMR-005', name: 'Swift Epsilon', model: 'SX-1200', status: 'charging' }
    ];

    for (const robot of sampleRobots) {
      await client.query(`
        INSERT INTO robots (robot_id, name, model, status, location_x, location_y, battery_level, configuration)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (robot_id) DO NOTHING
      `, [
        robot.robot_id,
        robot.name,
        robot.model,
        robot.status,
        Math.random() * 100,
        Math.random() * 100,
        Math.floor(Math.random() * 100) + 1,
        JSON.stringify({
          max_speed: Math.floor(Math.random() * 5) + 1,
          sensor_sensitivity: Math.floor(Math.random() * 10) + 1,
          auto_charge_threshold: Math.floor(Math.random() * 20) + 10
        })
      ]);
    }

    await client.query('COMMIT');
    logger.info('Database tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Error creating tables');
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, 'Migration failed');
      process.exit(1);
    });
}

export { createTables };
