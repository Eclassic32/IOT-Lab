require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Store connected devices and their latest data
const connectedDevices = new Map();
const deviceData = new Map();
const weightHistory = []; // Store weight history on server
const MAX_HISTORY_MINUTES = parseInt(process.env.MAX_HISTORY_MINUTES) || 5;

// Function to clean old data from history
function cleanOldData() {
  const cutoffTime = Date.now() - (MAX_HISTORY_MINUTES * 60 * 1000);
  while (weightHistory.length > 0 && new Date(weightHistory[0].timestamp).getTime() < cutoffTime) {
    weightHistory.shift();
  }
}

// Clean old data every 10 seconds
setInterval(cleanOldData, 10000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle device registration
  socket.on('register-device', (deviceInfo) => {
    console.log(`Device registered: ${deviceInfo.deviceId} (${deviceInfo.deviceType})`);
    connectedDevices.set(socket.id, {
      deviceId: deviceInfo.deviceId,
      deviceType: deviceInfo.deviceType,
      connectedAt: new Date().toISOString()
    });
    
    // Notify all web clients about new device
    socket.broadcast.emit('device-connected', {
      socketId: socket.id,
      ...deviceInfo,
      connectedAt: new Date().toISOString()
    });
  });

  // Handle data from IoT devices
  socket.on('device-data', (data) => {
    const deviceInfo = connectedDevices.get(socket.id);
    if (deviceInfo) {
      const enrichedData = {
        deviceId: deviceInfo.deviceId,
        deviceType: deviceInfo.deviceType,
        data: data,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      };
      
      // Store the latest data for this device
      deviceData.set(deviceInfo.deviceId, enrichedData);
      
      // Store in weight history (server-side persistence)
      weightHistory.push(enrichedData);
      
      console.log(`Data from ${deviceInfo.deviceId}:`, data);
      
      // Broadcast to all web clients
      io.emit('iot-data', enrichedData);
    }
  });

  // Handle web client requests for device list
  socket.on('get-devices', () => {
    const devices = Array.from(connectedDevices.entries()).map(([socketId, deviceInfo]) => ({
      socketId,
      ...deviceInfo
    }));
    socket.emit('devices-list', devices);
  });

  // Handle web client requests for latest data
  socket.on('get-latest-data', (deviceId) => {
    const latestData = deviceData.get(deviceId);
    if (latestData) {
      socket.emit('latest-data', latestData);
    }
  });

  // Handle web client requests for weight history
  socket.on('get-weight-history', () => {
    cleanOldData(); // Clean before sending
    socket.emit('weight-history', weightHistory);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const deviceInfo = connectedDevices.get(socket.id);
    if (deviceInfo) {
      console.log(`Device disconnected: ${deviceInfo.deviceId}`);
      connectedDevices.delete(socket.id);
      deviceData.delete(deviceInfo.deviceId);
      
      // Notify all web clients about device disconnection
      io.emit('device-disconnected', {
        socketId: socket.id,
        deviceId: deviceInfo.deviceId
      });
    } else {
      console.log(`Web client disconnected: ${socket.id}`);
    }
  });
});

// Basic route for health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    connectedDevices: connectedDevices.size,
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`IoT Server running on port ${PORT}`);
  console.log(`Web interface: http://localhost:${PORT}`);
  console.log(`Devices can connect to: ws://localhost:${PORT}`);
});