# Quick Start - MQTT Weight Monitor

## Without MQTT Broker (Using Public Test Broker)

If you don't have a local MQTT broker, you can use a public one for testing:

### Terminal 1 - Start Server
```powershell
$env:MQTT_BROKER = "mqtt://test.mosquitto.org:1883"
npm run start:mqtt
```

### Terminal 2 - Start Device Simulator
```powershell
$env:MQTT_BROKER = "mqtt://test.mosquitto.org:1883"
npm run mqtt:device
```

### Browser
Open: `http://localhost:3000`

---

## With Local MQTT Broker (Recommended)

### Step 1: Install Mosquitto

**Windows (Chocolatey):**
```powershell
choco install mosquitto
```

**Or download from**: https://mosquitto.org/download/

### Step 2: Start Mosquitto
```powershell
# Start as service (Windows)
net start mosquitto

# Or run directly
mosquitto -v
```

### Step 3: Start Server
```powershell
npm run start:mqtt
```

### Step 4: Start Device Simulator
```powershell
npm run mqtt:device
```

### Step 5: Open Browser
`http://localhost:3000`

---

## Testing MQTT Communication

### Subscribe to weight data:
```powershell
mosquitto_sub -h localhost -t "weight/sensor/#" -v
```

### Publish test data manually:
```powershell
mosquitto_pub -h localhost -t "weight/sensor/TEST" -m "75.50"
```

---

## Key Differences from Socket.IO Version

| Feature | Socket.IO Version | MQTT Version |
|---------|------------------|--------------|
| Device Protocol | Socket.IO (WebSocket) | MQTT |
| Server | Direct WebSocket | MQTT → WebSocket Bridge |
| Broker Required | No | Yes (MQTT Broker) |
| Best For | Direct connections | IoT devices, multiple publishers |
| Scalability | Medium | High |
| Standard Protocol | No | Yes (MQTT is IoT standard) |

## Which Version Should You Use?

**Use Socket.IO version** (`npm start` + `npm run weight`) if:
- Simple setup, no external dependencies
- Direct device-to-server communication
- Few devices

**Use MQTT version** (`npm run start:mqtt` + `npm run mqtt:device`) if:
- Professional IoT deployment
- Multiple devices publishing data
- Need message queuing/persistence
- Standard IoT protocol required
- Integration with existing MQTT infrastructure