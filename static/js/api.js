class ApiService {
    constructor() {
        this.socket = io();
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            document.dispatchEvent(new CustomEvent('ws-connected'));
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            document.dispatchEvent(new CustomEvent('ws-disconnected'));
        });

        this.socket.on('meter_update', (data) => {
            document.dispatchEvent(new CustomEvent('meter-update', { detail: data }));
        });
        
        this.socket.on('alert_acknowledged', (data) => {
            document.dispatchEvent(new CustomEvent('alert-acknowledged', { detail: data }));
        });
    }

    subscribeToMeter(meterId) {
        this.socket.emit('subscribe_meter', { meter_id: meterId });
    }

    unsubscribeFromMeter(meterId) {
        this.socket.emit('unsubscribe_meter', { meter_id: meterId });
    }

    async getMeters() {
        try {
            const response = await axios.get('/api/meters');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching meters:', error);
            throw error;
        }
    }

    async getMeterHealth(meterId) {
        try {
            const response = await axios.get(`/api/meter/${meterId}/health`);
            return response.data.data;
        } catch (error) {
            console.error(`Error fetching health for meter ${meterId}:`, error);
            throw error;
        }
    }

    async sendMeterData(meterId, data) {
        try {
            const response = await axios.post(`/api/meter/${meterId}/data`, data);
            return response.data;
        } catch (error) {
            console.error(`Error sending data for meter ${meterId}:`, error);
            throw error;
        }
    }

    async getAlerts(meterId = null) {
        try {
            const params = meterId ? { meter_id: meterId } : {};
            const response = await axios.get('/api/alerts', { params });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching alerts:', error);
            throw error;
        }
    }
}

// Export a singleton instance
const apiService = new ApiService();
