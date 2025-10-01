# IoT Weight Monitor

A complete real-time weight monitoring system with multiple communication protocols (Socket.IO and MQTT), featuring a modern web dashboard with live graphs and data persistence.

## 🚀 Features

- **Real-time Monitoring**: Live weight display with 1-second updates
- **5-Minute Graph**: Interactive Chart.js graph with historical data
- **Dual Protocol Support**: 
  - Socket.IO (WebSocket) for direct connections
  - MQTT for IoT standard protocol
- **Server-Side Persistence**: Data survives page refreshes
- **Connection Monitoring**: Visual status indicators
- **Activity Logging**: Comprehensive event logging
- **CSV Export**: Download historical data
- **Responsive Design**: Beautiful UI that works on all devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MQTT Broker (optional, for MQTT version):
  - Local: Mosquitto, EMQX, HiveMQ
  - Or use public test broker

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd IOT-Lab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to configure your setup. See [CONFIGURATION.md](CONFIGURATION.md) for details.

## 🎯 Quick Start

### Socket.IO Version (Simplest)

```bash
# Terminal 1 - Start server
npm start

# Terminal 2 - Start weight sensor
npm run weight

# Browser - Open dashboard
http://localhost:3000
```

### MQTT Version (IoT Standard)

```bash
# Terminal 1 - Start MQTT server
npm run start:mqtt

# Terminal 2 - Start MQTT weight sensor
npm run mqtt:device

# Browser - Open dashboard
http://localhost:3000
```

See [QUICKSTART-MQTT.md](QUICKSTART-MQTT.md) for detailed MQTT setup.

## 📁 Project Structure

```
IOT-Lab/
├── server/
│   ├── server.js              # Socket.IO server
│   └── server-mqtt.js         # MQTT to WebSocket bridge
├── device/
│   ├── weight-sensor.js       # Socket.IO weight sensor
│   └── mqtt-weight-sensor.js  # MQTT weight sensor
├── public/
│   ├── index.html             # Web dashboard
│   ├── styles.css             # Styling
│   └── app.js                 # Frontend logic
├── .env.example               # Environment template
├── .env                       # Your configuration (git-ignored)
└── package.json               # Dependencies
```

## 🎮 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Socket.IO server |
| `npm run start:mqtt` | Start MQTT-to-WebSocket server |
| `npm run dev` | Development mode with auto-restart (Socket.IO) |
| `npm run dev:mqtt` | Development mode with auto-restart (MQTT) |
| `npm run weight` | Start Socket.IO weight sensor simulator |
| `npm run mqtt:device` | Start MQTT weight sensor simulator |

## ⚙️ Configuration

Environment variables in `.env`:

```env
PORT=3000                                    # Server port
MQTT_BROKER=mqtt://test.mosquitto.org:1883  # MQTT broker URL
MQTT_TOPIC=weight/sensor/#                  # MQTT topic pattern
DEVICE_ID=WEIGHT_SCALE_001                  # Device identifier
MAX_HISTORY_MINUTES=5                       # Data retention time
```

See [CONFIGURATION.md](CONFIGURATION.md) for complete configuration guide.

## 📚 Documentation

- [README-MQTT.md](README-MQTT.md) - MQTT implementation details
- [README-WEIGHT.md](README-WEIGHT.md) - Weight monitoring system details
- [CONFIGURATION.md](CONFIGURATION.md) - Complete configuration guide
- [QUICKSTART-MQTT.md](QUICKSTART-MQTT.md) - MQTT quick start guide

## 🔌 Connecting Real IoT Devices

### MQTT (Recommended for IoT)

**ESP32/Arduino:**
```cpp
#include <WiFi.h>
#include <PubSubClient.h>

const char* mqtt_server = "your-server-ip";
const char* topic = "weight/sensor/SCALE_001";

void loop() {
  float weight = readScale(); // Your sensor code
  char msg[10];
  dtostrf(weight, 6, 2, msg);
  client.publish(topic, msg);
  delay(1000);
}
```

**Raspberry Pi/Python:**
```python
import paho.mqtt.client as mqtt

client = mqtt.Client()
client.connect("localhost", 1883)

while True:
    weight = read_weight_sensor()  # Your sensor code
    client.publish("weight/sensor/SCALE_001", str(weight))
    time.sleep(1)
```

### Socket.IO

**JavaScript/Node.js:**
```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3000');

socket.emit('register-device', {
  deviceId: 'SCALE_001',
  deviceType: 'Weight Scale'
});

setInterval(() => {
  const weight = readWeightSensor();
  socket.emit('device-data', weight.toString());
}, 1000);
```

## 🌐 API Endpoints

### Health Check
```
GET /api/health
```

Returns server status and statistics.

### Historical Data (MQTT version)
```
GET /api/history
```

Returns last 5 minutes of weight data.

## 🏗️ Architecture

### Socket.IO Version
```
Device (Socket.IO) → Server (WebSocket) → Web Dashboard
```

### MQTT Version
```
Device (MQTT) → MQTT Broker → Server (Bridge) → Web Dashboard (WebSocket)
```

## 🔒 Security

For production deployment:

- ✅ Use HTTPS/WSS
- ✅ Enable authentication
- ✅ Use secure MQTT (mqtts://)
- ✅ Implement access control
- ✅ Keep `.env` out of version control
- ✅ Use strong passwords
- ✅ Enable TLS certificates

## 🐛 Troubleshooting

### Port already in use
```powershell
# Windows - Find and kill process on port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### MQTT connection failed
1. Check MQTT broker is running
2. Verify broker URL in `.env`
3. Test with public broker: `mqtt://test.mosquitto.org:1883`

### No data appearing
1. Check browser console for errors
2. Verify device is connected (check server logs)
3. Ensure topic patterns match (MQTT)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 👨‍💻 Development

Auto-restart during development:

```bash
npm run dev        # Socket.IO version
npm run dev:mqtt   # MQTT version
```

## 🎨 Features in Detail

- **Large Weight Display**: 8rem font size, center-positioned
- **Live Graph**: Chart.js with 300 data points (5 minutes × 60 seconds)
- **Server Persistence**: Data stored in server memory
- **Auto-cleanup**: Old data automatically removed after 5 minutes
- **Dual Status**: Separate indicators for WebSocket and MQTT
- **Export Functionality**: Download logs as CSV
- **Responsive Design**: Glassmorphism UI with gradient background

## 📊 Data Format

Weight data should be sent as a string:
```
"75.50"
```

The system will parse and display it automatically.

## 🔄 Comparison: Socket.IO vs MQTT

| Feature | Socket.IO | MQTT |
|---------|-----------|------|
| Setup Complexity | Simple | Requires broker |
| Protocol Standard | Proprietary | IoT standard |
| Scalability | Medium | High |
| Reliability | Good | Excellent |
| IoT Integration | Custom | Native |
| Message Queuing | No | Yes |
| Offline Messages | No | Yes (with broker) |
| Best Use Case | Direct connections | IoT deployments |

## 📞 Support

For issues and questions:
1. Check documentation files
2. Review server/device logs
3. Test with simulators first
4. Verify environment configuration

---

Made with ❤️ for IoT weight monitoring