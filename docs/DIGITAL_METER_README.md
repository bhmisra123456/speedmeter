# Digital Meter Hybrid Integration - Quick Start

## 🎯 What's Been Created

A complete hybrid integration solution that allows the Digital Meter component to work seamlessly in both React and vanilla JavaScript environments.

## 📦 Files Created

### 1. **Standalone Digital Meter Page**
- **File**: [`templates/digital-meter-hybrid.html`](templates/digital-meter-hybrid.html)
- **Purpose**: Fully functional standalone page with React via CDN
- **Access**: `http://localhost:5000/digital-meter-hybrid`
- **Features**:
  - No build process required
  - Real-time WebSocket updates
  - Digital display with 8 measurements
  - 4 status indicators
  - Meter selection dropdown

### 2. **Vanilla JS Module**
- **File**: [`static/js/digital-meter-module.js`](static/js/digital-meter-module.js)
- **Purpose**: Embeddable module for any HTML page
- **Features**:
  - Self-contained with styles
  - WebSocket integration
  - Simple API
  - No dependencies on React

### 3. **Updated Hybrid Dashboard**
- **File**: [`templates/hybrid-dashboard.html`](templates/hybrid-dashboard.html)
- **Purpose**: Main dashboard with integrated Digital Meter
- **Features**:
  - Toggle between vanilla JS and React modes
  - Digital Meter in Classic Dashboard view
  - Synchronized meter selection
  - Theme toggle (light/dark)

### 4. **Integration Example**
- **File**: [`templates/digital-meter-example.html`](templates/digital-meter-example.html)
- **Purpose**: Complete working example with code snippets
- **Access**: `http://localhost:5000/digital-meter-example`
- **Features**:
  - Live demo
  - Code examples
  - Integration patterns

### 5. **Documentation**
- **File**: [`docs/DIGITAL_METER_INTEGRATION.md`](docs/DIGITAL_METER_INTEGRATION.md)
- **Purpose**: Comprehensive integration guide
- **Contents**:
  - Architecture overview
  - API reference
  - Usage examples
  - Troubleshooting
  - Customization guide

## 🚀 Quick Start

### Option 1: Use Standalone Page
```bash
# Start your backend server
python app.py

# Access the standalone page
http://localhost:5000/digital-meter-hybrid
```

### Option 2: Embed in Your Page
```html
<!-- Include dependencies -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/axios/1.6.0/axios.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.min.js"></script>
<script src="/static/js/digital-meter-module.js"></script>

<!-- Create container -->
<div id="digitalMeterContainer"></div>

<!-- Initialize -->
<script>
    DigitalMeterModule.init('digitalMeterContainer');
    
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

### Option 3: Use Hybrid Dashboard
```bash
# Access the integrated dashboard
http://localhost:5000/hybrid-dashboard
```

## 📊 Digital Meter Features

### Primary Measurements
- ⚡ **Voltage RMS** (V) - Blue display
- 🔌 **Current RMS** (A) - Orange display
- 💡 **Active Power** (kW) - Green display
- 📡 **Frequency** (Hz) - Magenta display

### Secondary Measurements
- 📈 **Power Factor** - Yellow display
- ⚙️ **Reactive Power** (kVAR) - Amber display
- 🌡️ **Temperature** (°C) - Red display
- 📊 **THD Voltage** (%) - Light blue display

### Status Indicators
- ⚡ **Power Quality** - Based on THD
- 🔌 **Load Status** - Based on active power
- 🌡️ **Thermal** - Based on temperature
- 📊 **Frequency** - Based on frequency deviation

## 🔧 Configuration

### Basic Configuration
```javascript
DigitalMeterModule.init('container', {
    apiBaseUrl: '/api',
    wsUrl: 'http://localhost:5000',
    updateInterval: 2000
});
```

### Custom Colors
```javascript
DigitalMeterModule.init('container', {
    colors: {
        voltage: '#00aaff',
        current: '#ff6600',
        power: '#00ff00',
        frequency: '#ff00ff',
        powerFactor: '#ffff00',
        reactive: '#ffaa00',
        temperature: '#ff4444',
        thd: '#44aaff'
    }
});
```

## 🔌 Backend Requirements

### Required API Endpoints
1. `GET /api/meters` - List all meters
2. `GET /api/meters/{meter_id}/readings` - Get meter readings

### Required WebSocket Events
1. **Client → Server**: `subscribe_meter` - Subscribe to meter updates
2. **Server → Client**: `meter_reading` - Real-time reading updates

## 📱 Usage Examples

### Example 1: Simple Integration
```javascript
// Initialize
DigitalMeterModule.init('myContainer');

