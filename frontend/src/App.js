import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Paper,
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ElectricMeter as ElectricMeterIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

import DigitalMeter from './components/DigitalMeter';
import MeterSelector from './components/MeterSelector';
import HealthDashboard from './components/HealthDashboard';
import AlertsPanel from './components/AlertsPanel';

import { MeterProvider } from './context/MeterContext';
import { useWebSocket } from './hooks/useWebSocket';

const DRAWER_WIDTH = 240;

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Initialize WebSocket connection
  useWebSocket();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Digital Meters', icon: <ElectricMeterIcon />, path: '/meters' },
    { text: 'Analytics', icon: <TimelineIcon />, path: '/analytics' },
    { text: 'Alerts', icon: <WarningIcon />, path: '/alerts' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Smart Meter
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton>
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <MeterProvider>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        
        {/* App Bar */}
        <AppBar
          position="fixed"
          sx={{
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            ml: { md: `${DRAWER_WIDTH}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Smart Meter Predictive Maintenance
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Navigation Drawer */}
        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
            }}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
            minHeight: '100vh',
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Toolbar />
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/meters" element={<MetersPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </MeterProvider>
  );
}

// Dashboard Page Component
function Dashboard() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            System Overview
          </Typography>
          <MeterSelector />
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Digital Meter Display
          </Typography>
          <DigitalMeter />
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            System Health
          </Typography>
          <HealthDashboard />
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <AlertsPanel />
      </Grid>
    </Grid>
  );
}

// Meters Page
function MetersPage() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Smart Meters Management
          </Typography>
          <MeterSelector showList={true} />
        </Paper>
      </Grid>
    </Grid>
  );
}

// Analytics Page
function AnalyticsPage() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Analytics & Predictions
          </Typography>
          <HealthDashboard showDetailed={true} />
        </Paper>
      </Grid>
    </Grid>
  );
}

// Alerts Page
function AlertsPage() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <AlertsPanel showDetailed={true} />
      </Grid>
    </Grid>
  );
}

// Settings Page
function SettingsPage() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            System Settings
          </Typography>
          <Typography>
            Settings configuration will be implemented here.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default App;