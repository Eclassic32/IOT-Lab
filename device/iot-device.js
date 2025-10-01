const io = require('socket.io-client');

class IoTDevice {
    constructor(deviceId, deviceType, serverUrl = 'http://localhost:3000') {
        this.deviceId = deviceId;
        this.deviceType = deviceType;
        this.serverUrl = serverUrl;
        this.socket = null;
        this.isConnected = false;
        this.dataInterval = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect() {
        console.log(`🔌 Connecting ${this.deviceId} to ${this.serverUrl}...`);
        
        this.socket = io(this.serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.socket.on('connect', () => {
            console.log(`✅ ${this.deviceId} connected successfully`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Register device with server
            this.socket.emit('register-device', {
                deviceId: this.deviceId,
                deviceType: this.deviceType
            });
            
            this.startSendingData();
        });

        this.socket.on('disconnect', () => {
            console.log(`❌ ${this.deviceId} disconnected`);
            this.isConnected = false;
            this.stopSendingData();
        });

        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            console.log(`🔥 Connection error for ${this.deviceId}: ${error.message}`);
            console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.log(`💀 Max reconnection attempts reached for ${this.deviceId}`);
            }
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 ${this.deviceId} reconnected after ${attemptNumber} attempts`);
        });
    }

    sendData(data) {
        if (this.isConnected && this.socket) {
            this.socket.emit('device-data', data);
            console.log(`📤 ${this.deviceId} sent: ${data}`);
        } else {
            console.log(`⚠️  ${this.deviceId} not connected - data not sent: ${data}`);
        }
    }

    startSendingData() {
        // Override this method in subclasses or set custom data generation
        this.dataInterval = setInterval(() => {
            const data = this.generateData();
            this.sendData(data);
        }, 2000); // Send data every 2 seconds
    }

    stopSendingData() {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
            this.dataInterval = null;
        }
    }

    generateData() {
        // Default data generation - override in subclasses or instances
        return `Sample data from ${this.deviceId} at ${new Date().toISOString()}`;
    }

    disconnect() {
        console.log(`🔌 Disconnecting ${this.deviceId}...`);
        this.stopSendingData();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Specific IoT device types
class TemperatureSensor extends IoTDevice {
    constructor(deviceId, serverUrl) {
        super(deviceId, 'Temperature Sensor', serverUrl);
    }

    generateData() {
        const temperature = (Math.random() * 40 + 10).toFixed(1); // 10-50°C
        const humidity = (Math.random() * 60 + 30).toFixed(1); // 30-90%
        return `Temperature: ${temperature}°C, Humidity: ${humidity}%`;
    }
}

class MotionSensor extends IoTDevice {
    constructor(deviceId, serverUrl) {
        super(deviceId, 'Motion Sensor', serverUrl);
    }

    generateData() {
        const motionDetected = Math.random() > 0.7;
        const timestamp = new Date().toLocaleString();
        return `Motion: ${motionDetected ? 'DETECTED' : 'None'} at ${timestamp}`;
    }
}

class SmartMeter extends IoTDevice {
    constructor(deviceId, serverUrl) {
        super(deviceId, 'Smart Meter', serverUrl);
    }

    generateData() {
        const powerUsage = (Math.random() * 5000 + 1000).toFixed(0); // 1000-6000W
        const voltage = (Math.random() * 10 + 220).toFixed(1); // 220-230V
        return `Power: ${powerUsage}W, Voltage: ${voltage}V`;
    }
}

// Example usage and device simulation
function createAndRunDevices() {
    console.log('🚀 Starting IoT Device Simulation...\n');
    
    // Create different types of devices
    const devices = [
        new TemperatureSensor('TEMP_001'),
        new MotionSensor('MOTION_001'),
        new SmartMeter('METER_001')
    ];

    // Add a custom device with string data
    const customDevice = new IoTDevice('CUSTOM_001', 'Custom Sensor');
    customDevice.generateData = () => {
        const readings = [
            'Status: Normal Operation',
            'Alert: Low Battery - 15%',
            'Info: Calibration Complete',
            'Data: pH Level 7.2, Turbidity 0.5 NTU',
            'Warning: High Pressure Detected',
            'Status: Maintenance Required Soon'
        ];
        return readings[Math.floor(Math.random() * readings.length)];
    };
    devices.push(customDevice);

    // Connect all devices
    devices.forEach((device, index) => {
        setTimeout(() => {
            device.connect();
        }, index * 1000); // Stagger connections
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down devices...');
        devices.forEach(device => device.disconnect());
        setTimeout(() => {
            console.log('👋 All devices disconnected. Goodbye!');
            process.exit(0);
        }, 1000);
    });

    // Keep the process running
    console.log('📡 Devices are running. Press Ctrl+C to stop.\n');
}

// Run the simulation if this file is executed directly
if (require.main === module) {
    createAndRunDevices();
}

module.exports = { IoTDevice, TemperatureSensor, MotionSensor, SmartMeter };