// Set meter
DigitalMeterModule.setMeter(meterObject);
```

### Example 2: With Meter Selector
```javascript
// Initialize module
DigitalMeterModule.init('digitalMeterContainer');

// Connect to meter selector
document.getElementById('meterSelect').addEventListener('change', function() {
    const meter = meters.find(m => m.id === this.value);
    if (meter) {
        DigitalMeterModule.setMeter(meter);
    }
});
```

### Example 3: Cleanup
```javascript
// When done
DigitalMeterModule.destroy();
```

## 🎨 Customization

### Override Styles
```css
/* Custom background */
.digital-meter-wrapper {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) !important;
}

/* Custom display size */
.dm-value {
    font-size: 2.5rem !important;
}

/* Custom LED size */
.dm-led-dot {
    width: 16px !important;
    height: 16px !important;
}
```

## 🐛 Troubleshooting

### Module Not Loading
```javascript
// Check if module is loaded
console.log(typeof DigitalMeterModule); // Should be 'object'

// Check dependencies
console.log(typeof axios); // Should be 'function'
console.log(typeof io);    // Should be 'function'
```

### WebSocket Not Connecting
```javascript
// Check connection status
console.log(DigitalMeterModule.state.isConnected);

// Check WebSocket URL
console.log(DigitalMeterModule.config.wsUrl);
```

### Data Not Updating
```javascript
// Check if meter is selected
console.log(DigitalMeterModule.state.selectedMeter);

// Check current reading
console.log(DigitalMeterModule.state.currentReading);
```

## 📚 Additional Resources

- **Full Documentation**: [`docs/DIGITAL_METER_INTEGRATION.md`](docs/DIGITAL_METER_INTEGRATION.md)
- **Live Example**: `http://localhost:5000/digital-meter-example`
- **Standalone Page**: `http://localhost:5000/digital-meter-hybrid`
- **Hybrid Dashboard**: `http://localhost:5000/hybrid-dashboard`

## 🔄 Integration Flow

```
1. User selects meter from dropdown
   ↓
2. Module fetches initial data via API
   ↓
3. Module subscribes to WebSocket updates
   ↓
4. Real-time updates displayed automatically
   ↓
5. User can refresh or change meter anytime
```

## ✅ Benefits

1. **No Build Process**: Works with React via CDN
2. **Flexible Integration**: Use standalone or embedded
3. **Real-time Updates**: WebSocket integration
4. **Self-contained**: All styles included
5. **Easy to Use**: Simple API
6. **Customizable**: Colors and styles
7. **Production Ready**: Error handling and cleanup

## 🎯 Next Steps

1. **Test the standalone page**: Visit `/digital-meter-hybrid`
2. **Review the example**: Visit `/digital-meter-example`
3. **Read the docs**: Check [`DIGITAL_METER_INTEGRATION.md`](docs/DIGITAL_METER_INTEGRATION.md)
4. **Integrate into your app**: Use the module in your pages
5. **Customize**: Adjust colors and styles to match your theme

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review browser console for errors
3. Verify backend API is running
4. Check WebSocket connection status

---

**Created**: November 22, 2024  
**Version**: 1.0.0  
**Status**: Production Ready ✅
