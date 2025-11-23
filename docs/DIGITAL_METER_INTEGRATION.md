# Digital Meter Hybrid Integration Guide

## Overview
This guide explains the hybrid integration solution for the Digital Meter component, allowing seamless integration between React components and vanilla JavaScript applications.

## Architecture

### Components Created

1. **`templates/digital-meter-hybrid.html`**
   - Standalone Digital Meter page with React integration
   - Uses React via CDN (no build process required)
   - Real-time WebSocket updates
   - Fully functional digital display with status indicators

2. **`static/js/digital-meter-module.js`**
   - Vanilla JavaScript module for embedding Digital Meter
   - Can be integrated into any HTML page
   - Provides API for meter selection and data updates
   - Self-contained with all required styles

3. **`templates/hybrid-dashboard.html`** (Updated)
   - Main dashboard with integrated Digital Meter
   - Supports both vanilla JS and React modes
   - Seamless meter selection integration

## Features

### Digital Meter Display
- **Primary Measurements**
  - Voltage RMS (V)
  - Current RMS (A)
  - Active Power (kW)
  - Frequency (Hz)

- **Secondary Measurements**
  - Power Factor
  - Reactive Power (kVAR)
  - Temperature (°C)
  - THD Voltage (%)

- **Status Indicators**
  - Power Quality (THD-based)
  - Load Status
  - Thermal Status
  - Frequency Status

### Real-time Features
- WebSocket connection for live updates
- Connection status indicator
- Automatic data refresh
- Timestamp display

## Usage

### Option 1: Standalone Page
Access the standalone digital meter page:
```
http://localhost:5000/digital-meter-hybrid
```

Features:
- Select meter from dropdown
- Connect to view real-time data
- Refresh data manually
- All React functionality via CDN

### Option 2: Embedded Module
Integrate into any HTML page:

```html
<!-- Include required dependencies -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.min.js"></script>
<script src="/static/js/digital-meter-module.js"></script>

<!-- Create container -->
<div id="digitalMeterContainer"></div>

<!-- Initialize module -->
<script>
    DigitalMeterModule.init('digitalMeterContainer', {
        apiBaseUrl: '/api',
        wsUrl: 'http://localhost:5000'
    });
    
    // Set meter
    DigitalMeterModule.setMeter({
        id: 'METER001',
        name: 'Main Building Meter',
        meter_type: 'smart',
        location: 'Building A',
        status: 'active'
    });
</script>
```

### Option 3: Hybrid Dashboard
Access the integrated dashboard:
```
http://localhost:5000/hybrid-dashboard
```

Features:
- Toggle between Classic Dashboard and React Interface
- Digital Meter integrated in Classic Dashboard
- Automatic meter selection synchronization
- Theme toggle (light/dark mode)

## API Reference

### DigitalMeterModule

#### Methods

**`init(containerId, options)`**
Initialize the Digital Meter module.

Parameters:
- `containerId` (string): ID of the container element
- `options` (object):
  - `apiBaseUrl` (string): Base URL for API calls (default: '/api')
  - `wsUrl` (string): WebSocket server URL (default: 'http://localhost:5000')
  - `updateInterval` (number): Update interval in ms (default: 2000)
  - `colors` (object): Custom color scheme

Example:
```javascript
DigitalMeterModule.init('myContainer', {
    apiBaseUrl: '/api',
    wsUrl: window.location.origin
});
```

**`setMeter(meter)`**
Set the selected meter and fetch its data.

Parameters:
- `meter` (object): Meter object with properties:
  - `id` (string): Meter ID
  - `name` (string): Meter name
  - `meter_type` (string): Meter type
  - `location` (string): Meter location
  - `status` (string): Meter status

Example:
```javascript
DigitalMeterModule.setMeter({
    id: 'METER001',
    name: 'Main Building Meter',
    meter_type: 'smart',
    location: 'Building A',
    status: 'active'
});
```

**`destroy()`**
Clean up and disconnect the module.

Example:
```javascript
DigitalMeterModule.destroy();
```

## Integration with Existing Code

### Connecting to Meter Selector

```javascript
// Get meter select element
const meterSelect = document.getElementById('meterSelect');

// Listen for changes
meterSelect.addEventListener('change', function() {
    const meterId = this.value;
    const meter = meters.find(m => m.id === meterId);
    
    if (meter) {
        DigitalMeterModule.setMeter(meter);
    }
});
```

### Handling WebSocket Events

The module automatically handles WebSocket connections and updates. You can access the state:

