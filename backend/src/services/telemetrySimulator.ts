import { RobotService } from './robotService';
import { Robot, TelemetryUpdate } from '../types';
import logger from '../config/logger';
import { Server as SocketIOServer } from 'socket.io';

export class TelemetrySimulator {
  private robotService: RobotService;
  private io: SocketIOServer;
  private intervalId: NodeJS.Timeout | null = null;
  private robots: Map<string, any> = new Map();
  private isRunning = false;

  constructor(io: SocketIOServer) {
    this.robotService = new RobotService();
    this.io = io;
  }

  async initialize() {
    try {
      // Load initial robot data
      const { robots } = await this.robotService.getAllRobots({}, { page: 1, limit: 100, offset: 0 });
      
      robots.forEach(robot => {
        this.robots.set(robot.robot_id, {
          ...robot,
          // Add simulation state
          direction: Math.random() * 360, // Random initial direction
          speed: Math.random() * 3 + 0.5, // Speed between 0.5 and 3.5
          batteryDrainRate: Math.random() * 0.1 + 0.02, // Battery drain rate per update
          temperatureBase: 20 + Math.random() * 10, // Base temperature 20-30°C
          lastMaintenanceCheck: Date.now(),
          chargingStartTime: null as number | null
        });
      });

      logger.info({ robotCount: robots.length }, 'Telemetry simulator initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize telemetry simulator');
    }
  }

  start() {
    if (this.isRunning) {
      logger.warn('Telemetry simulator is already running, start command ignored.');
      return;
    }

    const updateInterval = parseInt(process.env.TELEMETRY_UPDATE_INTERVAL || '500');
    
    this.intervalId = setInterval(async () => {
      await this.generateTelemetryUpdates();
    }, updateInterval);

    this.isRunning = true;
    logger.info({ updateInterval }, 'Telemetry simulator started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Telemetry simulator stopped');
  }

  private async generateTelemetryUpdates() {
    const updates: TelemetryUpdate[] = [];

    // TODO: Optimize this loop. Instead of updating one by one,
    // batch the database updates to reduce load (e.g., using a transaction
    // or a bulk update/insert helper). For this assignment, one-by-one is fine.

    for (const [robotId, robotData] of this.robots.entries()) {
      try {
        const update = this.simulateRobotUpdate(robotId, robotData);
        updates.push(update);

        // Update robot in database
        await this.robotService.updateRobotTelemetry(robotId, {
          location_x: update.location_x,
          location_y: update.location_y,
          battery_level: update.battery_level,
          status: update.status
        });

        // Save telemetry data to history
        const robot = await this.robotService.getRobotByRobotId(robotId);
        if (robot) {
          await this.robotService.saveTelemetryData({
            robot_id: robot.id,
            timestamp: update.timestamp,
            location_x: update.location_x,
            location_y: update.location_y,
            battery_level: update.battery_level,
            status: update.status,
            speed: update.speed,
            temperature: update.temperature,
            additional_data: {}
          });
        }

        // Update local robot data
        this.robots.set(robotId, {
          ...robotData,
          location_x: update.location_x,
          location_y: update.location_y,
          battery_level: update.battery_level,
          status: update.status,
          speed: update.speed,
          temperature: update.temperature
        });

      } catch (error) {
        logger.error({ err: error, robotId }, 'Error updating telemetry for robot');
      }
    }

    // Broadcast updates to all connected clients
    this.io.emit('telemetry_update', updates);
  }

  private simulateRobotUpdate(robotId: string, robotData: any): TelemetryUpdate {
    const now = new Date();
    
    // Simulate movement based on current status
    let newX = robotData.location_x;
    let newY = robotData.location_y;
    let newStatus: Robot['status'] = robotData.status;
    let newBatteryLevel = robotData.battery_level;
    let speed = robotData.speed;
    let temperature = robotData.temperatureBase;

    // Handle different robot states
    switch (robotData.status) {
      case 'active':
        // Normal operation - robot moves and consumes battery
        const moveDistance = speed * 0.1; // Scale movement
        const radians = (robotData.direction * Math.PI) / 180;
        
        newX += Math.cos(radians) * moveDistance;
        newY += Math.sin(radians) * moveDistance;
        
        // Keep robot within bounds (0-100)
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
        
        // Change direction occasionally
        if (Math.random() < 0.1) {
          robotData.direction = (robotData.direction + (Math.random() - 0.5) * 60) % 360;
        }
        
        // Drain battery
        newBatteryLevel = Math.max(0, newBatteryLevel - robotData.batteryDrainRate);
        
        // Increase temperature during operation
        temperature += Math.random() * 2 - 1; // ±1°C variation
        
        // Check if battery is low
        if (newBatteryLevel <= 15) {
          newStatus = 'charging';
          robotData.chargingStartTime = Date.now();
          speed = 0;
        }
        
        // Random chance of maintenance needed
        if (Math.random() < 0.001 && Date.now() - robotData.lastMaintenanceCheck > 300000) { // 5 minutes
          newStatus = 'maintenance';
          speed = 0;
        }
        break;

      case 'charging':
        // Robot is stationary and charging
        speed = 0;
        newBatteryLevel = Math.min(100, newBatteryLevel + 0.5); // Charge at 0.5% per update
        temperature = robotData.temperatureBase; // Normal temperature while charging
        
        // Finish charging when battery is full
        if (newBatteryLevel >= 95) {
          newStatus = 'active';
          robotData.chargingStartTime = null;
        }
        break;

      case 'maintenance':
        // Robot is stationary for maintenance
        speed = 0;
        temperature = robotData.temperatureBase;
        
        // Random chance to finish maintenance
        if (Math.random() < 0.01) { // 1% chance per update
          newStatus = 'active';
          robotData.lastMaintenanceCheck = Date.now();
        }
        break;

      case 'offline':
        // Robot is completely offline
        speed = 0;
        temperature = 20; // Ambient temperature
        
        // Random chance to come back online
        if (Math.random() < 0.005) { // 0.5% chance per update
          newStatus = 'active';
          newBatteryLevel = Math.max(newBatteryLevel, 50); // Assume some charging happened
        }
        break;

      default:
        // Default to active state
        newStatus = 'active';
        break;
    }

    // Add some random noise to temperature
    temperature += (Math.random() - 0.5) * 0.5;
    temperature = Math.max(15, Math.min(45, temperature)); // Keep temperature realistic

    return {
      robot_id: robotId,
      location_x: parseFloat(newX.toFixed(6)),
      location_y: parseFloat(newY.toFixed(6)),
      battery_level: Math.round(newBatteryLevel),
      status: newStatus,
      speed: parseFloat(speed.toFixed(2)),
      temperature: parseFloat(temperature.toFixed(1)),
      timestamp: now
    };
  }

  // Method to manually trigger an update (useful for testing)
  async triggerUpdate() {
    if (this.isRunning) {
      await this.generateTelemetryUpdates();
    }
  }

  // Get current robot states
  getCurrentStates() {
    const states: any[] = [];
    for (const [robotId, robotData] of this.robots.entries()) {
      states.push({
        robot_id: robotId,
        ...robotData
      });
    }
    return states;
  }
}
