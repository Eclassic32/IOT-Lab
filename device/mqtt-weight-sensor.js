const mqtt = require('mqtt');

class MQTTWeightSensor {
    constructor(deviceId = 'WEIGHT_SCALE_001', brokerUrl = 'mqtt://localhost:1883') {
        this.deviceId = deviceId;
        this.brokerUrl = brokerUrl;
        this.topic = `weight/sensor/${deviceId}`;
        this.client = null;
        this.isConnected = false;
        this.dataInterval = null;
        this.currentWeight = 0;
    }

    connect() {
        console.log(`🔌 Connecting to MQTT broker: ${this.brokerUrl}`);
        console.log(`📮 Publishing to topic: ${this.topic}`);
        
        this.client = mqtt.connect(this.brokerUrl, {
            clientId: `weight-sensor-${this.deviceId}-${Math.random().toString(16).slice(2, 8)}`,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30000,
        });

        this.client.on('connect', () => {
            console.log(`✅ ${this.deviceId} connected to MQTT broker`);
            this.isConnected = true;
            this.startPublishing();
        });

        this.client.on('error', (error) => {
            console.log(`🔥 MQTT connection error: ${error.message}`);
            this.isConnected = false;
        });

        this.client.on('disconnect', () => {
            console.log(`❌ ${this.deviceId} disconnected from MQTT broker`);
            this.isConnected = false;
            this.stopPublishing();
        });

        this.client.on('offline', () => {
            console.log(`📴 ${this.deviceId} is offline`);
            this.isConnected = false;
        });

        this.client.on('reconnect', () => {
            console.log(`🔄 ${this.deviceId} reconnecting...`);
        });
    }

    publishData(data) {
        if (this.isConnected && this.client) {
            this.client.publish(this.topic, data, { qos: 0 }, (err) => {
                if (err) {
                    console.log(`⚠️  Failed to publish: ${err.message}`);
                } else {
                    console.log(`📤 Published: ${data} kg`);
                }
            });
        } else {
            console.log(`⚠️  ${this.deviceId} not connected - data not published`);
        }
    }

    startPublishing() {
        // Initialize with a random starting weight
        this.currentWeight = Math.random() * 30 + 60; // 60-90 kg
        
        console.log('📡 Starting to publish weight data every 1 second...\n');
        
        // Publish weight data every 1 second
        this.dataInterval = setInterval(() => {
            const weightData = this.generateWeightData();
            this.publishData(weightData);
        }, 1000);
    }

    stopPublishing() {
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
        
        // Return weight as string (just the number)
        return this.currentWeight.toFixed(2);
    }

    disconnect() {
        console.log(`\n🔌 Disconnecting ${this.deviceId}...`);
        this.stopPublishing();
        if (this.client) {
            this.client.end(() => {
                console.log(`👋 ${this.deviceId} disconnected`);
            });
        }
    }
}

// Example usage
function startMQTTWeightSensor() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     MQTT Weight Sensor Simulator          ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    // You can customize broker URL via environment variable
    const brokerUrl = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
    const deviceId = process.env.DEVICE_ID || 'WEIGHT_SCALE_001';
    
    const weightSensor = new MQTTWeightSensor(deviceId, brokerUrl);
    weightSensor.connect();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down weight sensor...');
        weightSensor.disconnect();
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    });

    console.log('💡 Tips:');
    console.log('   - Press Ctrl+C to stop');
    console.log('   - Set MQTT_BROKER env variable to use different broker');
    console.log('   - Set DEVICE_ID env variable to change device name\n');
}

// Run if this file is executed directly
if (require.main === module) {
    startMQTTWeightSensor();
}

module.exports = MQTTWeightSensor;