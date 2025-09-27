import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../config/logger';
import { verifySocketToken } from '../middleware/auth';
import { TelemetrySimulator } from './telemetrySimulator';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  username?: string;
  role?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private telemetrySimulator: TelemetrySimulator;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.telemetrySimulator = new TelemetrySimulator(this.io);
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // JWT Authentication middleware for WebSocket connections
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        
        if (!token) {
          logger.warn('WebSocket connection rejected: No token provided');
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = verifySocketToken(token as string);
        
        if (!decoded) {
          logger.warn('WebSocket connection rejected: Invalid token');
          return next(new Error('Invalid authentication token'));
        }

        // Attach user info to socket
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;

        logger.info({ username: decoded.username, role: decoded.role }, 'WebSocket authenticated');
        next();
      } catch (error) {
        logger.error({ err: error }, 'WebSocket authentication error');
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info({ username: socket.username, socketId: socket.id }, 'Client connected');
      
      // Store connected client
      this.connectedClients.set(socket.id, socket);

      // Send current robot states to newly connected client
      this.sendCurrentStates(socket);

      // Handle client requesting current robot states
      socket.on('request_current_states', () => {
        this.sendCurrentStates(socket);
      });

      // Handle client subscribing to specific robot updates
      socket.on('subscribe_robot', (robotId: string) => {
        if (typeof robotId === 'string' && robotId.trim()) {
          socket.join(`robot_${robotId}`);
          logger.info({ username: socket.username, robotId }, 'Client subscribed to robot');
          
          socket.emit('subscription_confirmed', {
            robot_id: robotId,
            message: `Subscribed to robot ${robotId} updates`
          });
        } else {
          socket.emit('error', { message: 'Invalid robot ID' });
        }
      });

      // Handle client unsubscribing from robot updates
      socket.on('unsubscribe_robot', (robotId: string) => {
        if (typeof robotId === 'string' && robotId.trim()) {
          socket.leave(`robot_${robotId}`);
          logger.info({ username: socket.username, robotId }, 'Client unsubscribed from robot');
          
          socket.emit('subscription_cancelled', {
            robot_id: robotId,
            message: `Unsubscribed from robot ${robotId} updates`
          });
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle client requesting telemetry simulation control (admin only)
      socket.on('control_simulation', (action: 'start' | 'stop' | 'trigger') => {
        if (socket.role !== 'admin') {
          socket.emit('error', { message: 'Insufficient permissions for simulation control' });
          return;
        }

        switch (action) {
          case 'start':
            this.telemetrySimulator.start();
            socket.emit('simulation_status', { status: 'started', message: 'Telemetry simulation started' });
            break;
          case 'stop':
            this.telemetrySimulator.stop();
            socket.emit('simulation_status', { status: 'stopped', message: 'Telemetry simulation stopped' });
            break;
          case 'trigger':
            this.telemetrySimulator.triggerUpdate();
            socket.emit('simulation_status', { status: 'triggered', message: 'Manual telemetry update triggered' });
            break;
          default:
            socket.emit('error', { message: 'Invalid simulation action' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info({ username: socket.username, socketId: socket.id, reason }, 'Client disconnected');
        this.connectedClients.delete(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        logger.error({ username: socket.username, err: error }, 'WebSocket error for client');
      });
    });

    // Handle connection errors at server level
    this.io.on('connect_error', (error) => {
      logger.error({ err: error }, 'WebSocket server connection error');
    });
  }

  private sendCurrentStates(socket: AuthenticatedSocket) {
    try {
      const currentStates = this.telemetrySimulator.getCurrentStates();
      socket.emit('current_states', currentStates);
      logger.debug({ username: socket.username }, 'Sent current states to client');
    } catch (error) {
      logger.error({ err: error, username: socket.username }, 'Error sending current states');
      socket.emit('error', { message: 'Failed to fetch current robot states' });
    }
  }

  // Initialize the service
  async initialize() {
    try {
      await this.telemetrySimulator.initialize();
      this.telemetrySimulator.start();
      logger.info('WebSocket service initialized successfully');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize WebSocket service');
      throw error;
    }
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down WebSocket service...');
    this.telemetrySimulator.stop();
    
    // Notify all clients about server shutdown
    this.io.emit('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.io.close();
    logger.info('WebSocket service shut down successfully');
  }
}
