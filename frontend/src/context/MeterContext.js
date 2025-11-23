import React, { createContext, useContext, useState, useEffect } from 'react';
import { meterService } from '../services/meterService';

const MeterContext = createContext();

export function useMeter() {
  const context = useContext(MeterContext);
  if (!context) {
    throw new Error('useMeter must be used within a MeterProvider');
  }
  return context;
}

export function MeterProvider({ children }) {
  const [meters, setMeters] = useState([]);
  const [selectedMeterId, setSelectedMeterId] = useState(null);
  const [selectedMeter, setSelectedMeter] = useState(null);
  const [meterReadings, setMeterReadings] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load all meters on mount
  useEffect(() => {
    loadMeters();
  }, []);

  // Load selected meter details when meter ID changes
  useEffect(() => {
    if (selectedMeterId && meters.length > 0) {
      const meter = meters.find(m => m.id === selectedMeterId);
      setSelectedMeter(meter);
      loadMeterData(selectedMeterId);
    }
  }, [selectedMeterId, meters]);

  const loadMeters = async () => {
    try {
      setLoading(true);
      const response = await meterService.getMeters();
      if (response.success) {
        setMeters(response.data);
        // Auto-select first meter if none selected
        if (!selectedMeterId && response.data.length > 0) {
          setSelectedMeterId(response.data[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load meters');
      console.error('Error loading meters:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMeterData = async (meterId) => {
    try {
      setLoading(true);
      const [readingsResponse, healthResponse] = await Promise.all([
        meterService.getMeterReadings(meterId),
        meterService.getMeterHealth(meterId)
      ]);

      if (readingsResponse.success) {
        setMeterReadings(readingsResponse.data);
      }

      if (healthResponse.success) {
        setHealthData(healthResponse.data);
      }
    } catch (err) {
      setError('Failed to load meter data');
      console.error('Error loading meter data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectMeter = (meterId) => {
    setSelectedMeterId(meterId);
  };

  const addMeterReading = async (meterId, data) => {
    try {
      const response = await meterService.addMeterData(meterId, data);
      if (response.success) {
        // Reload meter data after adding new reading
        await loadMeterData(meterId);
      }
      return response;
    } catch (err) {
      setError('Failed to add meter reading');
      console.error('Error adding meter reading:', err);
      throw err;
    }
  };

  const value = {
    meters,
    selectedMeterId,
    selectedMeter,
    meterReadings,
    healthData,
    loading,
    error,
    selectMeter,
    addMeterReading,
    reloadMeterData: () => selectedMeterId && loadMeterData(selectedMeterId),
  };

  return (
    <MeterContext.Provider value={value}>
      {children}
    </MeterContext.Provider>
  );
}