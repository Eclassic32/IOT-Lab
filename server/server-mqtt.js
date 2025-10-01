const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'weight/sensor/#';
const MQTT_CLIENT_ID = 'iot-weight-server-' + Math.random().toString(16).slice(2, 8);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Store weight history on server
const weightHistory = [];
const MAX_HISTORY_MINUTES = 5;

// Function to clean old data from history
function cleanOldData() {
  const cutoffTime = Date.now() - (MAX_HISTORY_MINUTES * 60 * 1000);
  while (weightHistory.length > 0 && new Date(weightHistory[0].timestamp).getTime() < cutoffTime) {
    weightHistory.shift();
  }
}

// Clean old data every 10 seconds
setInterval(cleanOldData, 10000);

// MQTT Client Setup
let mqttClient = null;
let mqttConnected = false;

function connectMQTT() {
  console.log(`🔌 Connecting to MQTT broker: ${MQTT_BROKER}`);
  
  mqttClient = mqtt.connect(MQTT_BROKER, {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    mqttConnected = true;
    
    // Subscribe to weight sensor topic
    mqttClient.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err);
      } else {
        console.log(`📡 Subscribed to topic: ${MQTT_TOPIC}`);
      }
    });
    
    // Notify all connected web clients
    io.emit('mqtt-status', { connected: true, broker: MQTT_BROKER });
  });

  mqttClient.on('message', (topic, message) => {
    const timestamp = new Date().toISOString();
    const data = message.toString();
    
    console.log(`📥 MQTT [${topic}]: ${data}`);
    
    // Create enriched data object
    const enrichedData = {
      deviceId: topic.split('/').pop() || 'WEIGHT_SCALE_001',
      deviceType: 'Weight Scale',
      data: data,
      timestamp: timestamp,
      topic: topic
    };
    
    // Store in weight history
    weightHistory.push(enrichedData);
    
    // Broadcast to all connected web clients via WebSocket
    io.emit('iot-data', enrichedData);
  });

  mqttClient.on('error', (err) => {
    console.error('🔥 MQTT Error:', err.message);
    mqttConnected = false;
    io.emit('mqtt-status', { connected: false, error: err.message });
  });

  mqttClient.on('disconnect', () => {
    console.log('⚠️  Disconnected from MQTT broker');
    mqttConnected = false;
    io.emit('mqtt-status', { connected: false });
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT broker...');
  });

  mqttClient.on('offline', () => {
    console.log('📴 MQTT client is offline');
    mqttConnected = false;
    io.emit('mqtt-status', { connected: false });
  });
}

// Start MQTT connection
connectMQTT();

// WebSocket (Socket.IO) connection handling
io.on('connection', (socket) => {
  console.log(`🌐 Web client connected: ${socket.id}`);
  
  // Send MQTT connection status
  socket.emit('mqtt-status', { 
    connected: mqttConnected, 
    broker: MQTT_BROKER,
    topic: MQTT_TOPIC 
  });

  // Handle web client requests for weight history
  socket.on('get-weight-history', () => {
    cleanOldData(); // Clean before sending
    console.log(`📊 Sending ${weightHistory.length} historical measurements to ${socket.id}`);
    socket.emit('weight-history', weightHistory);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🌐 Web client disconnected: ${socket.id}`);
  });
});

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    mqtt: {
      connected: mqttConnected,
      broker: MQTT_BROKER,
      topic: MQTT_TOPIC
    },
    websocket: {
      connectedClients: io.engine.clientsCount
    },
    dataPoints: weightHistory.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/history', (req, res) => {
  cleanOldData();
  res.json({
    dataPoints: weightHistory.length,
    history: weightHistory
  });
});

// Start server
server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   IoT Weight Monitor - MQTT to WebSocket  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`🌐 Web interface: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📡 MQTT broker: ${MQTT_BROKER}`);
  console.log(`📮 MQTT topic: ${MQTT_TOPIC}`);
  console.log('════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  if (mqttClient) {
    mqttClient.end();
  }
  
  server.close(() => {
    console.log('👋 Server closed. Goodbye!');
    process.exit(0);
  });
});