```javascript
// Check connection status
console.log(DigitalMeterModule.state.isConnected);

// Get current reading
console.log(DigitalMeterModule.state.currentReading);

// Get selected meter
console.log(DigitalMeterModule.state.selectedMeter);
```

## Customization

### Color Scheme

Customize the display colors:

```javascript
DigitalMeterModule.init('container', {
    colors: {
        voltage: '#00aaff',      // Voltage display color
        current: '#ff6600',      // Current display color
        power: '#00ff00',        // Power display color
        frequency: '#ff00ff',    // Frequency display color
        powerFactor: '#ffff00',  // Power factor color
        reactive: '#ffaa00',     // Reactive power color
        temperature: '#ff4444',  // Temperature color
        thd: '#44aaff'          // THD color
    }
});
```

### Styling

The module injects its own styles, but you can override them:

```css
/* Override digital display background */
.dm-display {
    background: rgba(10, 10, 30, 0.9) !important;
}

/* Override status card styling */
.dm-status-card {
    background: rgba(20, 20, 40, 0.8) !important;
}

/* Customize LED indicators */
.dm-led-dot {
    width: 14px !important;
    height: 14px !important;
}
```

## Backend Requirements

### API Endpoints Required

1. **GET `/api/meters`**
   - Returns list of all meters
   - Response: Array of meter objects

2. **GET `/api/meters/{meter_id}/readings`**
   - Returns readings for specific meter
   - Query params: `limit` (optional)
   - Response: Array of reading objects

### WebSocket Events

1. **Client → Server**
   - `subscribe_meter`: Subscribe to meter updates
     ```javascript
     socket.emit('subscribe_meter', { meter_id: 'METER001' });
     ```

2. **Server → Client**
   - `meter_reading`: Real-time meter reading update
     ```javascript
     {
         meter_id: 'METER001',
         reading: {
             voltage_rms: 230.5,
             current_rms: 12.3,
             power_active: 2.8,
             frequency: 50.0,
             // ... other fields
         }
     }
     ```

## Data Format

### Meter Object
```javascript
{
    id: 'METER001',
    name: 'Main Building Meter',
    meter_type: 'smart',
    location: 'Building A',
    status: 'active',
    installation_date: '2024-01-01'
}
```

### Reading Object
```javascript
{
    timestamp: '2024-11-22T10:00:00Z',
    voltage_rms: 230.5,
    current_rms: 12.3,
    power_active: 2.8,
    power_reactive: 0.5,
    power_factor: 0.98,
    frequency: 50.0,
    temperature: 35.2,
    thdv: 2.3,
    thdi: 1.8
}
```

## Troubleshooting

### Digital Meter Not Loading

1. Check if container element exists:
   ```javascript
   console.log(document.getElementById('digitalMeterContainer'));
   ```

2. Verify dependencies are loaded:
   ```javascript
   console.log(typeof axios);  // Should be 'function'
   console.log(typeof io);     // Should be 'function'
   ```

3. Check browser console for errors

### WebSocket Not Connecting

1. Verify WebSocket URL is correct
2. Check if backend WebSocket server is running
3. Check browser console for connection errors
4. Verify CORS settings if using different domains

### Data Not Updating

1. Check if meter is selected:
   ```javascript
   console.log(DigitalMeterModule.state.selectedMeter);
   ```

2. Verify WebSocket connection:
   ```javascript
   console.log(DigitalMeterModule.state.isConnected);
   ```

3. Check if backend is sending updates
4. Verify meter ID matches

## Performance Considerations

- **Update Frequency**: Default 2-second interval for API polling
- **WebSocket**: Preferred for real-time updates (lower latency)
- **Memory**: Module cleans up on destroy()
- **DOM Updates**: Efficient innerHTML updates only when data changes

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (requires ES6)

## Security Considerations

1. **API Authentication**: Ensure API endpoints are protected
2. **WebSocket Security**: Use WSS in production
3. **Input Validation**: Meter IDs are validated before API calls
4. **XSS Prevention**: All user data is properly escaped

## Future Enhancements

- [ ] Historical data visualization
- [ ] Export data to CSV/PDF
- [ ] Configurable alert thresholds
- [ ] Multi-meter comparison view
- [ ] Mobile-responsive improvements
- [ ] Offline mode with local storage
- [ ] Custom dashboard layouts

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Verify backend API is running
4. Check WebSocket connection status

## License

This integration is part of the Smart Meter Predictive Maintenance system.
