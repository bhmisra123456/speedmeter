import { useState, useEffect, useRef } from 'react';
import webSocketService from '../services/webSocketService';

export function useWebSocket() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    socketId: null,
  });
  const listenersRef = useRef(new Map());

  useEffect(() => {
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

  const subscribeToMeter = (meterId) => {
    webSocketService.subscribeToMeter(meterId);
  };

  const unsubscribeFromMeter = (meterId) => {
    webSocketService.unsubscribeFromMeter(meterId);
  };

  const onMeterUpdate = (callback) => {
    const unsubscribe = webSocketService.on('meterUpdate', callback);
    listenersRef.current.set('meterUpdate', unsubscribe);
    return unsubscribe;
  };

  const onMeterStatusUpdate = (callback) => {
    const unsubscribe = webSocketService.on('meterStatusUpdate', callback);
    listenersRef.current.set('meterStatusUpdate', unsubscribe);
    return unsubscribe;
  };

  const onAlertAcknowledged = (callback) => {
    const unsubscribe = webSocketService.on('alertAcknowledged', callback);
    listenersRef.current.set('alertAcknowledged', unsubscribe);
    return unsubscribe;
  };

  const onAlertUpdate = (callback) => {
    // Listen for both new alerts and acknowledged alerts
    const unsubscribeNew = webSocketService.on('alertAcknowledged', (data) => {
      callback({ acknowledged_alert_id: data.alert_id, ...data });
    });
    
    const unsubscribeMeter = webSocketService.on('meterUpdate', (data) => {
      // Check if this update contains alert information
      if (data.alert) {
        callback({ alert: data.alert });
      }
    });
    
    return () => {
      unsubscribeNew();
      unsubscribeMeter();
    };
  };

  useEffect(() => {
    // Cleanup all listeners on unmount
    return () => {
      listenersRef.current.forEach((unsubscribe) => {
        unsubscribe();
      });
      listenersRef.current.clear();
    };
  }, []);

  return {
    connectionStatus,
    subscribeToMeter,
    unsubscribeFromMeter,
    onMeterUpdate,
    onMeterStatusUpdate,
    onAlertAcknowledged,
    onAlertUpdate,
    isConnected: connectionStatus.connected,
  };
}