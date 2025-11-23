import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Badge,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Done as DoneIcon,
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from '@mui/icons-material';
import { meterService } from '../services/meterService';
import { useWebSocket } from '../hooks/useWebSocket';
import { useMeter } from '../context/MeterContext';

const AlertsPanel = ({ showDetailed = false, compact = false }) => {
  const { selectedMeter } = useMeter();
  const { onAlertUpdate } = useWebSocket();
  
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [acknowledgmentDialogOpen, setAcknowledgmentDialogOpen] = useState(false);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState('all');
  const [acknowledgmentFilter, setAcknowledgmentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  
  // Alert statistics
  const [alertStats, setAlertStats] = useState({
    total: 0,
    critical: 0,
    warning: 0,
    info: 0,
    acknowledged: 0,
    active: 0,
  });

  useEffect(() => {
    loadAlerts();
    setupWebSocketListeners();
  }, [selectedMeter]);

  useEffect(() => {
    filterAlerts();
  }, [alerts, severityFilter, acknowledgmentFilter, typeFilter, showOnlyActive]);

  const setupWebSocketListeners = () => {
    // Listen for new alerts
    const unsubscribe = onAlertUpdate((data) => {
      if (data.alert) {
        setAlerts(prev => [data.alert, ...prev]);
      }
      if (data.acknowledged_alert_id) {
        setAlerts(prev => prev.map(alert => 
          alert.id === data.acknowledged_alert_id 
            ? { ...alert, acknowledged: true }
            : alert
        ));
      }
    });
    
    return unsubscribe;
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        limit: showDetailed ? 200 : 50,
        ...(selectedMeter && { meter_id: selectedMeter.id }),
      };
      
      const response = await meterService.getAlerts(params);
      if (response.success) {
        setAlerts(response.data);
      }
    } catch (err) {
      setError('Failed to load alerts');
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = [...alerts];

    // Filter by severity
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Filter by acknowledgment status
    if (acknowledgmentFilter !== 'all') {
      const isAcknowledged = acknowledgmentFilter === 'acknowledged';
      filtered = filtered.filter(alert => alert.acknowledged === isAcknowledged);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.alert_type === typeFilter);
    }

    // Filter by active status
    if (showOnlyActive) {
      filtered = filtered.filter(alert => !alert.acknowledged);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    setFilteredAlerts(filtered);
  };

  const updateAlertStats = () => {
    const stats = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      active: alerts.filter(a => !a.acknowledged).length,
    };
    setAlertStats(stats);
  };

  useEffect(() => {
    updateAlertStats();
  }, [alerts]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      case 'warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'info':
        return <InfoIcon sx={{ color: '#2196f3' }} />;
      default:
        return <InfoIcon sx={{ color: '#757575' }} />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'temperature':
        return '#f44336';
      case 'power_quality':
        return '#ff9800';
      case 'relay_health':
        return '#9c27b0';
      case 'health':
        return '#3f51b5';
      case 'power_factor':
        return '#795548';
      default:
        return '#757575';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
    setDetailDialogOpen(true);
  };

  const handleAcknowledgeAlert = async (alert) => {
    try {
      await meterService.acknowledgeAlert(alert.id);
      setAlerts(prev => prev.map(a => 
        a.id === alert.id ? { ...a, acknowledged: true } : a
      ));
      setAcknowledgmentDialogOpen(false);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleBatchAcknowledge = async () => {
    const unacknowledgedAlerts = filteredAlerts.filter(a => !a.acknowledged);
    try {
      await Promise.all(
        unacknowledgedAlerts.map(alert => meterService.acknowledgeAlert(alert.id))
      );
      setAlerts(prev => prev.map(a => 
        unacknowledgedAlerts.some(ua => ua.id === a.id) 
          ? { ...a, acknowledged: true }
          : a
      ));
    } catch (err) {
      console.error('Error batch acknowledging alerts:', err);
    }
  };

  const getUniqueAlertTypes = () => {
    const types = [...new Set(alerts.map(alert => alert.alert_type))];
    return types.sort();
  };

  if (loading && alerts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading alerts...</Typography>
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

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={alertStats.active} color="error">
            <NotificationsIcon />
          </Badge>
          Alerts Panel
          {selectedMeter && (
            <Typography variant="body2" color="textSecondary">
              ({selectedMeter.name})
            </Typography>
          )}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadAlerts}
            disabled={loading}
          >
            Refresh
          </Button>
          {!showOnlyActive && filteredAlerts.filter(a => !a.acknowledged).length > 0 && (
            <Button
              size="small"
              startIcon={<DoneIcon />}
              onClick={handleBatchAcknowledge}
              color="primary"
            >
              Acknowledge All
            </Button>
          )}
        </Box>
      </Box>

      {/* Alert Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">
              {alertStats.total}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Total
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error">
              {alertStats.critical}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Critical
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">
              {alertStats.warning}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Warning
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {alertStats.info}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Info
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {alertStats.acknowledged}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Acknowledged
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="error">
              {alertStats.active}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Active
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      {!compact && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FilterListIcon sx={{ color: 'text.secondary' }} />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                label="Severity"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={acknowledgmentFilter}
                onChange={(e) => setAcknowledgmentFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="acknowledged">Acknowledged</MenuItem>
                <MenuItem value="unacknowledged">Unacknowledged</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type"
              >
                <MenuItem value="all">All</MenuItem>
                {getUniqueAlertTypes().map(type => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyActive}
                  onChange={(e) => setShowOnlyActive(e.target.checked)}
                  size="small"
                />
              }
              label="Active only"
            />
          </Box>
        </Paper>
      )}

      {/* Alerts List */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {filteredAlerts.length > 0 ? (
            <List sx={{ maxHeight: compact ? 300 : 600, overflow: 'auto' }}>
              {filteredAlerts.map((alert, index) => (
                <React.Fragment key={alert.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: alert.acknowledged ? 'transparent' : 
                        alert.severity === 'critical' ? 'rgba(244, 67, 54, 0.05)' :
                        alert.severity === 'warning' ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <ListItemIcon>
                      {getSeverityIcon(alert.severity)}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {alert.message}
                          </Typography>
                          {alert.acknowledged && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Acknowledged"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Chip
                            label={alert.severity.toUpperCase()}
                            size="small"
                            color={getSeverityColor(alert.severity)}
                          />
                          <Chip
                            label={alert.alert_type.replace('_', ' ').toUpperCase()}
                            size="small"
                            style={{ backgroundColor: getAlertTypeColor(alert.alert_type), color: 'white' }}
                          />
                          <Typography variant="caption" color="textSecondary">
                            {formatTimeAgo(alert.timestamp)}
                          </Typography>
                          {alert.meter_id && (
                            <Typography variant="caption" color="textSecondary">
                              Meter: {alert.meter_id}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {!alert.acknowledged && (
                        <Tooltip title="Acknowledge Alert">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledgeAlert(alert);
                            }}
                            color="primary"
                          >
                            <DoneIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItem>
                  {index < filteredAlerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <NotificationsOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary">
                No alerts found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {alerts.length === 0 ? 'No alerts have been generated yet' : 'No alerts match the current filters'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedAlert && getSeverityIcon(selectedAlert.severity)}
          Alert Details
        </DialogTitle>
        
        <DialogContent>
          {selectedAlert && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Alert Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Message:</strong> {selectedAlert.message}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong> {selectedAlert.alert_type.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Severity:</strong> 
                    <Chip
                      label={selectedAlert.severity.toUpperCase()}
                      size="small"
                      color={getSeverityColor(selectedAlert.severity)}
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong>
                    <Chip
                      icon={selectedAlert.acknowledged ? <CheckCircleIcon /> : <NotificationsActiveIcon />}
                      label={selectedAlert.acknowledged ? 'Acknowledged' : 'Active'}
                      size="small"
                      color={selectedAlert.acknowledged ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Metadata
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Meter ID:</strong> {selectedAlert.meter_id}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Created:</strong> {formatTimestamp(selectedAlert.timestamp)}
                  </Typography>
                  {selectedAlert.related_metric && (
                    <Typography variant="body2">
                      <strong>Related Metric:</strong> {selectedAlert.related_metric}
                    </Typography>
                  )}
                  {selectedAlert.threshold_value && (
                    <Typography variant="body2">
                      <strong>Threshold:</strong> {selectedAlert.threshold_value}
                    </Typography>
                  )}
                  {selectedAlert.actual_value && (
                    <Typography variant="body2">
                      <strong>Actual Value:</strong> {selectedAlert.actual_value}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          {selectedAlert && !selectedAlert.acknowledged && (
            <Button
              onClick={() => {
                setDetailDialogOpen(false);
                handleAcknowledgeAlert(selectedAlert);
              }}
              startIcon={<DoneIcon />}
              variant="contained"
            >
              Acknowledge Alert
            </Button>
          )}
          <Button onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlertsPanel;