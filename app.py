import os
import json
import numpy as np
from datetime import datetime, timedelta, timezone
from functools import wraps
import asyncio
from threading import Thread
import time
import random
from collections import deque
import logging

# Flask and extensions
from flask import Flask, jsonify, request, render_template, send_from_directory, redirect
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

# Machine learning and analytics
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import torch
import torch.nn as nn
from scipy.fft import fft, ifft
from scipy.stats import weibull_min

# Real-time data processing
import redis
import celery
from celery import Celery
import websockets

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import agentic AI system
try:
    from app.agentic_ai_system import agentic_ai
    AGENTIC_AI_AVAILABLE = True
    logger.info("Agentic AI System imported successfully")
except ImportError as e:
    logger.warning(f"Agentic AI System not available: {e}")
    AGENTIC_AI_AVAILABLE = False

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///smart_meters.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-key'

# Initialize extensions
db = SQLAlchemy(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Database Models
class SmartMeter(db.Model):
    __tablename__ = 'smart_meters'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200))
    meter_type = db.Column(db.String(50))
    installation_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_maintenance = db.Column(db.DateTime)
    next_maintenance = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='active')
    
    # Relationships
    readings = db.relationship('MeterReading', backref='smart_meter', lazy='dynamic', cascade='all, delete-orphan')
    health_records = db.relationship('HealthRecord', backref='smart_meter', lazy='dynamic', cascade='all, delete-orphan')
    alerts = db.relationship('Alert', backref='smart_meter', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'meter_type': self.meter_type,
            'installation_date': self.installation_date.isoformat() if self.installation_date else None,
            'last_maintenance': self.last_maintenance.isoformat() if self.last_maintenance else None,
            'next_maintenance': self.next_maintenance.isoformat() if self.next_maintenance else None,
            'status': self.status
        }

class MeterReading(db.Model):
    __tablename__ = 'meter_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    meter_id = db.Column(db.String(50), db.ForeignKey('smart_meters.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Electrical measurements
    voltage_rms = db.Column(db.Float)
    current_rms = db.Column(db.Float)
    power_active = db.Column(db.Float)
    power_reactive = db.Column(db.Float)
    power_factor = db.Column(db.Float)
    frequency = db.Column(db.Float)
    
    # Power quality
    thdv = db.Column(db.Float)  # Total Harmonic Distortion Voltage
    thdi = db.Column(db.Float)  # Total Harmonic Distortion Current
    harmonic_list = db.Column(db.Text)  # JSON string of harmonic content
    
    # Equipment health
    temperature = db.Column(db.Float)
    contact_resistance = db.Column(db.Float)
    switching_cycles = db.Column(db.Integer)
    
    # Raw data storage for advanced analytics
    voltage_waveform = db.Column(db.Text)  # JSON array
    current_waveform = db.Column(db.Text)  # JSON array
    
    def to_dict(self):
        return {
            'id': self.id,
            'meter_id': self.meter_id,
            'timestamp': self.timestamp.isoformat(),
            'voltage_rms': self.voltage_rms,
            'current_rms': self.current_rms,
            'power_active': self.power_active,
            'power_reactive': self.power_reactive,
            'power_factor': self.power_factor,
            'frequency': self.frequency,
            'thdv': self.thdv,
            'thdi': self.thdi,
            'harmonic_list': json.loads(self.harmonic_list) if self.harmonic_list else None,
            'temperature': self.temperature,
            'contact_resistance': self.contact_resistance,
            'switching_cycles': self.switching_cycles
        }

