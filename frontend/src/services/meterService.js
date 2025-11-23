import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Meter Service
export const meterService = {
  // Get all meters
  getMeters: async () => {
    try {
      const response = await api.get('/meters');
      return response.data;
    } catch (error) {
      console.error('Error fetching meters:', error);
      throw error;
    }
  },

  // Get meter by ID
  getMeter: async (meterId) => {
    try {
      const response = await api.get(`/meters/${meterId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching meter:', error);
      throw error;
    }
  },

  // Create new meter
  createMeter: async (meterData) => {
    try {
      const response = await api.post('/meters', meterData);
      return response.data;
    } catch (error) {
      console.error('Error creating meter:', error);
      throw error;
    }
  },

  // Get meter readings
  getMeterReadings: async (meterId, params = {}) => {
    try {
      const response = await api.get(`/meter/${meterId}/readings`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching meter readings:', error);
      throw error;
    }
  },

  // Add meter reading data
  addMeterData: async (meterId, data) => {
    try {
      const response = await api.post(`/meter/${meterId}/data`, data);
      return response.data;
    } catch (error) {
      console.error('Error adding meter data:', error);
      throw error;
    }
  },

  // Get meter health data
  getMeterHealth: async (meterId) => {
    try {
      const response = await api.get(`/meter/${meterId}/health`);
      return response.data;
    } catch (error) {
      console.error('Error fetching meter health:', error);
      throw error;
    }
  },

  // Get dashboard analytics
  getDashboardAnalytics: async (meterId) => {
    try {
      const response = await api.get(`/analytics/dashboard/${meterId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  },

  // Get failure prediction
  getFailurePrediction: async (meterId) => {
    try {
      const response = await api.get(`/predict/failure/${meterId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching failure prediction:', error);
      throw error;
    }
  },

  // Get maintenance schedule
  getMaintenanceSchedule: async (params = {}) => {
    try {
      const response = await api.get('/maintenance/schedule', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching maintenance schedule:', error);
      throw error;
    }
  },

  // Get alerts
  getAlerts: async (params = {}) => {
    try {
      const response = await api.get('/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  // Acknowledge alert
  acknowledgeAlert: async (alertId) => {
    try {
      const response = await api.post(`/alerts/${alertId}/acknowledge`);
      return response.data;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  },

  // User login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      if (response.data.success && response.data.access_token) {
        localStorage.setItem('auth_token', response.data.access_token);
      }
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  // User logout
  logout: () => {
    localStorage.removeItem('auth_token');
  },
};

export default api;