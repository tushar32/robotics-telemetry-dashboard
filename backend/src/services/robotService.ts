import { pool } from '../config/database';
import { Robot, RobotFilter, PaginationParams, RobotConfiguration, TelemetryData } from '../types';

export class RobotService {
  
  async getAllRobots(
    filters: RobotFilter = {}, 
    pagination: PaginationParams
  ): Promise<{ robots: Robot[]; total: number }> {
    const client = await pool.connect();
    
    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.status) {
        whereClause += ` AND status = $${paramIndex}`;
        queryParams.push(filters.status);
        paramIndex++;
      }


      if (filters.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR robot_id ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM robots ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const dataQuery = `
        SELECT * FROM robots 
        ${whereClause} 
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(pagination.limit, pagination.offset);

      const result = await client.query(dataQuery, queryParams);
      
      return {
        robots: result.rows,
        total
      };
    } finally {
      client.release();
    }
  }

  async getRobotById(id: number): Promise<Robot | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM robots WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getRobotByRobotId(robotId: string): Promise<Robot | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query('SELECT * FROM robots WHERE robot_id = $1', [robotId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateRobotConfiguration(id: number, configuration: RobotConfiguration): Promise<Robot | null> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `UPDATE robots 
         SET configuration = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
        [JSON.stringify(configuration), id]
      );
      
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateRobotTelemetry(
    robotId: string, 
    telemetryData: Partial<Pick<Robot, 'location_x' | 'location_y' | 'battery_level' | 'status'>>
  ): Promise<Robot | null> {
    const client = await pool.connect();
    
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (telemetryData.location_x !== undefined) {
        updateFields.push(`location_x = $${paramIndex}`);
        queryParams.push(telemetryData.location_x);
        paramIndex++;
      }

      if (telemetryData.location_y !== undefined) {
        updateFields.push(`location_y = $${paramIndex}`);
        queryParams.push(telemetryData.location_y);
        paramIndex++;
      }

      if (telemetryData.battery_level !== undefined) {
        updateFields.push(`battery_level = $${paramIndex}`);
        queryParams.push(telemetryData.battery_level);
        paramIndex++;
      }

      if (telemetryData.status) {
        updateFields.push(`status = $${paramIndex}`);
        queryParams.push(telemetryData.status);
        paramIndex++;
      }

      updateFields.push(`last_seen = CURRENT_TIMESTAMP`);
      queryParams.push(robotId);

      const query = `
        UPDATE robots 
        SET ${updateFields.join(', ')} 
        WHERE robot_id = $${paramIndex} 
        RETURNING *
      `;

      const result = await client.query(query, queryParams);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async saveTelemetryData(telemetryData: Omit<TelemetryData, 'id'>): Promise<TelemetryData> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `INSERT INTO telemetry_data 
         (robot_id, timestamp, location_x, location_y, battery_level, status, speed, temperature, additional_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          telemetryData.robot_id,
          telemetryData.timestamp,
          telemetryData.location_x,
          telemetryData.location_y,
          telemetryData.battery_level,
          telemetryData.status,
          telemetryData.speed,
          telemetryData.temperature,
          JSON.stringify(telemetryData.additional_data)
        ]
      );
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getTelemetryHistory(
    robotId: number, 
    limit: number = 100
  ): Promise<TelemetryData[]> {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT * FROM telemetry_data 
         WHERE robot_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [robotId, limit]
      );
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}
