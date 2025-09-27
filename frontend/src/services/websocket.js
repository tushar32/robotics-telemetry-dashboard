import { io } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }

      this.socket = io(WS_URL, {
        auth: {
          token: token
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.emit('connection_status', { status: 'connected' });
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.emit('connection_status', { status: 'disconnected' });
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  emit(event, ...args) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }

  requestCurrentStates() {
    this.emit('get_current_states');
  }
  
  isConnectedToServer() {
    return this.socket ? this.socket.connected : false;
  }

  getConnectionState() {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }
}

const websocketService = new WebSocketService();

export default websocketService;
