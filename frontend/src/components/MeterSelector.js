import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ElectricMeter as ElectricMeterIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useMeter } from '../context/MeterContext';
import { meterService } from '../services/meterService';

const MeterSelector = ({ showList = false, compact = false }) => {
  const {
    meters,
    selectedMeterId,
    selectedMeter,
    selectMeter,
    loading,
    error,
    reloadMeterData
  } = useMeter();
  
  const [listView, setListView] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <ElectricMeterIcon sx={{ color: '#757575' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getMeterTypeIcon = (type) => {
    return <ElectricMeterIcon sx={{ color: '#1976d2' }} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDaysUntilMaintenance = (nextMaintenance) => {
    if (!nextMaintenance) return null;
    const nextDate = new Date(nextMaintenance);
    const today = new Date();
    const diffTime = nextDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleMeterSelect = (meterId) => {
    selectMeter(meterId);
  };

  const handleRefresh = async () => {
    await reloadMeterData();
  };

  if (loading && meters.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <Typography>Loading meters...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Error loading meters: {error}</Typography>
      </Box>
    );
  }

  if (!meters.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No meters available. Please add meters to the system.</Typography>
      </Box>
    );
  }

  // Dropdown view for compact mode or dashboard
  if (!showList && !listView) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Select Meter</InputLabel>
            <Select
              value={selectedMeterId || ''}
              onChange={(e) => handleMeterSelect(e.target.value)}
              label="Select Meter"
            >
              {meters.map((meter) => (
                <MenuItem key={meter.id} value={meter.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(meter.status)}
                    <Box>
                      <Typography variant="body2">{meter.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {meter.id} - {meter.location}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {showList && (
            <FormControlLabel
              control={
                <Switch
                  checked={listView}
                  onChange={(e) => setListView(e.target.value)}
                  size="small"
                />
              }
              label="List View"
            />
          )}
        </Box>

        {selectedMeter && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <ElectricMeterIcon sx={{ color: '#1976d2' }} />
                    <Typography variant="h6">{selectedMeter.name}</Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    ID: {selectedMeter.id}
                  </Typography>
                  <Chip
                    label={selectedMeter.status}
                    color={getStatusColor(selectedMeter.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon sx={{ color: '#757575' }} />
                    <Typography variant="body2">{selectedMeter.location}</Typography>
                  </Box>
                  <Chip
                    label={selectedMeter.meter_type}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BuildIcon sx={{ color: '#757575' }} />
                    <Typography variant="body2">
                      Install: {formatDate(selectedMeter.installation_date)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    Last: {formatDate(selectedMeter.last_maintenance)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ color: '#757575' }} />
                    <Typography variant="body2">
                      Next: {formatDate(selectedMeter.next_maintenance)}
                    </Typography>
                  </Box>
                  {(() => {
                    const daysUntil = getDaysUntilMaintenance(selectedMeter.next_maintenance);
                    return daysUntil !== null ? (
                      <Chip
                        label={`${daysUntil} days`}
                        color={daysUntil <= 7 ? 'error' : daysUntil <= 30 ? 'warning' : 'success'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    ) : null;
                  })()}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    );
  }

  // List view for detailed meter management
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Smart Meters ({meters.length})
        </Typography>
        
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <FormControlLabel
          control={
            <Switch
              checked={listView}
              onChange={(e) => setListView(!listView)}
              size="small"
            />
          }
          label="Compact View"
        />
      </Box>

      <Grid container spacing={2}>
        {meters.map((meter) => (
          <Grid item xs={12} md={6} lg={4} key={meter.id}>
            <Card
              sx={{
                cursor: 'pointer',
                border: selectedMeterId === meter.id ? 2 : 1,
                borderColor: selectedMeterId === meter.id ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: 3,
                },
              }}
              onClick={() => handleMeterSelect(meter.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getMeterTypeIcon(meter.meter_type)}
                    <Typography variant="h6" component="div">
                      {meter.name}
                    </Typography>
                  </Box>
                  {getStatusIcon(meter.status)}
                </Box>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>ID:</strong> {meter.id}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Location:</strong> {meter.location}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Type:</strong> {meter.meter_type}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Installed:</strong> {formatDate(meter.installation_date)}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={meter.status}
                    color={getStatusColor(meter.status)}
                    size="small"
                  />
                  <Chip
                    label={meter.meter_type}
                    variant="outlined"
                    size="small"
                  />
                  {(() => {
                    const daysUntil = getDaysUntilMaintenance(meter.next_maintenance);
                    return daysUntil !== null ? (
                      <Chip
                        label={`${daysUntil}d`}
                        color={daysUntil <= 7 ? 'error' : daysUntil <= 30 ? 'warning' : 'success'}
                        size="small"
                      />
                    ) : null;
                  })()}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {meters.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <ElectricMeterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No meters found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Add smart meters to start monitoring
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MeterSelector;