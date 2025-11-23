import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    const serverUrl = process.env.REACT_APP_WEBSOCKET_URL || window.location.origin;
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.emit('connectionStatus', { connected: true });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.emit('connectionStatus', { connected: false });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.emit('connectionError', { error });
    });

    // Meter-specific events
    this.socket.on('meter_update', (data) => {
      console.log('Meter update received:', data);
      this.emit('meterUpdate', data);
    });

    this.socket.on('meter_status_update', (data) => {
      console.log('Meter status update received:', data);
      this.emit('meterStatusUpdate', data);
    });

    this.socket.on('alert_acknowledged', (data) => {
      console.log('Alert acknowledged:', data);
      this.emit('alertAcknowledged', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Subscribe to a specific meter for real-time updates
  subscribeToMeter(meterId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_meter', { meter_id: meterId });
      console.log(`Subscribed to meter updates for ${meterId}`);
    }
  }

  // Unsubscribe from meter updates
  unsubscribeFromMeter(meterId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_meter', { meter_id: meterId });
      console.log(`Unsubscribed from meter updates for ${meterId}`);
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event callback for ${event}:`, error);
        }
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }

  // Send custom event
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot send event: WebSocket not connected');
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// React hook for using WebSocket
export const useWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = React.useState({
    connected: false,
    socketId: null,
  });

  React.useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect();

    // Listen for connection status changes
    const unsubscribeConnection = webSocketService.on('connectionStatus', (status) => {
      setConnectionStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeConnection();
      webSocketService.disconnect();
    };
  }, []);

  return {
    ...webSocketService,
    connectionStatus,
  };
};

export default webSocketService;