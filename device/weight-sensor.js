const io = require('socket.io-client');

class WeightSensor {
    constructor(deviceId = 'WEIGHT_SCALE_001', serverUrl = 'http://localhost:3000') {
        this.deviceId = deviceId;
        this.deviceType = 'Weight Scale';
        this.serverUrl = serverUrl;
        this.socket = null;
        this.isConnected = false;
        this.dataInterval = null;
        this.currentWeight = 0;
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
        // Initialize with a random starting weight
        this.currentWeight = Math.random() * 30 + 60; // 60-90 kg
        
        // Send weight data every 1 second
        this.dataInterval = setInterval(() => {
            const weightData = this.generateWeightData();
            this.sendData(weightData);
        }, 1000);
    }

    stopSendingData() {
        if (this.dataInterval) {
            clearInterval(this.dataInterval);
            this.dataInterval = null;
        }
    }

    generateWeightData() {
        // Simulate realistic weight fluctuations
        // Very small random variations for 1-second intervals (-0.05 to +0.05 kg)
        const variation = (Math.random() - 0.5) * 0.1;
        this.currentWeight += variation;
        
        // Keep weight in realistic range (50-100 kg)
        this.currentWeight = Math.max(50, Math.min(100, this.currentWeight));
        
        // Return weight as string (as requested)
        // Format: just the number, can be parsed by frontend
        return this.currentWeight.toFixed(2);
    }

    disconnect() {
        console.log(`🔌 Disconnecting ${this.deviceId}...`);
        this.stopSendingData();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Example usage
function startWeightSensor() {
    console.log('⚖️  Starting Weight Sensor...\n');
    
    const weightSensor = new WeightSensor();
    weightSensor.connect();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down weight sensor...');
        weightSensor.disconnect();
        setTimeout(() => {
            console.log('👋 Weight sensor disconnected. Goodbye!');
            process.exit(0);
        }, 1000);
    });

    console.log('📡 Weight sensor is running. Press Ctrl+C to stop.\n');
}

// Run if this file is executed directly
if (require.main === module) {
    startWeightSensor();
}

module.exports = WeightSensor;