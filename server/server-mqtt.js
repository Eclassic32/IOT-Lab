require('dotenv').config();

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
// Subscribe to cleaned ESP32 values. Default to sensor namespace and ignore status subtopics
function normalizeMqttTopic(input) {
  let t = (input || '').trim();
  if (!t) return 'weight/sensor/#';
  // If no wildcard present, subscribe to everything under the path
  if (!/[#+]/.test(t)) {
    if (!t.endsWith('/')) t = t + '/';
    t = t + '#';
  }
  return t;
}
const MQTT_TOPIC = normalizeMqttTopic(process.env.MQTT_TOPIC || 'weight/sensor/#');
const MQTT_CLIENT_ID = 'iot-weight-server-' + Math.random().toString(16).slice(2, 8);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Store weight history on server
const weightHistory = [];
const MAX_HISTORY_MINUTES = parseInt(process.env.MAX_HISTORY_MINUTES) || 5;
// Track latest status per device (stable/unstable/boot/tare)
const deviceStatus = new Map();

// Item counting configuration per device
const itemCountingConfig = new Map();
// Item counting state per device
const itemCountingState = new Map();

// Default item counting configuration
const defaultItemConfig = {
  singleItemMass: 0.1, // kg
  initialItemCount: 0,
  containerMass: 0, // kg
  errorRangeMin: -0.05, // kg
  errorRangeMax: 0.05, // kg
  enableAdding: true,
  enableRemoving: true
};

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
    const raw = message.toString();

    const parts = topic.split('/');
    // For weight topic: weight/sensor/<DEVICE_ID>
    // For status topic: weight/sensor/<DEVICE_ID>/status
    const isStatusTopic = topic.endsWith('/status');
    const deviceId = isStatusTopic
      ? (parts.length >= 3 ? parts[parts.length - 2] : 'WEIGHT_SCALE_001')
      : (parts[parts.length - 1] || 'WEIGHT_SCALE_001');

    // Handle status subtopics and keep latest flag per device
    if (isStatusTopic) {
      const status = (raw || '').toString().trim().toLowerCase();
      deviceStatus.set(deviceId, status);
      console.log(`ℹ️  MQTT status [${deviceId}]: ${status}`);
      // Also notify clients of status updates
      io.emit('device-status', { deviceId, status, timestamp, topic });
      return;
    }

    // Expect cleaned numeric payload from ESP32 (e.g. "75.50")
    const weightKg = (() => {
      const n = parseFloat(raw);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;
      const m = raw.match(/(\d+\.?\d*)/);
      return m ? parseFloat(m[1]) : null;
    })();

    const statusFlag = (deviceStatus.get(deviceId) || 'unknown');
    console.log(`📥 MQTT [${topic}]: ${raw}${weightKg != null ? ` → ${weightKg.toFixed(2)} kg` : ''}`);

    // Calculate item count if configuration exists
    let itemCount = null;
    let itemCountChange = 0;
    if (weightKg != null) {
      const config = itemCountingConfig.get(deviceId) || defaultItemConfig;
      const state = itemCountingState.get(deviceId) || { lastStableWeight: null, currentItemCount: config.initialItemCount };
      
      if (statusFlag === 'stable') {
        if (state.lastStableWeight !== null) {
          const weightDifference = weightKg - state.lastStableWeight;
          const netWeight = weightKg - config.containerMass;
          
          // Check if weight change is significant enough (outside error range)
          if (Math.abs(weightDifference) > Math.max(Math.abs(config.errorRangeMin), Math.abs(config.errorRangeMax))) {
            // Calculate expected item count change
            const expectedChange = Math.round(weightDifference / config.singleItemMass);
            
            // Apply change based on toggles
            if ((expectedChange > 0 && config.enableAdding) || (expectedChange < 0 && config.enableRemoving)) {
              state.currentItemCount += expectedChange;
              state.currentItemCount = Math.max(0, state.currentItemCount); // Prevent negative count
              itemCountChange = expectedChange;
            }
          }
          
          // Update last stable weight
          state.lastStableWeight = weightKg;
        } else {
          // First stable reading - initialize
          state.lastStableWeight = weightKg;
          const netWeight = weightKg - config.containerMass;
          state.currentItemCount = Math.max(0, Math.round(netWeight / config.singleItemMass));
        }
        
        itemCount = state.currentItemCount;
        itemCountingState.set(deviceId, state);
      } else {
        // For unstable readings, just calculate theoretical count
        const netWeight = weightKg - config.containerMass;
        itemCount = Math.max(0, Math.round(netWeight / config.singleItemMass));
      }
    }

    const enrichedData = {
      deviceId,
      deviceType: 'Weight Scale',
      data: raw,
      weightKg: weightKg != null ? weightKg : undefined,
      status: statusFlag,
      timestamp,
      topic,
      itemCount: itemCount,
      itemCountChange: itemCountChange
    };

    // Always broadcast to UI so it can show current reading & status
    io.emit('iot-data', enrichedData);

    // Only persist to history if stable
    if (statusFlag === 'stable' && weightKg != null) {
      weightHistory.push(enrichedData);
    }
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

  // Handle item counting configuration requests
  socket.on('get-item-config', (deviceId = 'WEIGHT_SCALE_001') => {
    const config = itemCountingConfig.get(deviceId) || defaultItemConfig;
    const state = itemCountingState.get(deviceId) || { lastStableWeight: null, currentItemCount: config.initialItemCount };
    
    socket.emit('item-config', {
      deviceId,
      config,
      state: {
        currentItemCount: state.currentItemCount,
        lastStableWeight: state.lastStableWeight
      }
    });
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

// Item counting configuration endpoints
app.get('/api/item-config/:deviceId?', (req, res) => {
  const deviceId = req.params.deviceId || 'WEIGHT_SCALE_001';
  const config = itemCountingConfig.get(deviceId) || defaultItemConfig;
  const state = itemCountingState.get(deviceId) || { lastStableWeight: null, currentItemCount: config.initialItemCount };
  
  res.json({
    deviceId,
    config,
    state: {
      currentItemCount: state.currentItemCount,
      lastStableWeight: state.lastStableWeight
    }
  });
});

app.post('/api/item-config/:deviceId?', (req, res) => {
  const deviceId = req.params.deviceId || 'WEIGHT_SCALE_001';
  const config = {
    singleItemMass: parseFloat(req.body.singleItemMass) || defaultItemConfig.singleItemMass,
    initialItemCount: parseInt(req.body.initialItemCount) || defaultItemConfig.initialItemCount,
    containerMass: parseFloat(req.body.containerMass) || defaultItemConfig.containerMass,
    errorRangeMin: parseFloat(req.body.errorRangeMin) || defaultItemConfig.errorRangeMin,
    errorRangeMax: parseFloat(req.body.errorRangeMax) || defaultItemConfig.errorRangeMax,
    enableAdding: req.body.enableAdding !== undefined ? Boolean(req.body.enableAdding) : defaultItemConfig.enableAdding,
    enableRemoving: req.body.enableRemoving !== undefined ? Boolean(req.body.enableRemoving) : defaultItemConfig.enableRemoving
  };
  
  // Validate configuration
  if (config.singleItemMass <= 0) {
    return res.status(400).json({ error: 'Single item mass must be greater than 0' });
  }
  if (config.initialItemCount < 0) {
    return res.status(400).json({ error: 'Initial item count cannot be negative' });
  }
  if (config.containerMass < 0) {
    return res.status(400).json({ error: 'Container mass cannot be negative' });
  }
  
  itemCountingConfig.set(deviceId, config);
  
  // Reset state for this device
  const state = { lastStableWeight: null, currentItemCount: config.initialItemCount };
  itemCountingState.set(deviceId, state);
  
  // Notify all clients of configuration change
  io.emit('item-config-updated', { deviceId, config, state });
  
  res.json({ deviceId, config, state });
});

app.post('/api/reset-item-count/:deviceId?', (req, res) => {
  const deviceId = req.params.deviceId || 'WEIGHT_SCALE_001';
  const config = itemCountingConfig.get(deviceId) || defaultItemConfig;
  const newCount = parseInt(req.body.itemCount) || 0;
  
  if (newCount < 0) {
    return res.status(400).json({ error: 'Item count cannot be negative' });
  }
  
  const state = itemCountingState.get(deviceId) || { lastStableWeight: null, currentItemCount: config.initialItemCount };
  state.currentItemCount = newCount;
  itemCountingState.set(deviceId, state);
  
  // Notify all clients of count reset
  io.emit('item-count-reset', { deviceId, itemCount: newCount });
  
  res.json({ deviceId, itemCount: newCount });
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

// Forced shutdown: immediately terminate sockets and MQTT on Ctrl+C / SIGTERM
const activeSockets = new Set();
server.on('connection', (socket) => {
  activeSockets.add(socket);
  socket.on('close', () => activeSockets.delete(socket));
});

function shutdownImmediate(signal) {
  console.log(`\n🛑 Received ${signal}. Forcing shutdown...`);
  try {
    if (io && io.close) io.close();
  } catch (e) {}
  try {
    if (mqttClient) mqttClient.end(true);
  } catch (e) {}
  try {
    server.close();
  } catch (e) {}
  activeSockets.forEach((s) => {
    try { s.destroy(); } catch (_) {}
  });
  setTimeout(() => process.exit(0), 100);
}

['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => shutdownImmediate(sig));
});