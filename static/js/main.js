class SmartMeterApp {
    constructor() {
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.selectedMeter = null;
        this.charts = {};
        this.currentTheme = localStorage.getItem('theme') || 'light';

        this.initializeTheme();
        this.initializeCharts();
        this.setupEventListeners();
        this.loadMeters();
        this.setupWebSocketListeners();
    }

    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }

        // Update charts theme
        Object.values(this.charts).forEach(chart => {
            this.updateChartTheme(chart);
        });
    }

    updateChartTheme(chart) {
        const isDark = this.currentTheme === 'dark';
        const textColor = isDark ? '#e0e0e0' : '#333';
        const gridColor = isDark ? '#444' : '#e5e5e5';

        if (chart.options.scales.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
        }
        if (chart.options.scales.y) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }
        if (chart.options.scales.y1) {
            chart.options.scales.y1.ticks.color = textColor;
            chart.options.scales.y1.grid.color = gridColor;
        }
        chart.update('none');
    }

    setupWebSocketListeners() {
        document.addEventListener('ws-connected', () => {
            const indicator = document.querySelector('.status-indicator');
            indicator.className = 'status-indicator status-online';
            indicator.innerHTML = '<span class="pulse">●</span><span>System Online</span>';
        });

        document.addEventListener('ws-disconnected', () => {
            const indicator = document.querySelector('.status-indicator');
            indicator.className = 'status-indicator status-offline';
            indicator.innerHTML = '<span>●</span><span>System Offline</span>';
        });

        document.addEventListener('meter-update', (e) => {
            const data = e.detail;
            if (this.selectedMeter && data.meter_id === this.selectedMeter) {
                this.updateDashboard(data);
            }
        });
    }

    async loadMeters() {
        try {
            const meters = await apiService.getMeters();
            const select = document.getElementById('meterSelect');
            select.innerHTML = '<option value="">Choose a meter...</option>';

            meters.forEach(meter => {
                const option = document.createElement('option');
                option.value = meter.id;
                option.textContent = `${meter.id} - ${meter.name}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load meters', error);
            // Fallback for demo if API fails
            this.addDemoMeters();
        }
    }

    addDemoMeters() {
        const select = document.getElementById('meterSelect');
        const demoMeters = [
            { id: 'METER-001', name: 'Industrial Plant A' },
            { id: 'METER-002', name: 'Commercial Building B' }
        ];
        demoMeters.forEach(meter => {
            const option = document.createElement('option');
            option.value = meter.id;
            option.textContent = `${meter.id} - ${meter.name}`;
            select.appendChild(option);
        });
    }

    initializeCharts() {
        // Power Quality Trends Chart
        const powerQualityCtx = document.getElementById('powerQualityChart').getContext('2d');
        this.charts.powerQuality = new Chart(powerQualityCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Voltage (V)',
                        data: [],
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Current (A)',
                        data: [],
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Power Factor',
                        data: [],
                        borderColor: '#27ae60',
                        backgroundColor: 'rgba(39, 174, 96, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: 'Time' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Voltage/Current' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Power Factor' },
                        grid: { drawOnChartArea: false },
                        min: 0.8,
                        max: 1.0
                    }
                }
            }
        });

        // Health Distribution Chart
        const healthCtx = document.getElementById('healthDistributionChart').getContext('2d');
        this.charts.healthDistribution = new Chart(healthCtx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent', 'Good', 'Warning', 'Critical'],
                datasets: [{
                    data: [65, 20, 10, 5],
                    backgroundColor: ['#27ae60', '#f39c12', '#e67e22', '#e74c3c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Apply initial theme
        Object.values(this.charts).forEach(chart => this.updateChartTheme(chart));
    }

    setupEventListeners() {
        document.getElementById('connectBtn').addEventListener('click', () => this.connectToMeter());
        document.getElementById('startMonitoringBtn').addEventListener('click', () => this.startMonitoring());
        document.getElementById('stopMonitoringBtn').addEventListener('click', () => this.stopMonitoring());
        document.getElementById('refreshDataBtn').addEventListener('click', () => this.refreshData());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        document.getElementById('meterSelect').addEventListener('change', (e) => {
            if (this.selectedMeter) {
                apiService.unsubscribeFromMeter(this.selectedMeter);
            }
            this.selectedMeter = e.target.value;
            if (this.selectedMeter) {
                this.loadMeterData(this.selectedMeter);
            }
        });

        document.getElementById('samplingRate').addEventListener('input', (e) => {
            document.getElementById('samplingValue').textContent = e.target.value + 'ms';
            if (this.isMonitoring) {
                this.stopMonitoring();
                this.startMonitoring();
            }
        });
    }

    async loadMeterData(meterId) {
        try {
            const data = await apiService.getMeterHealth(meterId);
            this.updateDashboard(data);
            apiService.subscribeToMeter(meterId);
        } catch (error) {
            console.error('Error loading meter data:', error);
        }
    }

    async connectToMeter() {
        if (!this.selectedMeter) {
            alert('Please select a smart meter first!');
            return;
        }

        try {
            const btn = document.getElementById('connectBtn');
            btn.textContent = 'Connecting...';

            // Simulate connection delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            btn.textContent = '🔌 Connected';
            btn.classList.add('active');
            apiService.subscribeToMeter(this.selectedMeter);

        } catch (error) {
            console.error('Connection failed:', error);
            alert('Connection failed. Please try again.');
        }
    }

    startMonitoring() {
        if (!this.selectedMeter) {
            alert('Please select a smart meter first!');
            return;
        }

        this.isMonitoring = true;
        const samplingRate = parseInt(document.getElementById('samplingRate').value);

        document.getElementById('startMonitoringBtn').disabled = true;
        document.getElementById('stopMonitoringBtn').disabled = false;

        // Start generating and sending data
        this.monitoringInterval = setInterval(async () => {
            await this.generateAndSendData();
        }, samplingRate);
    }

    stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        document.getElementById('startMonitoringBtn').disabled = false;
        document.getElementById('stopMonitoringBtn').disabled = true;
    }

    async refreshData() {
        if (this.selectedMeter) {
            await this.loadMeterData(this.selectedMeter);
        }
    }

    async generateAndSendData() {
        // Generate simulated sensor data to send to the backend
        const data = this.generateSensorData();
        try {
            await apiService.sendMeterData(this.selectedMeter, data);
            // The UI will be updated via WebSocket event 'meter-update'
        } catch (error) {
            console.error('Error sending meter data:', error);
        }
    }

    generateSensorData() {
        // Simulate realistic smart meter data generation (Sensor Node)
        const voltage = 240 + (Math.random() - 0.5) * 4;
        const current = 4.17 * (2 + Math.random() * 3) + (Math.random() - 0.5) * 0.5;
        const powerFactor = 0.95 + (Math.random() - 0.5) * 0.1;

        return {
            voltage_rms: voltage,
            current_rms: current,
            power_active: voltage * current * powerFactor,
            power_factor: powerFactor,
            frequency: 50 + (Math.random() - 0.5) * 0.2,
            thdv: Math.random() < 0.1 ? Math.random() * 3 + 5 : Math.random() * 2 + 1,
            temperature: 25 + Math.random() * 20 + (Math.random() < 0.1 ? 10 : 0),
            contact_resistance: Math.random() * 0.1 + 0.01,
            switching_cycles: Math.floor(Math.random() * 50000) + 10000
        };
    }

    updateDashboard(data) {
        // Handle both direct REST response and WebSocket structure
        const healthAnalysis = data.health_analysis || data;
        const reading = data.latest_reading || data.reading || {};

        this.updateHealthDisplay(healthAnalysis, reading);
        this.updateCharts(reading, healthAnalysis);
        this.updateAgentStatus(healthAnalysis.agent_results);
        this.updateAlerts(healthAnalysis.risk_assessment, healthAnalysis.recommendations);
        this.updateTimeline(healthAnalysis.failure_timeline);
        this.updateRecommendations(healthAnalysis.recommendations);
    }

    updateHealthDisplay(analysis, reading) {
        const healthScore = analysis.overall_health_score || 0;

        // Update circle
        const circle = document.getElementById('healthScoreCircle');
        const value = document.getElementById('healthScoreValue');
        const angle = (healthScore / 100) * 360;

        circle.style.setProperty('--score-angle', `${angle}deg`);
        value.textContent = `${healthScore}%`;

        // Update color
        let color = '#e74c3c'; // Critical
        let className = 'score-critical';
        if (healthScore >= 80) { color = '#27ae60'; className = 'score-excellent'; }
        else if (healthScore >= 60) { color = '#f39c12'; className = 'score-good'; }
        else if (healthScore >= 40) { color = '#e67e22'; className = 'score-warning'; }

        circle.style.setProperty('--health-color', color);
        value.className = `score-value ${className}`;

        // Update metrics
        document.getElementById('failureProbability').textContent = `${analysis.failure_probability?.toFixed(1) || 0}%`;
        // Assuming operating_hours might be in reading or analysis depending on API
        // For now using a placeholder or value from reading if available
        const opHours = reading.switching_cycles ? Math.floor(reading.switching_cycles / 2) : 0; // Rough estimate if not provided
        document.getElementById('operatingHours').textContent = opHours.toLocaleString();

        // Next maintenance
        const daysToService = analysis.predictions?.maintenance_schedule?.scheduled[0]?.estimated_duration || 'N/A';
        // Parse days if possible or just show count
        document.getElementById('nextMaintenance').textContent = 'Check Schedule';
    }

    updateCharts(reading, analysis) {
        if (!reading.timestamp) return;

        const timeLabel = new Date(reading.timestamp).toLocaleTimeString();

        // Power Quality Chart
        const chart = this.charts.powerQuality;
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(reading.voltage_rms);
        chart.data.datasets[1].data.push(reading.current_rms);
        chart.data.datasets[2].data.push(reading.power_factor);

        if (chart.data.labels.length > 20) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(d => d.data.shift());
        }
        chart.update('none');

        // Health Distribution (Static for now, or could be aggregated from multiple meters)
        // this.charts.healthDistribution.update();
    }

    updateAgentStatus(agentResults) {
        if (!agentResults) return;

        const grid = document.getElementById('agentsStatus').querySelector('.agent-status-grid');
        if (!grid) return;

        // Map agent keys to display names
        const agentNames = {
            'condition_monitor': 'Condition Monitor',
            'power_quality': 'Power Quality',
            'relay_health': 'Relay Health',
            'environmental': 'Environmental'
        };

        grid.innerHTML = ''; // Clear existing

        Object.entries(agentResults).forEach(([key, result]) => {
            const name = agentNames[key] || key;
            const score = result.health_score || 0;
            let status = 'Healthy';
            let statusClass = 'status-healthy';

            if (score < 60) { status = 'Critical'; statusClass = 'status-critical'; }
            else if (score < 80) { status = 'Warning'; statusClass = 'status-warning'; }

            const card = document.createElement('div');
            card.className = 'agent-card';
            card.style.setProperty('--agent-status-color', score >= 80 ? '#27ae60' : score >= 60 ? '#f39c12' : '#e74c3c');

            card.innerHTML = `
                <div class="agent-header">
                    <span class="agent-name">${name}</span>
                    <span class="agent-status ${statusClass}">${status}</span>
                </div>
                <div class="metrics-row">
                    <div class="metric">
                        <div class="metric-value">${score}%</div>
                        <div class="metric-label">Health</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value">${result.confidence || 90}%</div>
                        <div class="metric-label">Confidence</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    updateAlerts(risk, recommendations) {
        const container = document.getElementById('alertsContainer');
        // Clear if we have new data, or append? For now, simple refresh
        // In a real app, we'd append and scroll

        // This is a simplified view. Ideally we fetch alerts from /api/alerts
        // But we can show immediate risks from the analysis

        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<p style="color: var(--subtext-color); text-align: center;">No active alerts</p>';
            return;
        }

        container.innerHTML = recommendations.map(rec => {
            const isObj = typeof rec === 'object';
            const title = isObj ? (rec.action || 'Alert') : rec;
            const severity = isObj ? (rec.priority || 'medium') : 'medium';
            let color = '#3498db';
            if (severity === 'urgent' || severity === 'critical') color = '#e74c3c';
            else if (severity === 'high') color = '#f39c12';

            return `
                <div class="alert-item" style="--alert-color: ${color};">
                    <div class="alert-icon">⚠️</div>
                    <div class="alert-content">
                        <div class="alert-header">
                            <span class="alert-title">${title}</span>
                            <span class="alert-time">Just now</span>
                        </div>
                        <div class="alert-message">Priority: ${severity}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateTimeline(timeline) {
        const container = document.getElementById('predictionTimeline');
        if (!timeline || timeline.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--subtext-color)">No predictions available</p>';
            return;
        }

        container.innerHTML = timeline.map(item => {
            let color = '#27ae60';
            if (item.severity === 'high' || item.severity === 'critical') color = '#e74c3c';
            else if (item.severity === 'medium') color = '#f39c12';

            return `
                <div class="timeline-item" style="--timeline-color: ${color};">
                    <div class="timeline-date">${item.estimated_time} Days</div>
                    <div class="timeline-event">${item.event}</div>
                    <div class="timeline-risk">${item.severity}</div>
                </div>
            `;
        }).join('');
    }

    updateRecommendations(recommendations) {
        const list = document.getElementById('recommendationsList');
        if (!recommendations || recommendations.length === 0) {
            list.innerHTML = '<li>No recommendations</li>';
            return;
        }

        list.innerHTML = recommendations.map(rec => {
            const isObj = typeof rec === 'object';
            const text = isObj ? rec.action : rec;
            const priority = isObj ? rec.priority : 'normal';
            const isUrgent = priority === 'urgent' || priority === 'high';

            return `
                <li class="recommendation-item ${isUrgent ? 'urgent' : ''}">
                    <div class="recommendation-icon">${isUrgent ? '⚡' : '🔧'}</div>
                    <div class="recommendation-text">
                        <strong>${priority.toUpperCase()}:</strong> ${text}
                    </div>
                </li>
            `;
        }).join('');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SmartMeterApp();
});
