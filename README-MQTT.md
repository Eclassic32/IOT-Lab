# IoT Weight Monitor - MQTT to WebSocket Bridge

This version receives weight data via MQTT and outputs it through WebSocket to the web dashboard.

## Architecture

```
MQTT Weight Sensor → MQTT Broker → Server (MQTT to WebSocket) → Web Dashboard
```

- **MQTT Device**: Publishes weight data to MQTT broker
- **MQTT Broker**: Message broker (e.g., Mosquitto, HiveMQ)
- **Server**: Subscribes to MQTT topics and broadcasts via WebSocket
- **Web Dashboard**: Receives real-time data via WebSocket

## Prerequisites

You need an MQTT broker running. Options:

### Option 1: Local Mosquitto Broker (Recommended)

**Windows:**
```powershell
# Using Chocolatey
choco install mosquitto

# Or download from: https://mosquitto.org/download/
```

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto
```

**Linux:**
```bash
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

### Option 2: Public MQTT Brokers (Testing Only)

- `mqtt://test.mosquitto.org:1883`
- `mqtt://broker.hivemq.com:1883`
- `mqtt://broker.emqx.io:1883`

⚠️ **Note**: Public brokers are for testing only. Use a private broker for production.

## Installation

```bash
npm install
```

## Configuration

Set environment variables (optional):

```bash
# Windows PowerShell
$env:MQTT_BROKER = "mqtt://localhost:1883"
$env:MQTT_TOPIC = "weight/sensor/#"
$env:DEVICE_ID = "WEIGHT_SCALE_001"

# Linux/macOS
export MQTT_BROKER="mqtt://localhost:1883"
export MQTT_TOPIC="weight/sensor/#"
export DEVICE_ID="WEIGHT_SCALE_001"
```

Default values:
- `MQTT_BROKER`: `mqtt://localhost:1883`
- `MQTT_TOPIC`: `weight/sensor/#`
- `DEVICE_ID`: `WEIGHT_SCALE_001`

## Usage

### 1. Start MQTT Broker

If using local Mosquitto:

```bash
# Windows (if not running as service)
mosquitto -v

# Linux/macOS (if not running as service)
mosquitto -c /usr/local/etc/mosquitto/mosquitto.conf
```

### 2. Start the MQTT-to-WebSocket Server

```bash
npm run start:mqtt
```

The server will:
- Connect to the MQTT broker
- Subscribe to `weight/sensor/#` topic
- Start WebSocket server on port 3000
- Store last 5 minutes of data in memory

### 3. Open Web Dashboard

Navigate to: `http://localhost:3000`

### 4. Start MQTT Weight Sensor Simulator

In a new terminal:

```bash
npm run mqtt:device
```

This simulates an IoT weight sensor that publishes to MQTT every 1 second.

## MQTT Topics

The server subscribes to: `weight/sensor/#`

This matches topics like:
- `weight/sensor/WEIGHT_SCALE_001`
- `weight/sensor/SCALE_A`
- `weight/sensor/kitchen/scale1`

### Publishing Weight Data

Your IoT device should publish weight as a string to the topic:

```bash
# Using mosquitto_pub command
mosquitto_pub -h localhost -t "weight/sensor/WEIGHT_SCALE_001" -m "75.50"

# Or continuously
while true; do 
  mosquitto_pub -h localhost -t "weight/sensor/WEIGHT_SCALE_001" -m "$RANDOM.$(($RANDOM % 100))"
  sleep 1
done
```

## Real IoT Device Integration

### ESP32/ESP8266 (Arduino)

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <HX711.h>  // For load cell

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.1.100";  // Your MQTT broker IP
const char* mqtt_topic = "weight/sensor/WEIGHT_SCALE_001";

WiFiClient espClient;
PubSubClient client(espClient);
HX711 scale;

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  // Connect to MQTT
  client.setServer(mqtt_server, 1883);
  
  // Initialize scale
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
}

void loop() {
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Read weight
  float weight = scale.get_units(10);  // Average of 10 readings
  
  // Publish to MQTT
  char weightStr[10];
  dtostrf(weight, 6, 2, weightStr);
  client.publish(mqtt_topic, weightStr);
  
  delay(1000);  // Publish every second
}

void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect("ESP32WeightScale")) {
      Serial.println("MQTT Connected");
    } else {
      delay(5000);
    }
  }
}
```

### Raspberry Pi (Python)

```python
import paho.mqtt.client as mqtt
import time
import random  # Replace with actual sensor reading

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "weight/sensor/WEIGHT_SCALE_001"

client = mqtt.Client()
client.connect(MQTT_BROKER, MQTT_PORT, 60)

try:
    while True:
        # Read weight from sensor (replace with actual sensor code)
        weight = round(random.uniform(50, 100), 2)
        
        # Publish to MQTT
        client.publish(MQTT_TOPIC, str(weight))
        print(f"Published: {weight} kg")
        
        time.sleep(1)
except KeyboardInterrupt:
    client.disconnect()
```

## API Endpoints

### Health Check
```
GET /api/health
```

Returns server status, MQTT connection, and data statistics.

**Response:**
```json
{
  "status": "healthy",
  "mqtt": {
    "connected": true,
    "broker": "mqtt://localhost:1883",
    "topic": "weight/sensor/#"
  },
  "websocket": {
    "connectedClients": 2
  },
  "dataPoints": 245,
  "timestamp": "2025-10-01T12:30:45.123Z"
}
```

### Historical Data
```
GET /api/history
```

Returns last 5 minutes of weight measurements.

## Features

✅ **MQTT Input**: Receives data from any MQTT-compatible device  
✅ **WebSocket Output**: Real-time data streaming to web clients  
✅ **Server-Side Storage**: 5 minutes of data persistence  
✅ **Auto-Reconnect**: Both MQTT and WebSocket auto-reconnection  
✅ **Wildcard Topics**: Subscribe to multiple devices with `#` wildcard  
✅ **Connection Monitoring**: Visual indicators for MQTT and WebSocket status  
✅ **Historical Data**: Loads previous data on page refresh  
✅ **REST API**: Access data via HTTP endpoints  

## Troubleshooting

### MQTT Connection Failed

**Error**: `Error: connect ECONNREFUSED`

**Solution**: 
- Ensure MQTT broker is running
- Check broker address and port
- Verify firewall settings

### No Data Appearing

1. Check MQTT broker is receiving data:
   ```bash
   mosquitto_sub -h localhost -t "weight/sensor/#" -v
   ```

2. Check server logs for MQTT messages

3. Verify topic pattern matches your device's topic

### Device Can't Publish

- Check device network connectivity
- Verify MQTT broker address
- Ensure topic name is correct
- Check broker logs for connection attempts

## Development

Auto-restart on file changes:

```bash
npm run dev:mqtt
```

## Production Deployment

For production:

1. **Use secure MQTT** (mqtts://) with TLS
2. **Enable authentication** on MQTT broker
3. **Use private MQTT broker**
4. **Enable WebSocket authentication** if needed
5. **Consider persistent storage** (database) for longer retention

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MQTT_BROKER` | MQTT broker URL | `mqtt://localhost:1883` |
| `MQTT_TOPIC` | Topic pattern to subscribe | `weight/sensor/#` |
| `DEVICE_ID` | Device identifier for simulator | `WEIGHT_SCALE_001` |
| `PORT` | HTTP/WebSocket server port | `3000` |

## License

MIT License