class HealthRecord(db.Model):
    __tablename__ = 'health_records'
    
    id = db.Column(db.Integer, primary_key=True)
    meter_id = db.Column(db.String(50), db.ForeignKey('smart_meters.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Overall health score
    overall_health_score = db.Column(db.Float)
    
    # Agent-specific scores
    condition_monitor_score = db.Column(db.Float)
    power_quality_score = db.Column(db.Float)
    relay_health_score = db.Column(db.Float)
    environmental_score = db.Column(db.Float)
    
    # Anomaly detection
    anomaly_count = db.Column(db.Integer, default=0)
    anomaly_details = db.Column(db.Text)  # JSON string
    
    # Failure prediction
    failure_probability = db.Column(db.Float)
    failure_timeline = db.Column(db.Text)  # JSON string
    risk_level = db.Column(db.String(20))
    
    # Recommendations
    recommendations = db.Column(db.Text)  # JSON string
    
    def to_dict(self):
        return {
            'id': self.id,
            'meter_id': self.meter_id,
            'timestamp': self.timestamp.isoformat(),
            'overall_health_score': self.overall_health_score,
            'condition_monitor_score': self.condition_monitor_score,
            'power_quality_score': self.power_quality_score,
            'relay_health_score': self.relay_health_score,
            'environmental_score': self.environmental_score,
            'anomaly_count': self.anomaly_count,
            'anomaly_details': json.loads(self.anomaly_details) if self.anomaly_details else None,
            'failure_probability': self.failure_probability,
            'failure_timeline': json.loads(self.failure_timeline) if self.failure_timeline else None,
            'risk_level': self.risk_level,
            'recommendations': json.loads(self.recommendations) if self.recommendations else None
        }

class Alert(db.Model):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    meter_id = db.Column(db.String(50), db.ForeignKey('smart_meters.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    alert_type = db.Column(db.String(50))
    severity = db.Column(db.String(20))
    message = db.Column(db.Text)
    acknowledged = db.Column(db.Boolean, default=False)
    
    # Additional context
    related_metric = db.Column(db.String(50))
    threshold_value = db.Column(db.Float)
    actual_value = db.Column(db.Float)
    
    def to_dict(self):
        return {
            'id': self.id,
            'meter_id': self.meter_id,
            'timestamp': self.timestamp.isoformat(),
            'alert_type': self.alert_type,
            'severity': self.severity,
            'message': self.message,
            'acknowledged': self.acknowledged,
            'related_metric': self.related_metric,
            'threshold_value': self.threshold_value,
            'actual_value': self.actual_value
        }

# AI Agent Classes for Predictive Maintenance
class ConditionMonitoringAgent:
    """
    Monitors overall condition of smart meters using multiple ML techniques
    Based on research from MDPI Sensors journal [MDPI Sensors](https://www.mdpi.com/1424-8220/22/24/9804)
    """
    
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.weibull_params = {'shape': 1.5, 'scale': 8760}  # Based on field data
        self.scaler = StandardScaler()
        
    def analyze(self, meter_id, current_data, historical_data=None):
        """Comprehensive condition analysis using multiple ML techniques"""
        
        try:
            # Basic health score calculation
            health_score = self._calculate_basic_health_score(current_data)
            
            # Anomaly detection using Isolation Forest
            anomalies = self._detect_anomalies(current_data)
            
            # Weibull-based failure prediction
            failure_probability = self._weibull_failure_prediction(current_data)
            
            # LSTM-based trend analysis (simulated)
            degradation_trend = self._degradation_trend_analysis(current_data, historical_data)
            
            # Fault pattern detection
            fault_patterns = self._detect_fault_patterns(current_data)
            
            return {
                'health_score': health_score,
                'anomalies_detected': anomalies,
                'failure_probability': failure_probability * 100,
                'degradation_trend': degradation_trend,
                'fault_patterns': fault_patterns,
                'confidence': self._calculate_confidence(anomalies, failure_probability)
            }
            
        except Exception as e:
            logger.error(f"Error in ConditionMonitoringAgent: {e}")
            return {
                'health_score': 50,
                'anomalies_detected': [],
                'failure_probability': 50,
                'degradation_trend': 'stable',
                'fault_patterns': [],
                'confidence': 70
            }
    
    def _calculate_basic_health_score(self, data):
        """Calculate basic health score from key metrics"""
        score = 100
        
        # Temperature impact
        temp = data.get('temperature', 25)
        if temp > 70: score -= 25
        elif temp > 60: score -= 15
        elif temp > 50: score -= 10
        
        # Operating hours impact
        op_hours = data.get('operating_hours', 0)
        factor_aging = min(op_hours / 50000, 1)  # Aging factor based on 50k hours
        score -= factor_aging * 20
        
        # Voltage stability impact
        voltage = data.get('voltage_rms', 240)
        voltage_deviation = abs(voltage - 240) / 240 * 100
        if voltage_deviation > 5: score -= 10
        
        # Contact resistance impact
        contact_resistance = data.get('contact_resistance', 0.01)
        if contact_resistance > 0.1: score -= 20
        elif contact_resistance > 0.05: score -= 10
        
        return max(0, score)
    
    def _detect_anomalies(self, data):
        """Use Isolation Forest for anomaly detection"""
        features = [
            data.get('voltage_rms', 240),
            data.get('current_rms', 10),
            data.get('temperature', 25),
            data.get('power_factor', 0.95),
            data.get('thdv', 1.5),
            data.get('contact_resistance', 0.01)
        ]
        
        # Add artificial intelligence for pattern recognition
        feature_vector = np.array(features).reshape(1, -1)
        
        try:
            # Train on recent data (simplified)
            recent_data = []  # Would fetch from database
            if len(recent_data) > 10:
                self.isolation_forest.fit(recent_data)
                is_anomaly = bool(self.isolation_forest.predict(feature_vector)[0] == -1)
            else:
                # Rule-based detection for limited data
                is_anomaly = any([
                    abs(data.get('voltage_rms', 240) - 240) > 10,
                    data.get('temperature', 25) > 65,
                    data.get('thdv', 1) > 5,
                    data.get('contact_resistance', 0.01) > 0.1
                ])
            
            anomalies = []
            if is_anomaly:
                anomalies.append({
                    'type': 'isolation_forest',
                    'severity': 'warning' if random.random() > 0.5 else 'critical',
                    'value': 'deviation detected'
                })
            
            return anomalies
            
        except Exception as e:
            return []
    
    def _weibull_failure_prediction(self, data):
        """
        Weibull distribution-based failure prediction
        Based on MDPI Sensors research on smart meter failure prediction
        Reference: [MDPI Sensors](https://www.mdpi.com/1424-8220/22/24/9804)
        """
        try:
            operating_hours = data.get('operating_hours', 0)
            shape_param = self.weibull_params['shape']  # 1.5 typical for smart meters
            scale_param = self.weibull_params['scale']  # 8760 hours (1 year)
            
            # Weibull failure probability calculation
            failure_probability = 1 - np.exp(-(operating_hours/scale_param)**shape_param)
            
            # Apply corrections based on current condition
            correction_factors = self._calculate_correction_factors(data)
            adjusted_probability = min(1.0, failure_probability * correction_factors['combined'])
            
            return adjusted_probability
            
        except Exception as e:
            logger.error(f"Error in Weibull calculation: {e}")
            return 0.1
    
    def _calculate_correction_factors(self, data):
        """Calculate correction factors for Weibull probability"""
        factors = {
            'temperature': max(1.5, data.get('temperature', 25) / 40),
            'load': max(1.0, data.get('power_active', 1000) / 1000),  # Relative to 1kW
            'quality': max(1.0, data.get('thdv', 1) / 3),  # Voltage quality factor
            'maintenance': 1.0  # Would integrate maintenance history
        }
        
        # Calculate geometric mean of factors
        combined_factor = np.prod(list(factors.values())) ** (1/len(factors))
        
        return {
            'factors': factors,
            'combined': combined_factor
        }
    
    def _degradation_trend_analysis(self, current_data, historical_data=None):
        """Analyze degradation trends using LSTM (simulation)"""
        # Simulate LSTM-based trend analysis
        trend_indicators = {
            'temperature_trend': 'stable' if current_data.get('temperature', 25) < 45 else 'increasing',
            'voltage_stability': 'stable' if abs(current_data.get('voltage_rms', 240) - 240) < 5 else 'variable',
            'current_stability': 'stable' if current_data.get('current_rms', 10) < 15 else 'increasing',
            'power_factor_trend': 'stable' if current_data.get('power_factor', 0.95) > 0.9 else 'deteriorating'
        }
        
        overall_trend = 'stable'
        if list(trend_indicators.values()).count('increasing') >= 2:
            overall_trend = 'deteriorating'
        
        return {
            'overall_trend': overall_trend,
            'indicators': trend_indicators,
            'confidence': 85
        }
    
    def _detect_fault_patterns(self, data):
        """Detect specific fault patterns based on electrical signatures"""
        patterns = []
        
        # Pattern 1: Loose connections
        if data.get('contact_resistance', 0.01) > 0.08:
            patterns.append({
                'type': 'loose_connection',
                'severity': 'warning',
                'recommendation': 'Check terminal screws and connections'
            })
        
        # Pattern 2: Harmonic distortion
        if data.get('thdv', 1) > 5:
            patterns.append({
                'type': 'harmonic_distortion',
                'severity': 'warning',
                'recommendation': 'Install harmonic filter'
            })
        
        # Pattern 3: High current draw
        if data.get('current_rms', 10) > 20:
            patterns.append({
                'type': 'overcurrent',
                'severity': 'critical',
                'recommendation': 'Check for overload conditions'
            })
        
        return patterns
    
    def _calculate_confidence(self, anomalies, failure_probability):
        """Calculate confidence level of analysis"""
        anomaly_penalty = min(20, len(anomalies) * 5)
        probability_confidence = max(50, 100 - abs(failure_probability - 0.5) * 200)
        
        return max(50, probability_confidence - anomaly_penalty)

class PowerQualityAgent:
    """
    Monitors power quality parameters including harmonics, surges, and power factor
    Based on IEEE 519 power quality standards
    """
    
    def __init__(self):
        self.harmonic_limits = {
            'thdv_limit': 5.0,  # IEEE 519 limit for THD-V
            'thdi_limit': 8.0,  # IEEE 519 limit for THD-I
            'individual_harmonic_limit': 3.0
        }
        
    def analyze(self, meter_id, data, historical_data=None):
        """Comprehensive power quality analysis"""
        
        try:
            # FFT-based harmonic analysis
            harmonics = self._analyze_harmonics(data)
            
            # Voltage stability analysis
            voltage_stability = self._analyze_voltage_stability(data)
            
            # Power factor analysis
            power_factor_analysis = self._analyze_power_factor(data)
            
            # Surge detection
            surge_analysis = self._detect_surges(data)
            
            # Overall power quality score
            quality_score = self._calculate_power_quality_score(data, harmonics, voltage_stability)
            
            return {
                'health_score': quality_score,
                'harmonics': harmonics,
                'voltage_stability': voltage_stability,
                'power_factor': power_factor_analysis,
                'surge_analysis': surge_analysis,
                'compliance': {
                    'ieee_519': bool(harmonics['thdv'] <= 5.0),
                    'voltage_regulation': bool(voltage_stability['deviation'] < 5.0)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in PowerQualityAgent: {e}")
            return {
                'health_score': 50,
                'harmonics': {'thdv': 0, 'thdi': 0, 'dominant_harmonics': []},
                'voltage_stability': {'deviation': 0, 'stability': 'unknown'},
                'power_factor': {'current': 0.95, 'trend': 'unknown'},
                'surge_analysis': {'surge_detected': False, 'count': 0},
                'compliance': {'ieee_519': True, 'voltage_regulation': True}
            }
    
    def _analyze_harmonics(self, data):
        """Analyze harmonic content using FFT"""
        # Simulate voltage waveform for FFT analysis
        voltage_waveform = self._generate_voltage_waveform(data)
        if len(voltage_waveform) < 128:
            return {
                'thdv': 0,
                'thdi': 0,
                'dominant_harmonics': [],
                'compliance': 'unknown',
                'severity': 'normal'
            }
        
        # FFT implementation
        fft_result = fft(voltage_waveform)
        magnitudes = np.abs(fft_result)[:50]  # First 50 harmonics
        
        # Calculate harmonic content
        fundamental = float(magnitudes[1]) if len(magnitudes) > 1 else float(max(magnitudes))
        harmonic_sum = float(np.sum(magnitudes[2:21]))  # 2nd to 20th harmonic
        thdv = (harmonic_sum / fundamental) * 100 if fundamental > 0 else 0
        
        # Find dominant harmonics
        dominant_harmonics = []
        for i in range(2, min(21, len(magnitudes))):
            harmonic_percentage = float((magnitudes[i] / fundamental) * 100)
            if harmonic_percentage > 1.0:  # More than 1% of fundamental
                dominant_harmonics.append({
                    'harmonic': i,
                    'magnitude': round(harmonic_percentage, 2),
                    'severity': 'high' if harmonic_percentage > 3 else 'medium' if harmonic_percentage > 1 else 'low'
                })
        
        return {
            'thdv': round(thdv, 2),
            'thdi': round(thdv * 1.2, 2),  # Estimated based on typical ratios
            'dominant_harmonics': dominant_harmonics,
            'compliance': 'IEEE 519 Compliant' if thdv <= 5.0 else 'Exceeds IEEE 519',
            'severity': 'critical' if thdv > 7 else 'warning' if thdv > 3 else 'normal'
        }
    
    def _generate_voltage_waveform(self, data):
        """Generate voltage waveform for FFT analysis"""
        # Simulate realistic voltage waveform
        sample_rate = 2560  # 2560 Hz for 50 Hz fundamental
        frequency = 50
        duration = 0.02  # One cycle
        t = np.linspace(0, duration, sample_rate)
        
        # Fundamental component
        voltage = data.get('voltage_rms', 240) * np.sqrt(2) * np.sin(2 * np.pi * frequency * t)
        
        # Add harmonics based on THD-V
        thd_value = data.get('thdv', 1.0)
        for harmonic in [3, 5, 7, 11, 13]:  # Common harmonics
            harmonic_magnitude = thd_value / (harmonic * 2)  # Simplified harmonic content
            voltage += harmonic_magnitude * np.sin(2 * np.pi * harmonic * frequency * t + np.random.random())
        
        # Add noise
        noise_level = 0.01  # 1% noise
        voltage += noise_level * np.random.normal(0, 1, len(t))
        
        return voltage.tolist()
    
    def _analyze_voltage_stability(self, data):
        """Analyze voltage stability and regulation"""
        voltage = data.get('voltage_rms', 240)
        voltage_deviation = abs(voltage - 240) / 240 * 100
        
        # Voltage stability classification
        if voltage_deviation < 3:
            stability = 'excellent'
            regulation = 'within limits'
        elif voltage_deviation < 5:
            stability = 'good'
            regulation = 'within limits'
        elif voltage_deviation < 8:
            stability = 'fair'
            regulation = 'marginal'
        else:
            stability = 'poor'
            regulation = 'out of limits'
        
        return {
            'voltage': round(voltage, 2),
            'deviation': round(voltage_deviation, 2),
            'stability': stability,
            'regulation': regulation,
            'ieee_compliant': voltage_deviation <= 5.0,
            'recommended_action': self.get_voltage_recommendation(voltage_deviation)
        }
    
    def _analyze_power_factor(self, data):
        """Analyze power factor and identify improvement opportunities"""
        power_factor = data.get('power_factor', 0.95)
        
        # Power factor analysis
        if power_factor >= 0.95:
            status = 'excellent'
            correction = 'not needed'
        elif power_factor >= 0.90:
            status = 'good'
            correction = 'recommended'
        elif power_factor >= 0.85:
            status = 'fair'
            correction = 'needed'
        else:
            status = 'poor'
            correction = 'urgently needed'
        
        # Calculate potential savings
        pf_improvement = max(0, 0.95 - power_factor)
        current_power = data.get('power_active', 1000)
        annual_savings = pf_improvement * current_power * 8760 * 0.1 if pf_improvement > 0 else 0
        
        return {
            'current': round(power_factor, 3),
            'status': status,
            'correction_needed': correction,
            'potential_annual_savings': round(annual_savings, 2),
            'improvement_recommendation': self.get_pf_recommendation(power_factor),
            'penalty_risk': power_factor < 0.85
        }
    
    def _detect_surges(self, data):
        """Detect voltage surges and transients"""
        # Simplified surge detection based on statistical analysis
        voltage_deviation = abs(data.get('voltage_rms', 240) - 240) / 240 * 100
        
        # In real implementation, would analyze voltage waveform for transients
        surge_detected = voltage_deviation > 10  # 10% deviation indicates surge
        
        return {
            'surge_detected': surge_detected,
            'count': data.get('surge_count', 0),
            'intensity': round(voltage_deviation, 1),
            'recommendation': 'Install surge protection' if surge_detected else 'No surge protection needed',
            'equipment_risk': 'high' if surge_detected else 'low'
        }
    
    def _calculate_power_quality_score(self, data, harmonics, voltage_stability):
        """Calculate overall power quality score"""
        score = 100
        
        # Harmonic impact
        if harmonics['thdv'] > 5: score -= 25
        elif harmonics['thdv'] > 3: score -= 15
        
        # Voltage stability impact
        if voltage_stability['deviation'] > 5: score -= 20
        elif voltage_stability['deviation'] > 3: score -= 10
        
        # Power factor impact
        pf = data.get('power_factor', 0.95)
        if pf < 0.85: score -= 15
        elif pf < 0.90: score -= 10
        
        return max(0, score)
    
    def get_voltage_recommendation(self, deviation):
        """Get voltage stability recommendation"""
        if deviation <= 3: return 'No action needed'
        elif deviation <= 5: return 'Monitor voltage stability'
        elif deviation <= 8: return 'Investigate voltage regulation issues'
        else: return 'Urgent: Check voltage regulation equipment'
    
    def get_pf_recommendation(self, power_factor):
        """Get power factor improvement recommendation"""
        if power_factor >= 0.95: return 'Power factor is excellent'
        elif power_factor >= 0.90: return 'Consider minor power factor correction'
        elif power_factor >= 0.85: return 'Install power factor correction equipment'
        else: return 'Immediate power factor correction required'

class RelayHealthAgent:
    """
    Monitors latching relay health and predicts remaining lifecycle
    Based on contact resistance and switching patterns
    """
    
    def __init__(self):
        self.contact_resistance_threshold = 0.1  # Ohms
        self.switching_cycle_limit = 100000
        
    def analyze(self, meter_id, data, historical_data=None):
        """Comprehensive relay health analysis"""
        
        try:
            # Contact resistance analysis
            contact_resistance = data.get('contact_resistance', 0.01)
            resistance_trend = self._analyze_contact_resistance(contact_resistance)
            
            # Switching cycle analysis
            cycles = data.get('switching_cycles', 0)
            cycle_analysis = self._analyze_switching_cycles(cycles)
            
            # Arcing detection
            arcing_analysis = self._detect_arcing(data)
            
            # Remaining life calculation
            remaining_life = self._calculate_remaining_life(contact_resistance, cycles)
            
            # Overall health assessment
            health_score = self._calculate_relay_health_score(contact_resistance, cycles, cycle_analysis)
            
            return {
                'health_score': health_score,
                'contact_resistance': contact_resistance,
                'resistance_trend': resistance_trend,
                'switching_cycles': cycles,
                'cycle_analysis': cycle_analysis,
                'arcing_analysis': arcing_analysis,
                'remaining_life': remaining_life,
                'replacement_recommendation': self._when_to_replace(contact_resistance, cycles, remaining_life)
            }
            
        except Exception as e:
            logger.error(f"Error in RelayHealthAgent: {e}")
            return {
                'health_score': 70,
                'contact_resistance': 0.01,
                'resistance_trend': 'unknown',
                'switching_cycles': 0,
                'cycle_analysis': {'usage_rate': 'unknown', 'remaining_cycles': 0},
                'arcing_analysis': {'arcing_detected': False, 'risk_level': 'low'},
                'remaining_life': {'cycles': 0, 'days': 0, 'percentage': 0},
                'replacement_recommendation': 'Monitor closely'
            }
    
    def _analyze_contact_resistance(self, resistance):
        """Analyze contact resistance trends"""
        trend = {
            'current': resistance,
            'status': '',
            'recommendation': '',
            'degradation_rate': 0
        }
        
        if resistance < 0.02:
            trend['status'] = 'excellent'
            trend['recommendation'] = 'No action needed'
        elif resistance < 0.05:
            trend['status'] = 'good'
            trend['recommendation'] = 'Routine maintenance'
        elif resistance < 0.08:
            trend['status'] = 'fair'
            trend['recommendation'] = 'Schedule contact cleaning'
            trend['degradation_rate'] = 0.5
        else:
            trend['status'] = 'poor'
            trend['recommendation'] = 'Immediate contact replacement needed'
            trend['degradation_rate'] = 1.0
        
        return trend
    
    def _analyze_switching_cycles(self, cycles):
        """Analyze switching cycle usage and stress"""
        usage_percentage = cycles / self.switching_cycle_limit
        
        cycle_analysis = {
            'usage_rate': '{}%'.format(round(usage_percentage * 100, 1)),
            'remaining_cycles': max(0, self.switching_cycle_limit - cycles),
            'stress_level': 'low'
        }
        
        if usage_percentage > 0.8:
            cycle_analysis['stress_level'] = 'high'
        elif usage_percentage > 0.6:
            cycle_analysis['stress_level'] = 'medium'
        
        return cycle_analysis
    
    def _detect_arcing(self, data):
        """Detect electrical arcing and contact erosion"""
        # Simplified arcing detection based on electrical signatures
        # In real implementation, would analyze current/voltage waveforms
        
        current_rms = data.get('current_rms', 10)
        voltage_rms = data.get('voltage_rms', 240)
        contact_resistance = data.get('contact_resistance', 0.01)
        
        arcing_risk_factors = []
        arcing_probability = 0.0
        
        # High current indicates potential arcing during switching
        if current_rms > 15:
            arcing_risk_factors.append('high_load_current')
            arcing_probability += 0.2
        
        # Low power factor can indicate arcing
        power_factor = data.get('power_factor', 0.95)
        if power_factor < 0.85:
            arcing_risk_factors.append('low_power_factor')
            arcing_probability += 0.3
        
        # Increased contact resistance indicates erosion
        if contact_resistance > 0.08:
            arcing_risk_factors.append('contact_erosion')
            arcing_probability += 0.4
        
        arcing_detected = arcing_probability > 0.3
        
        return {
            'arcing_detected': arcing_detected,
            'probability': arcing_probability,
            'risk_factors': arcing_risk_factors,
            'equipment_risk': 'high' if arcing_detected else 'low',
            'recommended_action': self._get_arcing_recommendation(arcing_detected, arcing_risk_factors)
        }
    
    def _get_arcing_recommendation(self, arcing_detected, risk_factors):
        """Get arcing mitigation recommendations"""
        if arcing_detected:
            return 'Immediate contact inspection and replacement if necessary. Install arc suppression.'
        elif len(risk_factors) > 1:
            return 'Schedule contact maintenance within 30 days. Monitor arcing indicators.'
        elif len(risk_factors) == 1:
            return 'Routine maintenance recommended. Check switching cycles.'
        else:
            return 'Relay condition normal. Continue routine maintenance.'
    
    def _calculate_remaining_life(self, contact_resistance, cycles):
        """Calculate remaining relay lifecycle"""
        # Mechanical life based on switching cycles
        mechanical_cycles = max(0, self.switching_cycle_limit - cycles)
        
        # Electrical life based on contact resistance degradation
        electrical_life = self._estimate_electrical_life(contact_resistance)
        
        # Combined remaining life (bottleneck approach)
        remaining_cycles = min(mechanical_cycles, electrical_life['cycles'])
        remaining_days = remaining_cycles / 10  # Assumes 10 cycles per day average
        life_percentage = (remaining_cycles / self.switching_cycle_limit) * 100
        
        return {
            'cycles': remaining_cycles,
            'days': round(remaining_days),
            'percentage': round(life_percentage, 1),
            'mechanical_cycles': mechanical_cycles,
            'electrical_cycles': electrical_life['cycles'],
            'limiting_factor': electrical_life['limiting_factor'] if electrical_life['cycles'] < mechanical_cycles else 'mechanical'
        }
    
    def _estimate_electrical_life(self, contact_resistance):
        """Estimate electrical life based on contact resistance"""
        if contact_resistance < 0.02:
            return {'cycles': self.switching_cycle_limit, 'limiting_factor': 'none'}
        elif contact_resistance < 0.05:
            return {'cycles': int(self.switching_cycle_limit * 0.8), 'limiting_factor': 'contact_wear'}
        elif contact_resistance < 0.08:
            return {'cycles': int(self.switching_cycle_limit * 0.5), 'limiting_factor': 'contact_degradation'}
        else:
            return {'cycles': int(self.switching_cycle_limit * 0.2), 'limiting_factor': 'contact_failure'}
    
    def _calculate_relay_health_score(self, contact_resistance, cycles, cycle_analysis):
        """Calculate overall relay health score"""
        score = 100
        
        # Contact resistance impact
        if contact_resistance > 0.1:
            score -= 30
        elif contact_resistance > 0.05:
            score -= 20
        elif contact_resistance > 0.02:
            score -= 10
        
        # Switching cycle impact
        cycle_usage = cycles / self.switching_cycle_limit
        score -= cycle_usage * 25
        
        # Cycle stress impact
        if cycle_analysis['stress_level'] == 'high':
            score -= 15
        elif cycle_analysis['stress_level'] == 'medium':
            score -= 5
        
        return max(0, score)
    
    def _when_to_replace(self, contact_resistance, cycles, remaining_life):
        """Determine when relay replacement is recommended"""
        replacement_needed = False
        urgency = 'none'
        reason = ''
        
        # Calculate remaining percentage
        remaining_percentage = remaining_life['percentage']
        
        if remaining_percentage < 20 or contact_resistance > 0.1:
            replacement_needed = True
            urgency = 'high'
            reason = 'Contact resistance exceeding threshold or remaining life below 20%'
        elif remaining_percentage < 50 or contact_resistance > 0.07:
            if contact_resistance > 0.05 and cycles > 80000:
                replacement_needed = True
                urgency = 'medium'
                reason = 'Contact wear indicated both electrically and mechanically'
        
        return {
            'replacement_needed': replacement_needed,
            'urgency': urgency,
            'reason': reason,
            'recommended_timeframe': self._get_replacement_timeframe(urgency),
            'estimated_cost': 180  # Typical relay replacement cost
        }
    
    def _get_replacement_timeframe(self, urgency):
        """Get replacement timeframe based on urgency"""
        timeframes = {
            'high': 'Within 30 days',
            'medium': 'Within 90 days',
            'low': 'Within 180 days',
            'none': 'As part of routine maintenance'
        }
        return timeframes.get(urgency, 'Unknown')

class EnvironmentalAgent:
    """
    Monitors environmental conditions affecting meter operation
    Temperature, humidity, EMI, and cooling efficiency
    """
    
    def __init__(self):
        self.temp_limits = {'low': 0, 'high': 70, 'optimal': 25}
        self.humidity_limits = {'low': 20, 'high': 80, 'optimal': 50}
        
    def analyze(self, meter_id, data, historical_data=None):
        """Comprehensive environmental analysis"""
        
        try:
            # Temperature analysis
            temperature_analysis = self._analyze_temperature(data)
            
            # Humidity analysis
            humidity_analysis = self._analyze_humidity(data)
            
            # Environmental stress calculation
            stress_analysis = self._calculate_environmental_stress(data, temperature_analysis, humidity_analysis)
            
            # Cooling efficiency assessment
            cooling_analysis = self._assess_cooling_efficiency(data, temperature_analysis)
            
            # EMI assessment (simplified)
            emi_analysis = self._assess_emi_interference(data)
            
            # Overall environmental health
            health_score = self._calculate_environmental_health(data, temperature_analysis, humidity_analysis)
            
            return {
                'health_score': health_score,
                'temperature': temperature_analysis,
                'humidity': humidity_analysis,
                'environmental_stress': stress_analysis,
                'cooling_efficiency': cooling_analysis,
                'emi_analysis': emi_analysis
            }
            
        except Exception as e:
            logger.error(f"Error in EnvironmentalAgent: {e}")
            return {
                'health_score': 70,
                'temperature': {'current': 25, 'status': 'unknown', 'recommendation': 'N/A'},
                'humidity': {'current': 50, 'status': 'unknown', 'recommendation': 'N/A'},
                'environmental_stress': {'level': 'unknown', 'combined': 0.5},
                'cooling_efficiency': {'efficiency': 80, 'recommendation': 'N/A'},
                'emi_analysis': {'interference_level': 'low', 'recommendation': 'N/A'}
            }
    
    def _analyze_temperature(self, data):
        """Analyze temperature conditions"""
        temperature = data.get('temperature', 25)
        
        if temperature < 0:
            status = 'critical_low'
            recommendation = 'Install heating system'
        elif temperature < 20:
            status = 'low'
            recommendation = 'Monitor for condensation'
        elif temperature < 40:
            status = 'optimal'
            recommendation = 'No action needed'
        elif temperature < 55:
            status = 'elevated'
            recommendation = 'Improve ventilation'
        elif temperature < 65:
            status = 'high'
            recommendation = 'Install cooling system'
        else:
            status = 'critical'
            recommendation = 'Immediate cooling system required'
        
        return {
            'current': temperature,
            'status': status,
            'recommendation': recommendation,
            'rate_of_change': self._calculate_temp_rate_of_change(temperature, data.get('timestamp', datetime.now(timezone.utc))),
            'thermal_stress': self._calculate_thermal_stress(temperature)
        }
    
    def _calculate_temp_rate_of_change(self, current_temp, timestamp):
        """Calculate temperature rate of change"""
        # In real implementation, would compare with previous readings
        # For now, simulate based on current temperature
        if current_temp > 60:
            return 'rapid_increase'
        elif current_temp > 45:
            return 'slow_increase'
        else:
            return 'stable'
    
    def _calculate_thermal_stress(self, temperature):
        """Calculate thermal stress on equipment"""
        # Thermal stress increases exponentially with temperature
        reference_temp = 25
        temp_diff = max(0, temperature - reference_temp)
        
        # Exponential stress model
        stress_factor = 2 ** (temp_diff / 10)  # Doubles every 10°C
        stress_level = min(10, stress_factor / 2)  # Normalize to 0-10 scale
        
        return {
            'factor': round(stress_factor, 2),
            'level': stress_level,
            'life_reduction': round((stress_factor - 1) * 100, 1)  # Percentage
        }
    
    def _analyze_humidity(self, data):
        """Analyze humidity conditions"""
        # Estimate humidity if not measured
        humidity = self._estimate_humidity(data)
        
        if humidity < 20:
            status = 'too_low'
            recommendation = 'Consider humidification'
        elif humidity < 40:
            status = 'low'
            recommendation = 'Monitor for static discharge'
        elif humidity < 60:
            status = 'optimal'
            recommendation = 'No action needed'
        elif humidity < 80:
            status = 'high'
            recommendation = 'Improve ventilation'
        else:
            status = 'too_high'
            recommendation = 'Install dehumidification system'
        
        return {
            'current': round(humidity, 1),
            'status': status,
            'recommendation': recommendation,
            'dew_point': self._calculate_dew_point(humidity, data.get('temperature', 25)),
            'corrosion_risk': 'high' if humidity > 80 else 'low' if humidity < 30 else 'medium'
        }
    
    def _estimate_humidity(self, data):
        """Estimate humidity based on temperature and typical indoor conditions"""
        temperature = data.get('temperature', 25)
        # Simple estimation: assume 60% relative humidity for normal conditions
        base_humidity = 60
        
        # Adjust based on temperature (simplified psychrometric relationship)
        temp_adjustment = -((temperature - 25) * 2)  # Decreases with temperature
        
        # Add some random variation
        variation = (random.random() - 0.5) * 20
        
        estimated_humidity = max(10, min(90, base_humidity + temp_adjustment + variation))
        
        return estimated_humidity
    
    def _calculate_dew_point(self, humidity, temperature):
        """Calculate dew point temperature"""
        # Magnus formula for dew point calculation
        a = 17.62
        b = 243.12  # °C
        temp_kelvin = temperature + 273.15
        
        # Water saturation pressure
        gamma = (a * temperature) / (b + temperature) + np.log(humidity / 100)
        dew_point = (b * gamma) / (a - gamma)
        
        return round(dew_point, 1)
    
    def _calculate_environmental_stress(self, data, temp_analysis, humidity_analysis):
        """Calculate combined environmental stress"""
        temperature = data.get('temperature', 25)
        humidity = humidity_analysis['current']
        
        # Temperature stress
        temp_stress = max(0, (temperature - 40) / 30)  # Normalized to 0-1
        
        # Humidity stress
        humi_stress = abs(humidity - 50) / 50  # Distance from optimal 50%
        
        # Combined stress using root-sum-square
        combined_stress = np.sqrt(temp_stress**2 + humi_stress**2) / np.sqrt(2)
        
        # Stress level classification
        if combined_stress > 0.8:
            level = 'high'
        elif combined_stress > 0.5:
            level = 'medium'
        else:
            level = 'low'
        
        return {
            'temperature': round(temp_stress, 2),
            'humidity': round(humi_stress, 2),
            'combined': round(combined_stress, 2),
            'level': level,
            'equipment_impact': self._estimate_equipment_impact(combined_stress)
        }
    
    def _estimate_equipment_impact(self, stress_level):
        """Estimate impact on equipment operation and lifespan"""
        impacts = {
            'efficiency': max(0, 100 - stress_level * 30),
            'reliability': max(0, 100 - stress_level * 20),
            'lifespan': max(0, 100 - stress_level * 25)
        }
        
        return {
            'efficiency': round(impacts['efficiency'], 1),
            'reliability': round(impacts['reliability'], 1),
            'lifespan': round(impacts['lifespan'], 1),
            'estimated_reduction': round(stress_level * 30, 1)
        }
    
    def _assess_cooling_efficiency(self, data, temperature_analysis):
        """Assess cooling system efficiency"""
        temperature = data.get('temperature', 25)
        
        # Calculate theoretical efficiency based on temperature differential
        ambient_temp = 25  # Assumed ambient temperature
        temp_rise = temperature - ambient_temp
        
        # Efficiency calculation (100% efficiency at 0° rise)
        efficiency = max(0, 100 - temp_rise * 2)
        
        # Cooling system recommendation
        if efficiency > 80:
            recommendation = 'Cooling system operating efficiently'
        elif efficiency > 60:
            recommendation = 'Monitor cooling system performance'
        else:
            recommendation = 'Upgrade cooling system or improve ventilation'
        
        return {
            'current': round(temperature, 1),
            'ambient': ambient_temp,
            'temperature_rise': round(temp_rise, 1),
            'efficiency': round(efficiency, 1),
            'recommendation': recommendation,
            'cooling_system_needed': efficiency < 70
        }
    
    def _assess_emi_interference(self, data):
        """Assess electromagnetic interference levels"""
        # Simplified EMI assessment based on electrical measurements
        # In real implementation, would measure EMI with specialized sensors
        
        thdv = data.get('thdv', 1.5)
        voltage_deviation = abs(data.get('voltage_rms', 240) - 240) / 240 * 100
        
        # EMI correlation with power quality
        emi_level = (thdv / 5.0) + (voltage_deviation / 10.0)
        
        if emi_level > 2.0:
            interference_level = 'high'
            recommendation = 'Install EMI filters and check grounding'
        elif emi_level > 1.0:
            interference_level = 'medium'
            recommendation = 'Improve cable shielding and grounding'
        else:
            interference_level = 'low'
            recommendation = 'EMI levels acceptable'
        
        return {
            'interference_level': interference_level,
            'emi_index': round(emi_level, 2),
            'recommendation': recommendation,
            'filtering_needed': interference_level in ['high', 'medium']
        }
    
    def _calculate_environmental_health(self, data, temperature_analysis, humidity_analysis):
        """Calculate overall environmental health score"""
        score = 100
        
        # Temperature impact
        temp_status = temperature_analysis['status']
        if temp_status == 'critical':
            score -= 30
        elif temp_status == 'high':
            score -= 20
        elif temp_status == 'elevated':
            score -= 10
        
        # Humidity impact
        humi_status = humidity_analysis['status']
        if humi_status in ['too_high', 'too_low']:
            score -= 15
        elif humi_status == 'high':
            score -= 10
        
        # Additional environmental factors
        if data.get('temperature', 25) > 60:
            score -= 10
        
        return max(0, score)

# Collaborative AI System
class SmartMeterAgenticSystem:
    """
    Central system coordinating all AI agents for collaborative analysis
    Implements agentic AI architecture for smart meter predictive maintenance
    """
    
    def __init__(self):
        self.agents = {
            'condition_monitor': ConditionMonitoringAgent(),
            'power_quality': PowerQualityAgent(),
            'relay_health': RelayHealthAgent(),
            'environmental': EnvironmentalAgent()
            # No prediction agent here as it's handled by the main system
        }
        
        self.fusion_weights = {
            'condition_monitor': 0.30,
            'power_quality': 0.25,
            'relay_health': 0.25,
            'environmental': 0.20
        }
        
        # Machine learning models for pattern recognition
        self.failure_predictor = self._initialize_failure_predictor()
        self.pattern_recognizer = self._initialize_pattern_recognizer()
    
    def _initialize_failure_predictor(self):
        """Initialize ML model for failure prediction"""
        # In a real implementation, would train on historical data
        # For now, use Random Forest as example
        try:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            # Would train on historical failure data
            return model
        except:
            return None
    
    def _initialize_pattern_recognizer(self):
        """Initialize pattern recognition system"""
        # Neural network for complex pattern recognition
        class PatternNet(nn.Module):
            def __init__(self):
                super(PatternNet, self).__init__()
                self.fc1 = nn.Linear(10, 64)
                self.fc2 = nn.Linear(64, 32)
                self.fc3 = nn.Linear(32, 5)  # 5 fault patterns
                self.relu = nn.ReLU()
                self.softmax = nn.Softmax(dim=1)
            
            def forward(self, x):
                x = self.relu(self.fc1(x))
                x = self.relu(self.fc2(x))
                x = self.fc3(x)
                return self.softmax(x)
        
        return PatternNet()
    
    def analyze_meter(self, meter_id, current_data, historical_data=None):
        """
        Comprehensive collaborative analysis of smart meter health
        """
        try:
            # Run all agents in parallel (would use asyncio in production)
            agent_results = {}
            
            for agent_name, agent in self.agents.items():
                try:
                    result = agent.analyze(meter_id, current_data, historical_data)
                    # Ensure result is a dict
                    if isinstance(result, dict):
                        agent_results[agent_name] = result
                    else:
                        logger.warning(f"Agent {agent_name} returned non-dict result: {type(result)}")
                        agent_results[agent_name] = {'health_score': 50, 'error': 'Invalid result type'}
                except Exception as e:
                    logger.error(f"Error in agent {agent_name}: {e}")
                    agent_results[agent_name] = {'health_score': 50, 'error': str(e)}
            
            # Collaborative decision making
            combined_analysis = self._fusion_analysis(agent_results)
            
            # Generate failure timeline
            failure_timeline = self._generate_failure_timeline(agent_results)
            
            # Risk assessment
            risk_assessment = self._assess_risk(agent_results, combined_analysis)
            
            # Generate recommendations
            recommendations = self._collaborative_recommendations(agent_results, risk_assessment)
            
            # Predictive insights
            predictions = self._generate_predictions(agent_results, historical_data)
            
            return {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'meter_id': meter_id,
                'agent_results': agent_results,
                **combined_analysis,
                'failure_timeline': failure_timeline,
                'risk_assessment': risk_assessment,
                'recommendations': recommendations,
                'predictions': predictions
            }
            
        except Exception as e:
            logger.error(f"Error in collaborative analysis: {e}")
            return {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'meter_id': meter_id,
                'error': str(e),
                'overall_health_score': 50,
                'risk_level': 'high',
                'recommendations': ['System error - manual inspection required'],
                'agent_results': {}
            }
    
    def _fusion_analysis(self, agent_results):
        """Combine agent results using weighted fusion"""
        try:
            # Calculate weighted health score
            overall_health = 0
            total_weight = 0
            
            for agent_name, weight in self.fusion_weights.items():
                if agent_name in agent_results and 'health_score' in agent_results[agent_name]:
                    overall_health += agent_results[agent_name]['health_score'] * weight
                    total_weight += weight
            
            overall_health_score = round(overall_health / total_weight if total_weight > 0 else 50, 1)
            
            # Determine risk level
            risk_level = self._determine_risk_level(overall_health_score, agent_results)
            
            # Extract anomalies
            all_anomalies = []
            for agent_result in agent_results.values():
                if isinstance(agent_result, dict) and 'anomalies_detected' in agent_result:
                    all_anomalies.extend(agent_result['anomalies_detected'])
            
            # Calculate failure probability
            failure_probability = self._calculate_failure_probability(agent_results)
            
            return {
                'overall_health_score': overall_health_score,
                'risk_level': risk_level,
                'anomalies': all_anomalies,
                'failure_probability': failure_probability,
                'confidence': self._calculate_system_confidence(agent_results)
            }
            
        except Exception as e:
            logger.error(f"Error in fusion analysis: {e}")
            return {
                'overall_health_score': 50,
                'risk_level': 'unknown',
                'anomalies': [],
                'failure_probability': 30,
                'confidence': 60
            }
    
    def _determine_risk_level(self, health_score, agent_results):
        """Determine risk level based on health score and agent inputs"""
        if health_score >= 80:
            base_risk = 'low'
        elif health_score >= 60:
            base_risk = 'medium'
        else:
            base_risk = 'high'
        
        # Adjust based on critical conditions
        critical_conditions = 0
        for agent_name, result in agent_results.items():
            if 'anomalies_detected' in result:
                for anomaly in result['anomalies_detected']:
                    if isinstance(anomaly, dict) and anomaly.get('severity') == 'critical':
                        critical_conditions += 1
        
        if critical_conditions >= 2:
            return 'critical'
        elif critical_conditions >= 1 and base_risk == 'high':
            return 'critical'
        
        return base_risk
    
    def _calculate_failure_probability(self, agent_results):
        """Calculate combined failure probability"""
        probabilities = []
        
        for agent_name, result in agent_results.items():
            if 'failure_probability' in result:
                probabilities.append(result['failure_probability'])
        
        if probabilities:
            # Weighted average of failure probabilities
            return round(np.mean(probabilities), 2)
        else:
            return 30.0  # Default if no agent provides probability
    
    def _calculate_system_confidence(self, agent_results):
        """Calculate overall system confidence"""
        confidences = []
        
        for agent_name, result in agent_results.items():
            if 'confidence' in result:
                confidences.append(result['confidence'])
        
        if confidences:
            return round(np.mean(confidences), 2)
        else:
            return 70.0
    
    def _generate_failure_timeline(self, agent_results):
        """Generate failure timeline based on agent predictions"""
        timeline = []
        
        # Extract predictions from agents
        for agent_name, result in agent_results.items():
            if 'fault_patterns' in result:
                for pattern in result['fault_patterns']:
                    if pattern.get('severity') in ['warning', 'critical']:
                        timeline.append({
                            'event': pattern.get('type', 'unknown'),
                            'severity': pattern.get('severity', 'medium'),
                            'estimated_time': self._estimate_time_to_failure(agent_name, pattern),
                            'affected_system': agent_name,
                            'recommendation': pattern.get('recommendation', 'Monitor closely')
                        })
        
        # Sort by estimated time
        timeline.sort(key=lambda x: x['estimated_time'])
        
        return timeline[:5]  # Return top 5 most imminent predictions
    
    def _estimate_time_to_failure(self, agent_name, pattern):
        """Estimate time to failure based on agent analysis"""
        # Simplified estimation - would use sophisticated ML models
        base_times = {
            'condition_monitor': 30,  # days
            'power_quality': 45,
            'relay_health': 90,
            'environmental': 60
        }
        
        severity_multiplier = {
            'critical': 0.3,
            'high': 0.5,
            'warning': 0.8,
            'medium': 1.0
        }
        
        base_time = base_times.get(agent_name, 60)
        severity = pattern.get('severity', 'medium')
        multiplier = severity_multiplier.get(severity, 1.0)
        
        return int(base_time * multiplier)
    
    def _assess_risk(self, agent_results, combined_analysis):
        """Comprehensive risk assessment"""
        risk_matrix = {
            'probability': combined_analysis['failure_probability'],
            'impact': self._calculate_impact_score(agent_results),
            'combined_risk': combined_analysis['risk_level'],
            'vulnerability': self._calculate_vulnerability(agent_results),
            'mitigation_cost': self._estimate_mitigation_cost(agent_results)
        }
        
        return risk_matrix
    
    def _calculate_impact_score(self, agent_results):
        """Calculate potential impact of failures"""
        impact_factors = []
        
        for agent_name, result in agent_results.items():
            if 'health_score' in result:
                score = result['health_score']
                factor = max(0, 100 - score) / 100  # Impact factor 0-1
                impact_factors.append(factor)
        
        if impact_factors:
            avg_impact = float(np.mean(impact_factors))
            return {
                'score': round(avg_impact * 100, 1),
                'level': 'high' if avg_impact > 0.7 else 'medium' if avg_impact > 0.4 else 'low'
            }
        
        return {'score': 50, 'level': 'medium'}
    
    def _calculate_vulnerability(self, agent_results):
        """Calculate system vulnerability"""
        vulnerability_score = 0
        
        for agent_name, result in agent_results.items():
            if 'health_score' in result:
                if result['health_score'] < 60:
                    vulnerability_score += 25
        
        return min(100, vulnerability_score)
    
    def _estimate_mitigation_cost(self, agent_results):
        """Estimate mitigation cost based on recommendations"""
        cost_estimates = {
            'routine_maintenance': 50,
            'contact_cleaning': 200,
            'harmonic_filter': 500,
            'cooling_upgrade': 1000,
            'relay_replacement': 300,
            'emergency_replacement': 1500
        }
        
        total_cost = 0
        recommendations = self._extract_recommendations(agent_results)
        
        for rec_type in recommendations:
            if rec_type in cost_estimates:
                total_cost += cost_estimates[rec_type]
        
        return {
            'estimated_cost': total_cost,
            'urgency': 'high' if any(rec.get('severity') == 'critical' for rec in recommendations) else 'medium',
            'roi_months': round(total_cost / (total_cost * 0.2)) if total_cost > 0 else 0  # Simplified ROI
        }
    
    def _extract_recommendations(self, agent_results):
        """Extract all recommendations from agent results"""
        recommendations = []
        
        for agent_name, result in agent_results.items():
            if 'fault_patterns' in result:
                patterns = result['fault_patterns']
                for pattern in patterns:
                    if 'type' in pattern:
                        recommendations.append(pattern['type'])
        
        return recommendations
    
    def _collaborative_recommendations(self, agent_results, risk_assessment):
        """Generate collaborative recommendations based on all agents"""
        recommendations = []
        
        # High-priority recommendations
        critical_conditions = self._identify_critical_conditions(agent_results)
        for condition in critical_conditions:
            recommendations.append({
                'priority': 'urgent',
                'action': condition['action'],
                'cost': 0,  # Will be calculated later
                'timeframe': 'immediate',
                'expected_improvement': 20
            })
        
        # Equipment-specific recommendations
        equipment_recommendations = self._generate_equipment_recommendations(agent_results)
        recommendations.extend(equipment_recommendations)
        
        # Operational recommendations
        operational_recommendations = self._generate_operational_recommendations(agent_results, risk_assessment)
        recommendations.extend(operational_recommendations)
        
        # Preventive recommendations
        preventive_recommendations = self._generate_preventive_recommendations(agent_results)
        recommendations.extend(preventive_recommendations)
        
        return recommendations
    
    def _identify_critical_conditions(self, agent_results):
        """Identify critical conditions requiring immediate attention"""
        critical_conditions = []
        
        for agent_name, result in agent_results.items():
            if 'health_score' in result and result['health_score'] < 40:
                critical_conditions.append({
                    'agent': agent_name,
                    'action': f'Immediate {agent_name} inspection required',
                    'severity': 'critical',
                    'health_score': result['health_score']
                })
            
            if 'fault_patterns' in result:
                for pattern in result['fault_patterns']:
                    if pattern.get('severity') == 'critical':
                        critical_conditions.append({
                            'agent': agent_name,
                            'action': pattern.get('recommendation', 'Immediate action required'),
                            'severity': 'critical'
                        })
        
        return critical_conditions
    
    def _generate_equipment_recommendations(self, agent_results):
        """Generate equipment-specific recommendations"""
        recommendations = []
        
        # Power quality issues
        if 'power_quality' in agent_results:
            pq_result = agent_results['power_quality']
            if isinstance(pq_result, dict) and pq_result.get('harmonics', {}).get('thdv', 0) > 5:
                recommendations.append({
                    'priority': 'high',
                    'action': 'Install harmonic filter to reduce THD levels',
                    'equipment': 'harmonic_filter',
                    'cost': 800,
                    'timeframe': '30 days',
                    'expected_improvement': 25
                })
        
        # Relay health issues
        if 'relay_health' in agent_results:
            rh_result = agent_results['relay_health']
            if isinstance(rh_result, dict) and rh_result.get('replacement_recommendation', {}).get('replacement_needed'):
                recommendations.append({
                    'priority': 'high',
                    'action': f"Replace relay (estimated cost: ${rh_result.get('replacement_recommendation', {}).get('estimated_cost', 180)})",
                    'equipment': 'relay',
                    'cost': rh_result.get('replacement_recommendation', {}).get('estimated_cost', 180),
                    'timeframe': '90 days',
                    'expected_improvement': 15
                })
        
        return recommendations
    
    def _generate_operational_recommendations(self, agent_results, risk_assessment):
        """Generate operational and maintenance recommendations"""
        recommendations = []
        
        # Load optimization
        if any(agent_results.get(agent, {}).get('health_score', 100) < 70 for agent in ['power_quality', 'condition_monitor']):
            recommendations.append({
                'priority': 'medium',
                'action': 'Optimize load scheduling to reduce peak demand',
                'cost': 0,
                'timeframe': 'immediate',
                'expected_improvement': 10,
                'benefits': ['Reduced stress', 'Lower energy costs']
            })
        
        # Maintenance scheduling
        if risk_assessment.get('level') in ['high', 'critical']:
            recommendations.append({
                'priority': 'high',
                'action': 'Accelerate preventive maintenance schedule',
                'cost': 300,
                'timeframe': '30 days',
                'expected_improvement': 20,
                'benefits': ['Reduced failure probability', 'Extended equipment life']
            })
        
        return recommendations
    
    def _generate_preventive_recommendations(self, agent_results):
        """Generate preventive maintenance recommendations"""
        recommendations = []
        
        # Environmental improvements
        if 'environmental' in agent_results:
            env_result = agent_results['environmental']
            if isinstance(env_result, dict) and env_result.get('cooling_efficiency', {}).get('efficiency', 100) < 70:
                recommendations.append({
                    'priority': 'medium',
                    'action': 'Upgrade cooling system or improve ventilation',
                    'cost': 1200,
                    'timeframe': '60 days',
                    'expected_improvement': 20,
                    'benefits': ['Better temperature control', 'Extended equipment life']
                })
        
        # General preventive measures
        recommendations.append({
            'priority': 'low',
            'action': 'Implement condition-based maintenance program',
            'cost': 2000,
            'timeframe': '6 months',
            'expected_improvement': 30,
            'benefits': ['Proactive maintenance', 'Cost optimization', 'Extended lifecycle']
        })
        
        return recommendations
    
    def _generate_predictions(self, agent_results, historical_data):
        """Generate predictive insights"""
        try:
            failure_timeline = self._generate_failure_timeline(agent_results)
            spare_parts_forecast = self._forecast_spare_parts_needs(agent_results)
            maintenance_schedule = self._optimize_maintenance_schedule(agent_results, historical_data)
            
            return {
                'failure_timeline': failure_timeline,
                'spare_parts_forecast': spare_parts_forecast,
                'maintenance_schedule': maintenance_schedule,
                'cost_optimization': self._calculate_cost_optimization(failure_timeline, maintenance_schedule)
            }
            
        except Exception as e:
            logger.error(f"Error generating prediction: {e}")
            return {
                'failure_timeline': [],
                'spare_parts_forecast': {'immediate': [], 'future': []},
                'maintenance_schedule': {'immediate': [], 'scheduled': []},
                'cost_optimization': {'annual_savings': 0, 'roi_months': 0}
            }
    
    def _forecast_spare_parts_needs(self, agent_results):
        """Forecast spare parts requirements"""
        immediate_needs = []
        future_needs = []
        
        # Analyze each agent's recommendations
        for agent_name, result in agent_results.items():
            if 'fault_patterns' in result:
                for pattern in result['fault_patterns']:
                    if pattern.get('severity') in ['critical', 'high']:
                        part_type = self._map_pattern_to_spare_part(pattern.get('type', 'unknown'))
                        if part_type:
                            immediate_needs.append({
                                'part': part_type,
                                'quantity': 1,
                                'urgency': 'immediate',
                                'estimated_cost': self._get_part_cost(part_type)
                            })
        
        return {
            'immediate': immediate_needs[:5],
            'future': future_needs[:3]
        }
    
    def _map_pattern_to_spare_part(self, pattern_type):
        """Map fault pattern to spare part requirement"""
        part_mapping = {
            'loose_connection': 'Terminal Block',
            'harmonic_distortion': 'Filter Module',
            'overcurrent': 'Current Transformer',
            'contact_erosion': 'Relay Contact Set',
            'temperature': 'Cooling Fan',
            'arcing': 'Arc Suppressor'
        }
        
        return part_mapping.get(pattern_type, 'General Component')
    
    def _get_part_cost(self, part_type):
        """Get estimated part cost"""
        cost_estimates = {
            'Terminal Block': 50,
            'Filter Module': 300,
            'Current Transformer': 200,
            'Relay Contact Set': 150,
            'Cooling Fan': 75,
            'Arc Suppressor': 100,
            'General Component': 100
        }
        
        return cost_estimates.get(part_type, 100)
    
    def _optimize_maintenance_schedule(self, agent_results, historical_data):
        """Optimize maintenance scheduling based on predictions"""
        immediate_task = []
        scheduled_tasks = []
        
        # Determine urgency based on failing indicators
        critical_count = 0
        warning_count = 0
        
        for agent_name, result in agent_results.items():
            if 'fault_patterns' in result:
                for pattern in result['fault_patterns']:
                    if pattern.get('severity') == 'critical':
                        critical_count += 1
                    elif pattern.get('severity') == 'warning':
                        warning_count += 1
        
        # Schedule immediate maintenance if critical conditions exist
        if critical_count > 2:
            immediate_task.append({
                'task': 'Emergency Maintenance',
                'priority': 'urgent',
                'estimated_duration': '4 hours',
                'estimated_cost': 800
            })
        
        # Schedule preventive maintenance based on warnings
        if warning_count > 2:
            scheduled_tasks.append({
                'task': 'Preventive Maintenance',
                'priority': 'high',
                'estimated_duration': '2 hours',
                'estimated_cost': 400
            })
        
        # Add routine maintenance
        scheduled_tasks.append({
            'task': 'Routine Inspection',
            'priority': 'normal',
            'estimated_duration': '1 hour',
            'estimated_cost': 200
        })
        
        return {
            'immediate': immediate_task,
            'scheduled': scheduled_tasks[:5]  # Limit to top 5 tasks
        }
    
    def _calculate_cost_optimization(self, failure_timeline, maintenance_schedule):
        """Calculate cost optimization benefits"""
        try:
            # Estimate costs without predictive maintenance
            cost_without_optimization = 1500  # Average downtime cost
            
            # Estimate costs with predictive maintenance
            maintenance_costs = sum(task['estimated_cost'] for task in maintenance_schedule['scheduled'])
            failure_prevention_value = len(failure_timeline) * 1000  # Prevented failure value
            
            # Calculate annual savings
            annual_savings = failure_prevention_value - maintenance_costs
            roi_months = int(maintenance_costs / (annual_savings / 12)) if annual_savings > 0 else 0
            
            return {
                'annual_savings': annual_savings,
                'roi_months': roi_months,
                'efficiency_improvement': f"{min(50, len(failure_timeline) * 10)}%",
                'downtime_reduction': f"{min(80, len(failure_timeline) * 5)}%"
            }
            
        except Exception as e:
            logger.error(f"Cost optimization error: {e}")
            return {
                'annual_savings': 0,
                'roi_months': 0,
                'efficiency_improvement': "0%",
                'downtime_reduction': "0%"
            }

# WebSocket handlers for real-time communication
@socketio.on('connect')
def handle_connect():
    """Handle client connection for real-time monitoring"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'status': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('subscribe_meter')
def handle_subscribe_meter(data):
    """Subscribe to real-time updates for specific meter"""
    try:
        meter_id = data.get('meter_id')
        if meter_id:
            join_room(meter_id)
            emit('subscribed', {'meter_id': meter_id, 'status': 'subscribed'}, room=meter_id)
            logger.info(f"Client {request.sid} subscribed to meter {meter_id}")
    except Exception as e:
        logger.error(f"Error in subscribe_meter: {e}")
        emit('error', {'message': str(e)})

@socketio.on('unsubscribe_meter')
def handle_unsubscribe_meter(data):
    """Unsubscribe from meter updates"""
    try:
        meter_id = data.get('meter_id')
        if meter_id:
            leave_room(meter_id)
            emit('unsubscribed', {'meter_id': meter_id}, room=meter_id)
            logger.info(f"Client {request.sid} unsubscribed from meter {meter_id}")
    except Exception as e:
        logger.error(f"Error in unsubscribe_meter: {e}")

# API Routes
@app.route('/')
def index():
    """Serve the main dashboard"""
    return render_template('index.html')

@app.route('/digital-meter-reading')
def digital_meter_reading():
    """Serve the digital meter reading page"""
    return render_template('digital-meter-reading.html')

@app.route('/digital-meter-hybrid')
def digital_meter_hybrid():
    """Serve the hybrid digital meter page"""
    return render_template('digital-meter-hybrid.html')

@app.route('/hybrid-dashboard')
def hybrid_dashboard():
    """Serve the hybrid dashboard page"""
    return render_template('hybrid-dashboard.html')

@app.route('/updated')
def updated():
    """Serve the updated AI-powered digital smart meter interface"""
    return render_template('updated.html')

@app.route('/updated.html')
def updated_html():
    """Redirect .html version to main route"""
    return redirect('/updated', code=301)

@app.route('/test')
def test():
    """Test route"""
    return render_template('test.html')

@app.route('/api/meters', methods=['GET'])
def get_meters():
    """Get all smart meters"""
    try:
        meters = SmartMeter.query.all()
        return jsonify({
            'success': True,
            'data': [meter.to_dict() for meter in meters],
            'count': len(meters)
        })
    except Exception as e:
        logger.error(f"Error getting meters: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/meters', methods=['POST'])
@jwt_required()
def create_meter():
    """Create new smart meter"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['id', 'name']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Check if meter exists
        meter = db.session.get(SmartMeter, data['id'])
        if meter:
            return jsonify({'success': False, 'error': 'Meter ID already exists'}), 400
        
        # Create new meter
        new_meter = SmartMeter(
            id=data['id'],
            name=data['name'],
            location=data.get('location', ''),
            meter_type=data.get('meter_type', 'standard'),
            installation_date=datetime.fromisoformat(data.get('installation_date', datetime.now(timezone.utc).isoformat())),
            last_maintenance=data.get('last_maintenance'),
            next_maintenance=data.get('next_maintenance'),
            status=data.get('status', 'active')
        )
        
        db.session.add(new_meter)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': new_meter.to_dict(),
            'message': 'Smart meter created successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating meter: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/meter/<meter_id>/data', methods=['POST'])
def add_meter_data(meter_id):
    """Add new meter reading data"""
    try:
        data = request.get_json()
        
        # Input validation
        required_fields = ['voltage_rms', 'current_rms', 'power_active', 'power_factor', 'temperature']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Create new reading
        new_reading = MeterReading(
            meter_id=meter_id,
            voltage_rms=float(data['voltage_rms']),
            current_rms=float(data['current_rms']),
            power_active=float(data['power_active']),
            power_reactive=float(data.get('power_reactive', 0)),
            power_factor=float(data['power_factor']),
            frequency=float(data.get('frequency', 50.0)),
            thdv=float(data.get('thdv', 1.5)),
            thdi=float(data.get('thdi', 2.0)),
            harmonic_list=json.dumps(data.get('harmonic_list', [])),
            temperature=float(data['temperature']),
            contact_resistance=float(data.get('contact_resistance', 0.01)),
            switching_cycles=int(data.get('switching_cycles', 0)),
            voltage_waveform=json.dumps(data.get('voltage_waveform', [])),
            current_waveform=json.dumps(data.get('current_waveform', []))
        )
        
        db.session.add(new_reading)
        db.session.commit()
        
        # Run agentic analysis
        agentic_system = SmartMeterAgenticSystem()
        analysis_result = agentic_system.analyze_meter(meter_id, data)
        
        # Store health record
        health_record = HealthRecord(
            meter_id=meter_id,
            overall_health_score=analysis_result.get('overall_health_score', 50),
            condition_monitor_score=analysis_result.get('agent_results', {}).get('condition_monitor', {}).get('health_score', 50),
            power_quality_score=analysis_result.get('agent_results', {}).get('power_quality', {}).get('health_score', 50),
            relay_health_score=analysis_result.get('agent_results', {}).get('relay_health', {}).get('health_score', 50),
            environmental_score=analysis_result.get('agent_results', {}).get('environmental', {}).get('health_score', 50),
            anomaly_count=len(analysis_result.get('anomalies', [])),
            anomaly_details=json.dumps(analysis_result.get('anomalies', [])),
            failure_probability=analysis_result.get('failure_probability', 30),
            failure_timeline=json.dumps(analysis_result.get('failure_timeline', [])),
            risk_level=analysis_result.get('risk_level', 'medium'),
            recommendations=json.dumps(analysis_result.get('recommendations', []))
        )
        
        db.session.add(health_record)
        db.session.commit()
        
        # Generate alerts if necessary
        alerts = generate_alerts(meter_id, data, analysis_result)
        for alert in alerts:
            db.session.add(alert)
        db.session.commit()
        
        # Emit real-time update via WebSocket
        socketio.emit('meter_update', {
            'meter_id': meter_id,
            'reading': new_reading.to_dict(),
            'health_analysis': analysis_result,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, room=meter_id)
        
        return jsonify({
            'success': True,
            'data': {
                'reading_id': new_reading.id,
                'health_analysis': analysis_result
            },
            'message': 'Meter data added and analyzed successfully'
        })
        
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding meter data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/meter/<meter_id>/health', methods=['GET'])
def get_meter_health(meter_id):
    """Get comprehensive health status for a specific meter"""
    try:
        # Get latest reading
        latest_reading = MeterReading.query.filter_by(meter_id=meter_id).order_by(MeterReading.timestamp.desc()).first()
        
        if not latest_reading:
            return jsonify({'success': False, 'error': 'No data available for this meter'}), 404
        
        # Get latest health record
        latest_health = HealthRecord.query.filter_by(meter_id=meter_id).order_by(HealthRecord.timestamp.desc()).first()
        
        if not latest_health:
            # Run fresh analysis
            agentic_system = SmartMeterAgenticSystem()
            data = latest_reading.to_dict()
            data.update({
                'operating_hours': calculate_operating_hours(meter_id),
                'surge_count': get_surge_count(meter_id)
            })
            analysis_result = agentic_system.analyze_meter(meter_id, data)
            
            return jsonify({
                'success': True,
                'data': {
                    'meter_id': meter_id,
                    'latest_reading': latest_reading.to_dict(),
                    'health_analysis': analysis_result,
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            })
        
        # Return existing health analysis
        return jsonify({
            'success': True,
            'data': {
                'meter_id': meter_id,
                'latest_reading': latest_reading.to_dict(),
                'health_record': latest_health.to_dict(),
                'timestamp': latest_health.timestamp.isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting meter health: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/meter/<meter_id>/readings', methods=['GET'])
def get_meter_readings(meter_id):
    """Get historical readings for a meter"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 100, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = MeterReading.query.filter_by(meter_id=meter_id)
        
        if start_date:
            query = query.filter(MeterReading.timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(MeterReading.timestamp <= datetime.fromisoformat(end_date))
        
        readings = query.order_by(MeterReading.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [reading.to_dict() for reading in readings],
            'count': len(readings),
            'meter_id': meter_id
        })
        
    except Exception as e:
        logger.error(f"Error getting meter readings: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get active alerts across all meters"""
    try:
        # Get query parameters
        meter_id = request.args.get('meter_id')
        severity = request.args.get('severity')
        acknowledged = request.args.get('acknowledged', type=bool)
        limit = request.args.get('limit', 50, type=int)
        
        # Build query
        query = Alert.query
        
        if meter_id:
            query = query.filter_by(meter_id=meter_id)
        if severity:
            query = query.filter_by(severity=severity)
        if acknowledged is not None:
            query = query.filter_by(acknowledged=acknowledged)
        
        alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': [alert.to_dict() for alert in alerts],
            'count': len(alerts),
            'filters': {
                'meter_id': meter_id,
                'severity': severity,
                'acknowledged': acknowledged
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        alert = Alert.query.get_or_404(alert_id)
        alert.acknowledged = True
        db.session.commit()
        
        # Emit WebSocket event
        socketio.emit('alert_acknowledged', {
            'alert_id': alert_id,
            'meter_id': alert.meter_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        return jsonify({
            'success': True,
            'data': alert.to_dict(),
            'message': 'Alert acknowledged successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error acknowledging alert: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analytics/dashboard/<meter_id>', methods=['GET'])
def get_dashboard_analytics(meter_id):
    """Get comprehensive dashboard analytics for a meter"""
    try:
        # Get time range
        days = request.args.get('days', 7, type=int)
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Get readings
        readings = MeterReading.query.filter(
            MeterReading.meter_id == meter_id,
            MeterReading.timestamp >= start_date
        ).order_by(MeterReading.timestamp.asc()).all()
        
        # Get health records
        health_records = HealthRecord.query.filter(
            HealthRecord.meter_id == meter_id,
            HealthRecord.timestamp >= start_date
        ).order_by(HealthRecord.timestamp.asc()).all()
        
        # Calculate analytics
        analytics = calculate_analytics(readings, health_records)
        
        return jsonify({
            'success': True,
            'data': {
                'meter_id': meter_id,
                'time_range': f'{days} days',
                'analytics': analytics,
                'readings_count': len(readings),
                'health_records_count': len(health_records)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting dashboard analytics: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/predict/failure/<meter_id>', methods=['GET'])
def predict_failure(meter_id):
    """Get failure prediction for a specific meter"""
    try:
        # Get latest data
        latest_reading = MeterReading.query.filter_by(meter_id=meter_id).order_by(MeterReading.timestamp.desc()).first()
        
        if not latest_reading:
            return jsonify({'success': False, 'error': 'No data available for prediction'}), 404
        
        # Get historical data
        historical_readings = MeterReading.query.filter_by(meter_id=meter_id).order_by(MeterReading.timestamp.desc()).limit(100).all()
        
        # Run prediction analysis
        agentic_system = SmartMeterAgenticSystem()
        data = latest_reading.to_dict()
        data.update({
            'operating_hours': calculate_operating_hours(meter_id),
            'surge_count': get_surge_count(meter_id)
        })
        
        historical_data = [reading.to_dict() for reading in historical_readings]
        analysis_result = agentic_system.analyze_meter(meter_id, data, historical_data)
        
        # Enhanced prediction analysis
        enhanced_prediction = enhance_failure_prediction(meter_id, analysis_result, historical_data)
        
        return jsonify({
            'success': True,
            'data': {
                'meter_id': meter_id,
                'prediction': enhanced_prediction,
                'confidence': analysis_result.get('confidence', 80),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error predicting failure: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/maintenance/schedule', methods=['GET'])
def get_maintenance_schedule():
    """Get maintenance schedule for all meters or specific meter"""
    try:
        meter_id = request.args.get('meter_id')
        days_ahead = request.args.get('days', 30, type=int)
        
        # Get meters to analyze
        if meter_id:
            meters = SmartMeter.query.filter_by(id=meter_id).all()
        else:
            meters = SmartMeter.query.filter_by(status='active').all()
        
        maintenance_schedule = []
        
        for meter in meters:
            # Get latest health record
            latest_health = HealthRecord.query.filter_by(meter_id=meter.id).order_by(HealthRecord.timestamp.desc()).first()
            
            if latest_health:
                # Extract maintenance recommendations
                recommendations = json.loads(latest_health.recommendations) if latest_health.recommendations else []
                
                for rec in recommendations:
                    if rec.get('priority') in ['urgent', 'high']:
                        maintenance_schedule.append({
                            'meter_id': meter.id,
                            'meter_name': meter.name,
                            'task': rec.get('action', 'Maintenance required'),
                            'priority': rec.get('priority', 'medium'),
                            'estimated_cost': rec.get('cost', 0),
                            'timeframe': rec.get('timeframe', '30 days'),
                            'expected_improvement': rec.get('expected_improvement', 10),
                            'health_score': latest_health.overall_health_score
                        })
        
        # Sort by priority and health score
        maintenance_schedule.sort(key=lambda x: (
            0 if x['priority'] == 'urgent' else 1 if x['priority'] == 'high' else 2,
            x['health_score']
        ))
        
        return jsonify({
            'success': True,
            'data': maintenance_schedule[:20],  # Limit to top 20
            'total_meters_analyzed': len(meters),
            'urgent_tasks': len([task for task in maintenance_schedule if task['priority'] == 'urgent']),
            'high_priority_tasks': len([task for task in maintenance_schedule if task['priority'] == 'high'])
        })
        
    except Exception as e:
        logger.error(f"Error getting maintenance schedule: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    """User authentication"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Simple authentication (in production, use proper password hashing)
        if username == 'admin' and password == 'admin123':
            access_token = create_access_token(identity=username)
            return jsonify({
                'success': True,
                'access_token': access_token,
                'user': {'username': username, 'role': 'admin'}
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Error in login: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Utility functions
def generate_alerts(meter_id, data, analysis_result):
    """Generate alerts based on analysis results"""
    alerts = []
    
    # Temperature alerts
    if data.get('temperature', 25) > 65:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='temperature',
            severity='critical' if data['temperature'] > 75 else 'warning',
            message=f"High temperature detected: {data['temperature']:.1f}°C",
            related_metric='temperature',
            threshold_value=65,
            actual_value=data['temperature']
        ))
    
    # Power quality alerts
    if data.get('thdv', 0) > 5:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='power_quality',
            severity='warning',
            message=f"High harmonic distortion: {data['thdv']:.1f}% THD-V",
            related_metric='thdv',
            threshold_value=5.0,
            actual_value=data['thdv']
        ))
    
    # Contact resistance alerts
    if data.get('contact_resistance', 0) > 0.1:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='relay_health',
            severity='critical',
            message=f"High contact resistance: {data['contact_resistance']:.3f}Ω",
            related_metric='contact_resistance',
            threshold_value=0.1,
            actual_value=data['contact_resistance']
        ))
    
    # Low power factor alerts
    if data.get('power_factor', 0.95) < 0.85:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='power_factor',
            severity='warning',
            message=f"Low power factor: {data['power_factor']:.3f}",
            related_metric='power_factor',
            threshold_value=0.85,
            actual_value=data['power_factor']
        ))
    
    # Health score alerts
    health_score = analysis_result.get('overall_health_score', 100)
    if health_score < 40:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='health',
            severity='critical',
            message=f"Critical health status: {health_score:.1f}% health score",
            related_metric='health_score',
            threshold_value=40,
            actual_value=health_score
        ))
    elif health_score < 60:
        alerts.append(Alert(
            meter_id=meter_id,
            alert_type='health',
            severity='warning',
            message=f"Poor health status: {health_score:.1f}% health score",
            related_metric='health_score',
            threshold_value=60,
            actual_value=health_score
        ))
    
    return alerts

def calculate_operating_hours(meter_id):
    """Calculate operating hours for a meter"""
    meter = db.session.get(SmartMeter, meter_id)
    if meter and meter.installation_date:
        # Ensure both datetimes are timezone-aware for comparison
        installation_date = meter.installation_date
        if installation_date.tzinfo is None:
            # If installation_date is naive, assume it's UTC
            installation_date = installation_date.replace(tzinfo=timezone.utc)
        
        current_time = datetime.now(timezone.utc)
        delta = current_time - installation_date
        return delta.total_seconds() / 3600  # Convert to hours
    return 0

def get_surge_count(meter_id):
    """Get surge count for a meter"""
    # In real implementation, would track surge events
    return Alert.query.filter_by(meter_id=meter_id, alert_type='surge').count()

def calculate_analytics(readings, health_records):
    """Calculate comprehensive analytics"""
    if not readings:
        return {}
    
    analytics = {
        'power_consumption': {
            'average': float(np.mean([r.power_active for r in readings])),
            'peak': max([r.power_active for r in readings]),
            'minimum': min([r.power_active for r in readings]),
            'total_kwh': sum([r.power_active for r in readings]) / 1000 * len(readings) / (24 * 60)  # Rough estimate
        },
        'power_quality': {
            'average_thdv': float(np.mean([r.thdv for r in readings if r.thdv])),
            'max_thdv': max([r.thdv for r in readings if r.thdv], default=0),
            'average_power_factor': float(np.mean([r.power_factor for r in readings if r.power_factor])),
            'voltage_stability': float(np.std([r.voltage_rms for r in readings if r.voltage_rms]))
        },
        'equipment_health': {
            'average_temperature': float(np.mean([r.temperature for r in readings if r.temperature])),
            'max_temperature': max([r.temperature for r in readings if r.temperature], default=0),
            'contact_resistance_trend': float(np.mean([r.contact_resistance for r in readings if r.contact_resistance]))
        }
    }
    
    if health_records:
        analytics['health_trends'] = {
            'current_health': health_records[-1].overall_health_score if health_records else 0,
            'health_trend': 'improving' if len(health_records) > 1 and health_records[-1].overall_health_score > health_records[0].overall_health_score else 'stable',
            'average_health': float(np.mean([h.overall_health_score for h in health_records])),
            'failure_probability': health_records[-1].failure_probability if health_records else 0
        }
    
    return analytics

def enhance_failure_prediction(meter_id, analysis_result, historical_data):
    """Enhanced failure prediction with additional insights"""
    prediction = {
        'failure_probability': analysis_result.get('failure_probability', 30),
        'risk_level': analysis_result.get('risk_level', 'medium'),
        'time_to_failure': 'Unknown',
        'critical_factors': [],
        'recommended_actions': [],
        'cost_impact': 0
    }
    
    # Calculate time to failure based on degradation rate
    if historical_data and len(historical_data) > 5:
        # Simple linear regression on health scores
        health_scores = []
        timestamps = []
        
        for record in historical_data[-10:]:  # Last 10 records
            if 'overall_health_score' in record:
                health_scores.append(record['overall_health_score'])
                timestamps.append(record.get('timestamp', datetime.now(timezone.utc).isoformat()))
        
        if len(health_scores) > 2:
            # Calculate degradation rate
            degradation_rate = (health_scores[0] - health_scores[-1]) / len(health_scores)
            
            if degradation_rate > 0:
                current_health = health_scores[-1] if health_scores else 70
                days_to_critical = (current_health - 20) / degradation_rate if degradation_rate > 0 else 365
                prediction['time_to_failure'] = f"{int(max(30, days_to_critical))} days"
            else:
                prediction['time_to_failure'] = "> 1 year"
    
    # Identify critical factors
    failure_prob = prediction['failure_probability']
    if failure_prob > 50:
        prediction['critical_factors'].extend(['High failure probability', 'Multiple system degradation'])
    if failure_prob > 30:
        prediction['critical_factors'].append('Accelerated maintenance required')
    
    # Cost impact estimation
    if prediction['risk_level'] == 'critical':
        prediction['cost_impact'] = 5000  # Emergency replacement cost
    elif prediction['risk_level'] == 'high':
        prediction['cost_impact'] = 2000  # Planned replacement cost
    else:
        prediction['cost_impact'] = 500   # Preventive maintenance cost
    
    return prediction

# Background task for continuous monitoring
def continuous_monitoring():
    """Background task for continuous meter monitoring"""
    while True:
        try:
            # Use application context for database operations
            with app.app_context():
                # Get all active meters
                active_meters = SmartMeter.query.filter_by(status='active').all()
                
                for meter in active_meters:
                    # Get latest reading
                    latest_reading = MeterReading.query.filter_by(meter_id=meter.id).order_by(MeterReading.timestamp.desc()).first()
                    
                    if latest_reading:
                        # Check if data is recent (within last hour)
                        reading_timestamp = latest_reading.timestamp
                        if reading_timestamp.tzinfo is None:
                            # If reading timestamp is naive, assume it's UTC
                            reading_timestamp = reading_timestamp.replace(tzinfo=timezone.utc)
                        
                        current_time = datetime.now(timezone.utc)
                        if (current_time - reading_timestamp).seconds < 3600:
                            # Simulate real-time data processing
                            data = latest_reading.to_dict()
                            data.update({
                                'operating_hours': calculate_operating_hours(meter.id),
                                'surge_count': get_surge_count(meter.id)
                            })
                            
                            # Run agentic analysis
                            agentic_system = SmartMeterAgenticSystem()
                            analysis_result = agentic_system.analyze_meter(meter.id, data)
                            
                            # Emit real-time updates
                            socketio.emit('meter_status_update', {
                                'meter_id': meter.id,
                                'health_score': analysis_result.get('overall_health_score', 70),
                                'risk_level': analysis_result.get('risk_level', 'medium'),
                                'timestamp': datetime.now(timezone.utc).isoformat()
                            })
            
            # Sleep for 5 minutes
            time.sleep(300)
            
        except Exception as e:
            logger.error(f"Error in continuous monitoring: {e}")
            time.sleep(60)  # Sleep for 1 minute on error

# Start background monitoring
def start_background_monitoring():
    """Start background monitoring in a separate thread"""
    monitoring_thread = Thread(target=continuous_monitoring)
    monitoring_thread.daemon = True
    monitoring_thread.start()

# Database initialization
def initialize_database():
    """Initialize database tables and sample data"""
    with app.app_context():
        db.create_all()

        # Create sample meters if none exist
        if SmartMeter.query.count() == 0:
            sample_meters = [
                SmartMeter(
                    id='METER-001',
                    name='Industrial Plant A - Main Feed',
                    location='Building A, Floor 1',
                    meter_type='industrial',
                    installation_date=datetime.now(timezone.utc) - timedelta(days=365)
                ),
                SmartMeter(
                    id='METER-002',
                    name='Commercial Building B - HVAC',
                    location='Building B, Mechanical Room',
                    meter_type='commercial',
                    installation_date=datetime.now(timezone.utc) - timedelta(days=730)
                ),
                SmartMeter(
                    id='METER-003',
                    name='Residential Complex C - Main Distribution',
                    location='Complex C, Electrical Room',
                    meter_type='residential',
                    installation_date=datetime.now(timezone.utc) - timedelta(days=1095)
                )
            ]

            for meter in sample_meters:
                db.session.add(meter)
            db.session.commit()

            logger.info("Sample meters created")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'success': False, 'error': 'Bad request'}), 400

# Main application runner
if __name__ == '__main__':
    # Initialize database
    initialize_database()

    # Start background monitoring
    start_background_monitoring()

    # Run the Flask application
    socketio.run(
        app,
        host='127.0.0.1',
        port=5000,
        debug=True,
        use_reloader=False  # Disable reloader to prevent duplicate background tasks
    )