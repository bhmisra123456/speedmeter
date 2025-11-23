import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ElectricBolt as ElectricBoltIcon,
  AcUnit as VoltageIcon,
  FlashOn as CurrentIcon,
  Power as PowerIcon,
  Timeline as FrequencyIcon,
  DeviceThermostat as TemperatureIcon,
} from '@mui/icons-material';
import { useMeter } from '../context/MeterContext';
import { useWebSocket } from '../hooks/useWebSocket';

// SVG Digital Display Component
const DigitalDisplay = ({ value, unit, label, color = '#00ff00', size = 'large' }) => {
  const displaySize = size === 'large' ? 48 : size === 'medium' ? 32 : 24;
  const fontSize = size === 'large' ? '2.5rem' : size === 'medium' ? '1.8rem' : '1.2rem';

  return (
    <Box
      sx={{
        textAlign: 'center',
        p: 2,
        border: `2px solid ${color}`,
        borderRadius: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        position: 'relative',
        minWidth: 140,
      }}
    >
      <Typography
        variant="h4"
        className="digital-display"
        sx={{
          color: color,
          fontSize: fontSize,
          fontWeight: 'bold',
          textShadow: `0 0 10px ${color}`,
          fontFamily: 'monospace',
        }}
      >
        {value || '--'}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: color,
          fontSize: '0.8rem',
          textShadow: `0 0 5px ${color}`,
          fontFamily: 'monospace',
        }}
      >
        {unit}
      </Typography>
      <Typography
        variant="caption"
        display="block"
        sx={{
          color: '#ccc',
          fontSize: '0.7rem',
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// LED Status Indicator
const LEDIndicator = ({ status, label }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
      case 'normal':
      case 'online':
        return '#00ff00';
      case 'warning':
        return '#ff8800';
      case 'critical':
      case 'offline':
        return '#ff0000';
      default:
        return '#666666';
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          boxShadow: `0 0 8px ${getStatusColor()}`,
        }}
      />
      <Typography variant="caption" sx={{ color: '#ccc' }}>
        {label}
      </Typography>
    </Box>
  );
};

const DigitalMeter = () => {
  const { selectedMeter, meterReadings, healthData, loading, error } = useMeter();
  const { onMeterUpdate, subscribeToMeter } = useWebSocket();
  const [realtimeData, setRealtimeData] = useState(null);

  useEffect(() => {
    if (selectedMeter) {
      subscribeToMeter(selectedMeter.id);
    }
  }, [selectedMeter, subscribeToMeter]);

  useEffect(() => {
    const unsubscribe = onMeterUpdate((data) => {
      if (data.meter_id === selectedMeter?.id) {
        setRealtimeData(data.reading);
      }
    });
    return unsubscribe;
  }, [selectedMeter, onMeterUpdate]);

  // Get latest reading data
  const latestReading = realtimeData || (meterReadings.length > 0 ? meterReadings[0] : null);
  const currentHealth = healthData;

  // Get status color based on health score
  const getHealthStatus = (score) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!selectedMeter) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Please select a meter to view digital display.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Meter Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {selectedMeter.name} ({selectedMeter.id})
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={selectedMeter.status}
            color={selectedMeter.status === 'active' ? 'success' : 'default'}
            size="small"
          />
          <Chip label={selectedMeter.meter_type} variant="outlined" size="small" />
          <Chip label={selectedMeter.location} variant="outlined" size="small" />
        </Box>
      </Box>

      {/* Digital Display Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.voltage_rms?.toFixed(1)}
            unit="V"
            label="Voltage RMS"
            color="#00aaff"
            size="medium"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.current_rms?.toFixed(2)}
            unit="A"
            label="Current RMS"
            color="#ff6600"
            size="medium"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.power_active?.toFixed(1)}
            unit="kW"
            label="Active Power"
            color="#00ff00"
            size="medium"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.frequency?.toFixed(1)}
            unit="Hz"
            label="Frequency"
            color="#ff00ff"
            size="medium"
          />
        </Grid>
      </Grid>

      {/* Secondary Measurements */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.power_factor?.toFixed(3)}
            unit=""
            label="Power Factor"
            color="#ffff00"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.power_reactive?.toFixed(1)}
            unit="kVAR"
            label="Reactive Power"
            color="#ffaa00"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.temperature?.toFixed(1)}
            unit="°C"
            label="Temperature"
            color="#ff4444"
            size="small"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <DigitalDisplay
            value={latestReading?.thdv?.toFixed(2)}
            unit="%"
            label="THD Voltage"
            color="#44aaff"
            size="small"
          />
        </Grid>
      </Grid>

      {/* Status Indicators */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ElectricBoltIcon sx={{ color: '#ffff00', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#ffff00', mb: 1 }}>
                Power Quality
              </Typography>
              <LEDIndicator
                status={
                  (latestReading?.thdv || 0) < 5 ? 'good' :
                  (latestReading?.thdv || 0) < 8 ? 'warning' : 'critical'
                }
                label={`THD: ${latestReading?.thdv?.toFixed(2) || '--'}%`}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <CurrentIcon sx={{ color: '#00ff00', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#00ff00', mb: 1 }}>
                Load Status
              </Typography>
              <LEDIndicator
                status={
                  (latestReading?.power_active || 0) < 50 ? 'good' :
                  (latestReading?.power_active || 0) < 80 ? 'warning' : 'critical'
                }
                label={`Load: ${((latestReading?.power_active || 0) / 100 * 100).toFixed(0)}%`}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TemperatureIcon sx={{ color: '#ff4444', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#ff4444', mb: 1 }}>
                Thermal
              </Typography>
              <LEDIndicator
                status={
                  (latestReading?.temperature || 0) < 40 ? 'good' :
                  (latestReading?.temperature || 0) < 60 ? 'warning' : 'critical'
                }
                label={`Temp: ${latestReading?.temperature?.toFixed(1) || '--'}°C`}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', border: '1px solid #333' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <FrequencyIcon sx={{ color: '#ff00ff', fontSize: 40, mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#ff00ff', mb: 1 }}>
                System Health
              </Typography>
              <LEDIndicator
                status={getHealthStatus(currentHealth?.overall_health_score || 50)}
                label={`Score: ${currentHealth?.overall_health_score?.toFixed(0) || '--'}%`}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Last Updated Timestamp */}
      {latestReading && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Last Updated: {new Date(latestReading.timestamp).toLocaleString()}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DigitalMeter;