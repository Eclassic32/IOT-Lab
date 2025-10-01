# Environment Configuration Guide

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your specific configuration

## Configuration Variables

### Server Configuration

#### `PORT`
- **Description**: HTTP/WebSocket server port
- **Default**: `3000`
- **Example**: `PORT=3000`

### MQTT Configuration

#### `MQTT_BROKER`
- **Description**: MQTT broker URL
- **Default**: `mqtt://localhost:1883`
- **Examples**:
  - Local Mosquitto: `mqtt://localhost:1883`
  - Public test broker: `mqtt://test.mosquitto.org:1883`
  - Secure connection: `mqtts://broker.example.com:8883`
  - With credentials: `mqtt://username:password@broker.example.com:1883`
- **Note**: Use `mqtts://` for secure TLS connections in production

#### `MQTT_TOPIC`
- **Description**: MQTT topic pattern to subscribe to
- **Default**: `weight/sensor/#`
- **Examples**:
  - Single device: `weight/sensor/SCALE_001`
  - All sensors: `weight/sensor/#`
  - Specific location: `weight/sensor/kitchen/#`
- **Note**: The `#` wildcard matches multiple levels

### Device Configuration

#### `DEVICE_ID`
- **Description**: Unique identifier for the weight sensor device
- **Default**: `WEIGHT_SCALE_001`
- **Example**: `DEVICE_ID=KITCHEN_SCALE`
- **Note**: Used by device simulator. Real devices should have unique IDs

### Data Retention

#### `MAX_HISTORY_MINUTES`
- **Description**: How long to keep weight data in server memory (minutes)
- **Default**: `5`
- **Range**: `1` to `60` (recommended)
- **Example**: `MAX_HISTORY_MINUTES=10`
- **Note**: Higher values use more memory but retain more history

## Configuration Examples

### Local Development
```env
PORT=3000
MQTT_BROKER=mqtt://localhost:1883
MQTT_TOPIC=weight/sensor/#
DEVICE_ID=WEIGHT_SCALE_001
MAX_HISTORY_MINUTES=5
```

### Testing with Public Broker
```env
PORT=3000
MQTT_BROKER=mqtt://test.mosquitto.org:1883
MQTT_TOPIC=weight/sensor/#
DEVICE_ID=WEIGHT_SCALE_001
MAX_HISTORY_MINUTES=5
```

### Production with Secure MQTT
```env
PORT=3000
MQTT_BROKER=mqtts://username:password@mqtt.example.com:8883
MQTT_TOPIC=production/weight/sensor/#
DEVICE_ID=PROD_SCALE_001
MAX_HISTORY_MINUTES=10
```

### Multiple Devices Testing
```env
# Terminal 1 - Server
PORT=3000
MQTT_BROKER=mqtt://localhost:1883
MQTT_TOPIC=weight/sensor/#
MAX_HISTORY_MINUTES=5

# Terminal 2 - Device 1
MQTT_BROKER=mqtt://localhost:1883
DEVICE_ID=SCALE_001

# Terminal 3 - Device 2
MQTT_BROKER=mqtt://localhost:1883
DEVICE_ID=SCALE_002
```

## Using Environment Variables

### Method 1: .env File (Recommended)
```bash
# Edit .env file
nano .env

# Run normally
npm run start:mqtt
npm run mqtt:device
```

### Method 2: Command Line (Temporary)

**Windows PowerShell:**
```powershell
$env:MQTT_BROKER = "mqtt://test.mosquitto.org:1883"
$env:DEVICE_ID = "MY_SCALE"
npm run start:mqtt
```

**Linux/macOS:**
```bash
export MQTT_BROKER="mqtt://test.mosquitto.org:1883"
export DEVICE_ID="MY_SCALE"
npm run start:mqtt
```

### Method 3: Inline (Single Command)

**Windows PowerShell:**
```powershell
$env:MQTT_BROKER = "mqtt://test.mosquitto.org:1883"; npm run mqtt:device
```

**Linux/macOS:**
```bash
MQTT_BROKER="mqtt://test.mosquitto.org:1883" npm run mqtt:device
```

## Security Best Practices

### Development
- ✅ Use `.env` file
- ✅ Test with public brokers
- ✅ Keep `.env` in `.gitignore`

### Production
- ✅ Use environment variables from hosting platform
- ✅ Use secure MQTT (mqtts://)
- ✅ Enable authentication on MQTT broker
- ✅ Use strong passwords
- ✅ Restrict topic access
- ✅ Never commit `.env` to version control
- ✅ Rotate credentials regularly
- ✅ Use TLS certificates
- ✅ Implement access control lists (ACL)

## Troubleshooting

### Issue: Environment variables not loading

**Solution**: Ensure `.env` file exists in project root
```bash
# Check if file exists
ls -la .env

# If not, copy from example
cp .env.example .env
```

### Issue: MQTT connection refused

**Solutions**:
1. Check MQTT broker is running
2. Verify `MQTT_BROKER` URL is correct
3. Check firewall settings
4. Test with public broker first

### Issue: Wrong topic receiving data

**Solution**: Check topic patterns match:
```bash
# Publisher
weight/sensor/DEVICE_001

# Subscriber patterns that match:
weight/sensor/#          ✅
weight/sensor/DEVICE_001 ✅
weight/#                 ✅
#                        ✅

# Patterns that DON'T match:
weight/sensor/+          ❌ (+ matches single level only)
sensor/#                 ❌
```

## Environment Variable Priority

The application loads environment variables in this order:
1. System environment variables (highest priority)
2. `.env` file
3. Default values in code (lowest priority)

Example:
```bash
# .env file has: MQTT_BROKER=mqtt://localhost:1883
# But you run:
$env:MQTT_BROKER = "mqtt://test.mosquitto.org:1883"; npm run start:mqtt
# Result: Uses mqtt://test.mosquitto.org:1883 (command line wins)
```

## Additional Resources

- [MQTT Protocol Documentation](https://mqtt.org/)
- [Eclipse Mosquitto](https://mosquitto.org/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
