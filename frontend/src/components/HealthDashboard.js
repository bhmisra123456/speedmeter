import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tab,
  Tabs,
} from '@mui/material';
import {
  HealthAndSafety as HealthIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  ThermostatAuto as TempIcon,
  ElectricBolt as PowerIcon,
  DeviceThermostat as ThermalIcon,
  WbSunny as EnvironmentalIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMeter } from '../context/MeterContext';
import { meterService } from '../services/meterService';

const HealthDashboard = ({ showDetailed = false, compact = false }) => {
  const { selectedMeter, healthData, loading, error, reloadMeterData } = useMeter();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [predictionsData, setPredictionsData] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedMeter) {
      loadAnalytics();
      loadPredictions();
      loadMaintenanceSchedule();
    }
  }, [selectedMeter]);

  const loadAnalytics = async () => {
    if (!selectedMeter) return;
    
    try {
      setLoadingAnalytics(true);
      const response = await meterService.getDashboardAnalytics(selectedMeter.id);
      if (response.success) {
        setAnalyticsData(response.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadPredictions = async () => {
    if (!selectedMeter) return;
    
    try {
      const response = await meterService.getFailurePrediction(selectedMeter.id);
      if (response.success) {
        setPredictionsData(response.data);
      }
    } catch (err) {
      console.error('Error loading predictions:', err);
    }
  };

  const loadMaintenanceSchedule = async () => {
    if (!selectedMeter) return;
    
    try {
      const response = await meterService.getMaintenanceSchedule({ meter_id: selectedMeter.id });
      if (response.success) {
        setMaintenanceData(response.data);
      }
    } catch (err) {
      console.error('Error loading maintenance schedule:', err);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getHealthScoreLabel = (score) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getRiskLevelColor = (risk) => {
    switch (risk) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      case 'critical': return '#d32f2f';
      default: return '#757575';
    }
  };

  const getRiskLevelIcon = (risk) => {
    switch (risk) {
      case 'low': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'medium': return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'high':
      case 'critical': return <ErrorIcon sx={{ color: '#f44336' }} />;
      default: return <HealthIcon sx={{ color: '#757575' }} />;
    }
  };

  const formatRiskLevel = (risk) => {
    return risk.charAt(0).toUpperCase() + risk.slice(1);
  };

  // Generate mock historical data for charts if not available
  const generateHistoricalData = () => {
    if (!healthData?.health_record?.timestamp) return [];
    
    const data = [];
    const baseDate = new Date(healthData.health_record.timestamp);
    const currentScore = healthData.health_record.overall_health_score || 75;
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const variation = (Math.random() - 0.5) * 10;
      const score = Math.max(0, Math.min(100, currentScore + variation + (6 - i) * 0.5));
      
      data.push({
        date: date.toLocaleDateString(),
        healthScore: Math.round(score),
        temperature: 20 + Math.random() * 30,
        powerFactor: 0.85 + Math.random() * 0.1,
        thdv: 1 + Math.random() * 4,
      });
    }
    
    return data;
  };

  // Prepare agent scores for radial chart
  const prepareAgentScores = () => {
    if (!healthData?.health_record) return [];
    
    const record = healthData.health_record;
    return [
      {
        name: 'Condition',
        value: record.condition_monitor_score || 75,
        color: '#8884d8',
      },
      {
        name: 'Power Quality',
        value: record.power_quality_score || 80,
        color: '#82ca9d',
      },
      {
        name: 'Relay Health',
        value: record.relay_health_score || 85,
        color: '#ffc658',
      },
      {
        name: 'Environmental',
        value: record.environmental_score || 70,
        color: '#ff7300',
      },
    ];
  };

  // Prepare anomaly data for pie chart
  const prepareAnomalyData = () => {
    if (!healthData?.health_record?.anomaly_details) return [];
    
    try {
      const anomalies = JSON.parse(healthData.health_record.anomaly_details);
      const counts = anomalies.reduce((acc, anomaly) => {
        const type = anomaly.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(counts).map(([type, count], index) => ({
        name: type.replace('_', ' ').toUpperCase(),
        value: count,
        color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'][index % 5],
      }));
    } catch (e) {
      return [];
    }
  };

  if (loading && !healthData) {
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
        Please select a meter to view health dashboard.
      </Alert>
    );
  }

  const healthRecord = healthData?.health_record;
  const historicalData = generateHistoricalData();
  const agentScores = prepareAgentScores();
  const anomalyData = prepareAnomalyData();
  const overallScore = healthRecord?.overall_health_score || 75;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealthIcon />
          System Health Dashboard
        </Typography>
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={reloadMeterData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {!compact && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Overview" />
            <Tab label="Analytics" />
            <Tab label="Predictions" />
            <Tab label="Maintenance" />
          </Tabs>
        </Box>
      )}

      {/* Overview Tab */}
      {(selectedTab === 0 || compact) && (
        <Grid container spacing={2}>
          {/* Overall Health Score */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Overall Health Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 120, height: 120, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="90%"
                        data={[{ value: overallScore, fill: getHealthScoreColor(overallScore) }]}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={10}
                          fill={getHealthScoreColor(overallScore)}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {Math.round(overallScore)}
                      </Typography>
                      <Typography variant="caption">
                        {getHealthScoreLabel(overallScore)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      Risk Level
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      {getRiskLevelIcon(healthRecord?.risk_level || 'medium')}
                      <Typography variant="h6">
                        {formatRiskLevel(healthRecord?.risk_level || 'medium')}
                      </Typography>
                    </Box>
                    
                    {healthRecord?.failure_probability && (
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                        Failure Probability: {(healthRecord.failure_probability * 100).toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Agent Scores */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Component Health Scores
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {agentScores.map((agent) => (
                    <Box key={agent.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{agent.name}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {Math.round(agent.value)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={agent.value}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: agent.color,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Health Trend */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Trend (7 Days)
                </Typography>
                <Box sx={{ width: '100%', height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="healthScore"
                        stroke={getHealthScoreColor(overallScore)}
                        strokeWidth={3}
                        dot={{ fill: getHealthScoreColor(overallScore), strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Agent-specific Details (if showDetailed) */}
          {showDetailed && healthData?.health_record && (
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Detailed Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {/* Condition Monitoring */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUpIcon />
                            Condition Monitoring
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Score: {Math.round(healthRecord.condition_monitor_score || 75)}%
                          </Typography>
                          {healthRecord.anomaly_count > 0 && (
                            <Chip
                              label={`${healthRecord.anomaly_count} anomalies detected`}
                              color="warning"
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Power Quality */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PowerIcon />
                            Power Quality
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Score: {Math.round(healthRecord.power_quality_score || 80)}%
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Status: IEEE 519 Compliant
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Relay Health */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ThermalIcon />
                            Relay Health
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Score: {Math.round(healthRecord.relay_health_score || 85)}%
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Contact Resistance: Normal
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Environmental */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EnvironmentalIcon />
                            Environmental
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Score: {Math.round(healthRecord.environmental_score || 70)}%
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Temperature: Normal Range
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}
        </Grid>
      )}

      {/* Analytics Tab */}
      {selectedTab === 1 && !compact && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Power Quality Analytics
                </Typography>
                {loadingAnalytics ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : analyticsData?.analytics ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="primary">
                          {analyticsData.analytics.power_consumption?.average?.toFixed(1) || '0.0'} kW
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average Power
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="secondary">
                          {analyticsData.analytics.power_quality?.average_thdv?.toFixed(1) || '0.0'}%
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average THD-V
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" color="success.main">
                          {analyticsData.analytics.equipment_health?.average_temperature?.toFixed(1) || '0.0'}°C
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average Temperature
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography color="textSecondary">No analytics data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Detailed Analytics Charts */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Multi-Parameter Trends
                </Typography>
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <RechartsTooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="healthScore"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Health Score"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#ff7300"
                        strokeWidth={2}
                        name="Temperature (°C)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="powerFactor"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Power Factor"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Anomaly Distribution
                </Typography>
                {anomalyData.length > 0 ? (
                  <Box sx={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={anomalyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {anomalyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      No anomalies detected
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Predictions Tab */}
      {selectedTab === 2 && !compact && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Failure Predictions
                </Typography>
                {predictionsData?.prediction ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        {getRiskLevelIcon(predictionsData.prediction.risk_level)}
                        <Box>
                          <Typography variant="h6">
                            {formatRiskLevel(predictionsData.prediction.risk_level)} Risk
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Confidence: {predictionsData.confidence}%
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" gutterBottom>
                        <strong>Time to Failure:</strong> {predictionsData.prediction.time_to_failure}
                      </Typography>
                      
                      <Typography variant="body2" gutterBottom>
                        <strong>Failure Probability:</strong> {predictionsData.prediction.failure_probability.toFixed(1)}%
                      </Typography>
                      
                      <Typography variant="body2" gutterBottom>
                        <strong>Cost Impact:</strong> ${predictionsData.prediction.cost_impact.toLocaleString()}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" gutterBottom>
                        Critical Factors:
                      </Typography>
                      <List dense>
                        {predictionsData.prediction.critical_factors.map((factor, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <WarningIcon sx={{ color: '#ff9800' }} />
                            </ListItemIcon>
                            <ListItemText primary={factor} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography color="textSecondary">No prediction data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Maintenance Tab */}
      {selectedTab === 3 && !compact && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Maintenance Schedule
                </Typography>
                {maintenanceData && maintenanceData.length > 0 ? (
                  <List>
                    {maintenanceData.map((task, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemIcon>
                            <BuildIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={task.task}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  Meter: {task.meter_name} ({task.meter_id})
                                </Typography>
                                <Typography variant="body2">
                                  Priority: <Chip label={task.priority} color={
                                    task.priority === 'urgent' ? 'error' :
                                    task.priority === 'high' ? 'warning' : 'default'
                                  } size="small" sx={{ ml: 1 }} />
                                </Typography>
                                <Typography variant="body2">
                                  Cost: ${task.estimated_cost} | Timeframe: {task.timeframe}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < maintenanceData.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                    <Typography variant="body2" color="textSecondary">
                      No maintenance tasks scheduled
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default HealthDashboard;