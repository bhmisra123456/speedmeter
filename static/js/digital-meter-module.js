/**
 * Digital Meter Module - Hybrid React/Vanilla JS Integration
 * This module provides a digital meter display that can be embedded in vanilla JS applications
 */

(function(window) {
    'use strict';

    // Digital Meter Module
    const DigitalMeterModule = {
        // Configuration
        config: {
            apiBaseUrl: '/api',
            wsUrl: 'http://localhost:5000',
            updateInterval: 2000,
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
        },

        // State
        state: {
            selectedMeter: null,
            currentReading: null,
            socket: null,
            isConnected: false
        },

        // Initialize the module
        init: function(containerId, options = {}) {
            this.config = { ...this.config, ...options };
            this.container = document.getElementById(containerId);
            
            if (!this.container) {
                console.error('Digital Meter container not found:', containerId);
                return;
            }

            this.render();
            this.initWebSocket();
        },

        // Render the digital meter display
        render: function() {
            this.container.innerHTML = `
                <div class="digital-meter-wrapper">
                    <div class="digital-meter-header">
                        <h3>⚡ Digital Meter Display</h3>
                        <div class="connection-status" id="dm-connection-status">
                            <span class="status-dot offline"></span>
                            <span>Disconnected</span>
                        </div>
                    </div>
                    
                    <div class="digital-meter-content" id="dm-content">
                        <div class="dm-loading">
                            <div class="pulse-animation">⚡</div>
                            <p>Select a meter to view digital display</p>
                        </div>
                    </div>
                </div>
            `;

            this.injectStyles();
        },

        // Inject required styles
        injectStyles: function() {
            if (document.getElementById('digital-meter-styles')) return;

            const styles = `
                <style id="digital-meter-styles">
                    .digital-meter-wrapper {
                        background: rgba(20, 25, 45, 0.95);
                        border-radius: 15px;
                        padding: 1.5rem;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    }

                    .digital-meter-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 1.5rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .digital-meter-header h3 {
                        margin: 0;
                        color: #ecf0f1;
                        font-size: 1.3rem;
                    }

                    .connection-status {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.5rem 1rem;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 20px;
                        font-size: 0.85rem;
                    }

                    .status-dot {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        box-shadow: 0 0 8px currentColor;
                    }

                    .status-dot.online {
                        background: #00ff00;
                        color: #00ff00;
                    }

                    .status-dot.offline {
                        background: #ff0000;
                        color: #ff0000;
                    }

                    .dm-loading {
                        text-align: center;
                        padding: 3rem;
                        color: #bdc3c7;
                    }

                    .pulse-animation {
                        font-size: 3rem;
                        animation: pulse 2s ease-in-out infinite;
                    }

                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.1); }
                    }

                    .dm-meter-info {
                        display: flex;
                        gap: 0.75rem;
                        flex-wrap: wrap;
                        margin-bottom: 1.5rem;
                    }

                    .dm-chip {
                        padding: 0.4rem 0.9rem;
                        background: rgba(52, 152, 219, 0.2);
                        border: 1px solid #3498db;
                        border-radius: 15px;
                        font-size: 0.8rem;
                        color: #3498db;
                    }

                    .dm-chip.active {
                        background: rgba(39, 174, 96, 0.2);
                        border-color: #27ae60;
                        color: #27ae60;
                    }

                    .dm-display-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        gap: 1rem;
                        margin-bottom: 1.5rem;
                    }

                    .dm-display {
                        background: rgba(0, 0, 0, 0.8);
                        border: 2px solid;
                        border-radius: 10px;
                        padding: 1.2rem;
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                    }

                    .dm-display::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
                        pointer-events: none;
                    }

                    .dm-value {
                        font-size: 2rem;
                        font-weight: bold;
                        font-family: 'Courier New', monospace;
                        text-shadow: 0 0 10px currentColor;
                        position: relative;
                        z-index: 1;
                    }

                    .dm-unit {
                        font-size: 0.8rem;
                        font-family: 'Courier New', monospace;
                        text-shadow: 0 0 5px currentColor;
                        margin-top: 0.25rem;
                    }

                    .dm-label {
                        font-size: 0.7rem;
                        color: #999;
                        margin-top: 0.5rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .dm-status-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                        gap: 1rem;
                        margin-top: 1.5rem;
                    }

                    .dm-status-card {
                        background: rgba(0, 0, 0, 0.5);
                        border: 1px solid #333;
                        border-radius: 10px;
                        padding: 1.2rem;
                        text-align: center;
                    }

                    .dm-status-icon {
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                    }

                    .dm-status-title {
                        font-size: 1rem;
                        font-weight: 600;
                        margin-bottom: 0.6rem;
                    }

                    .dm-led-indicator {
                        display: inline-flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.4rem 0.8rem;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 15px;
                    }

                    .dm-led-dot {
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        box-shadow: 0 0 8px currentColor;
                    }

                    .dm-led-text {
                        font-size: 0.8rem;
                        color: #ccc;
                    }

                    .dm-timestamp {
                        text-align: center;
                        margin-top: 1.5rem;
                        padding-top: 1rem;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        color: #666;
                        font-size: 0.8rem;
                    }

                    .dm-error {
                        background: rgba(231, 76, 60, 0.2);
                        border: 1px solid #e74c3c;
                        color: #e74c3c;
                        padding: 1rem;
                        border-radius: 10px;
                        margin: 1rem 0;
                    }
                </style>
            `;

            document.head.insertAdjacentHTML('beforeend', styles);
        },

        // Initialize WebSocket connection
        initWebSocket: function() {
            if (typeof io === 'undefined') {
                console.error('Socket.IO not loaded');
                return;
            }

            this.state.socket = io(this.config.wsUrl, {
                transports: ['websocket', 'polling']
            });

            this.state.socket.on('connect', () => {
                console.log('Digital Meter WebSocket connected');
                this.state.isConnected = true;
                this.updateConnectionStatus(true);
            });

            this.state.socket.on('disconnect', () => {
                console.log('Digital Meter WebSocket disconnected');
                this.state.isConnected = false;
                this.updateConnectionStatus(false);
            });

            this.state.socket.on('meter_reading', (data) => {
                if (this.state.selectedMeter && data.meter_id === this.state.selectedMeter.id) {
                    this.state.currentReading = data.reading;
                    this.updateDisplay();
                }
            });
        },

        // Update connection status indicator
        updateConnectionStatus: function(isConnected) {
            const statusEl = document.getElementById('dm-connection-status');
            if (!statusEl) return;

            const dot = statusEl.querySelector('.status-dot');
            const text = statusEl.querySelector('span:last-child');

            if (isConnected) {
                dot.classList.remove('offline');
                dot.classList.add('online');
                text.textContent = 'Connected';
            } else {
                dot.classList.remove('online');
                dot.classList.add('offline');
                text.textContent = 'Disconnected';
            }
        },

        // Set selected meter
        setMeter: function(meter) {
            this.state.selectedMeter = meter;
            
            if (this.state.socket && meter) {
                this.state.socket.emit('subscribe_meter', { meter_id: meter.id });
                this.fetchMeterData(meter.id);
            }
        },

        // Fetch meter data from API
        fetchMeterData: async function(meterId) {
            try {
                const response = await axios.get(`${this.config.apiBaseUrl}/meters/${meterId}/readings?limit=1`);
                if (response.data && response.data.length > 0) {
                    this.state.currentReading = response.data[0];
                    this.updateDisplay();
                }
            } catch (error) {
                console.error('Failed to fetch meter data:', error);
                this.showError('Failed to load meter data');
            }
        },

        // Update the display with current data
        updateDisplay: function() {
            const content = document.getElementById('dm-content');
            if (!content) return;

            const meter = this.state.selectedMeter;
            const reading = this.state.currentReading;

            if (!meter || !reading) {
                content.innerHTML = `
                    <div class="dm-loading">
                        <div class="pulse-animation">⚡</div>
                        <p>No data available</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <!-- Meter Info -->
                <div class="dm-meter-info">
                    <div class="dm-chip active">${meter.name} (${meter.id})</div>
                    <div class="dm-chip">${meter.meter_type}</div>
                    <div class="dm-chip">${meter.location}</div>
                    <div class="dm-chip active">${meter.status}</div>
                </div>

                <!-- Primary Measurements -->
                <div class="dm-display-grid">
                    ${this.createDisplay(reading.voltage_rms?.toFixed(1), 'V', 'Voltage RMS', this.config.colors.voltage)}
                    ${this.createDisplay(reading.current_rms?.toFixed(2), 'A', 'Current RMS', this.config.colors.current)}
                    ${this.createDisplay(reading.power_active?.toFixed(1), 'kW', 'Active Power', this.config.colors.power)}
                    ${this.createDisplay(reading.frequency?.toFixed(1), 'Hz', 'Frequency', this.config.colors.frequency)}
                </div>

                <!-- Secondary Measurements -->
                <div class="dm-display-grid">
                    ${this.createDisplay(reading.power_factor?.toFixed(3), '', 'Power Factor', this.config.colors.powerFactor)}
                    ${this.createDisplay(reading.power_reactive?.toFixed(1), 'kVAR', 'Reactive Power', this.config.colors.reactive)}
                    ${this.createDisplay(reading.temperature?.toFixed(1), '°C', 'Temperature', this.config.colors.temperature)}
                    ${this.createDisplay(reading.thdv?.toFixed(2), '%', 'THD Voltage', this.config.colors.thd)}
                </div>

                <!-- Status Indicators -->
                <div class="dm-status-grid">
                    ${this.createStatusCard('⚡', 'Power Quality', 
                        this.getHealthStatus(reading.thdv || 0, { good: 5, warning: 8 }),
                        `THD: ${reading.thdv?.toFixed(2) || '--'}%`, '#ffff00')}
                    ${this.createStatusCard('🔌', 'Load Status',
                        this.getHealthStatus(reading.power_active || 0, { good: 50, warning: 80 }),
                        `Load: ${((reading.power_active || 0) / 100 * 100).toFixed(0)}%`, '#00ff00')}
                    ${this.createStatusCard('🌡️', 'Thermal',
                        this.getHealthStatus(reading.temperature || 0, { good: 40, warning: 60 }),
                        `Temp: ${reading.temperature?.toFixed(1) || '--'}°C`, '#ff4444')}
                    ${this.createStatusCard('📊', 'Frequency',
                        Math.abs((reading.frequency || 50) - 50) < 0.5 ? 'good' : 
                        Math.abs((reading.frequency || 50) - 50) < 1 ? 'warning' : 'critical',
                        `Freq: ${reading.frequency?.toFixed(1) || '--'} Hz`, '#ff00ff')}
                </div>

                <!-- Timestamp -->
                <div class="dm-timestamp">
                    Last Updated: ${new Date(reading.timestamp).toLocaleString()}
                </div>
            `;
        },

        // Create a digital display element
        createDisplay: function(value, unit, label, color) {
            return `
                <div class="dm-display" style="border-color: ${color}; color: ${color};">
                    <div class="dm-value">${value !== null && value !== undefined ? value : '--'}</div>
                    <div class="dm-unit">${unit}</div>
                    <div class="dm-label">${label}</div>
                </div>
            `;
        },

        // Create a status card element
        createStatusCard: function(icon, title, status, label, color) {
            const statusColor = status === 'good' ? '#00ff00' : 
                              status === 'warning' ? '#ff8800' : '#ff0000';
            
            return `
                <div class="dm-status-card">
                    <div class="dm-status-icon" style="color: ${color};">${icon}</div>
                    <div class="dm-status-title" style="color: ${color};">${title}</div>
                    <div class="dm-led-indicator">
                        <div class="dm-led-dot" style="background-color: ${statusColor}; color: ${statusColor};"></div>
                        <span class="dm-led-text">${label}</span>
                    </div>
                </div>
            `;
        },

        // Get health status based on thresholds
        getHealthStatus: function(value, thresholds) {
            if (value < thresholds.good) return 'good';
            if (value < thresholds.warning) return 'warning';
            return 'critical';
        },

        // Show error message
        showError: function(message) {
            const content = document.getElementById('dm-content');
            if (!content) return;

            content.innerHTML = `
                <div class="dm-error">
                    <strong>Error:</strong> ${message}
                </div>
            `;
        },

        // Cleanup
        destroy: function() {
            if (this.state.socket) {
                this.state.socket.disconnect();
            }
            if (this.container) {
                this.container.innerHTML = '';
            }
        }
    };

    // Export to window
    window.DigitalMeterModule = DigitalMeterModule;

})(window);
