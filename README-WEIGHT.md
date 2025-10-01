# Weight Monitoring IoT Application

A real-time weight monitoring web application using Socket.IO. The system displays weight measurements from an IoT scale device with a large display, 24-hour historical graph, and activity logs.

## Features

- **Large Weight Display**: Shows current weight in large, easy-to-read text at the center top
- **5-Minute Graph**: Visualizes weight trends over the past 5 minutes with 1-second resolution using Chart.js
- **Real-time Updates**: Instant weight updates via WebSocket connection (every 1 second)
- **Server-Side Persistence**: Historical data stored on server - survives page refreshes and loads even when page is closed
- **Activity Logs**: Comprehensive logging of all measurements and system events
- **CSV Export**: Export all weight logs to CSV for analysis
- **Responsive Design**: Modern, beautiful interface that works on all devices

## Project Structure

```
IOT-Lab/
├── server/
│   └── server.js          # Socket.IO server
├── public/
│   ├── index.html         # Weight monitor interface
│   ├── styles.css         # Modern styling
│   └── app.js            # Frontend logic with Chart.js
├── device/
│   ├── weight-sensor.js  # Weight scale simulator
│   └── iot-device.js     # Other IoT devices (legacy)
└── package.json          # Dependencies and scripts
```

## Installation

```bash
npm install
```

## Usage

### 1. Start the Server

```bash
npm start
```

Server runs on `http://localhost:3000`

### 2. Open Web Interface

Navigate to `http://localhost:3000` in your browser to see the weight monitor dashboard.

### 3. Run the Weight Sensor

In a new terminal:

```bash
npm run weight
```

This starts a simulated weight scale that sends weight measurements every 3 seconds.

## Weight Data Format

The weight sensor sends data as a string containing the weight value (in kg). Examples:
- `"75.50"`
- `"68.23"`
- `"82.10"`

The frontend automatically parses these strings and displays them.

## Web Interface Sections

### 1. Weight Display (Top Center)
- **Large numeric display** showing current weight in kg
- **Last update timestamp** below the weight
- **Animation effect** on each new measurement

### 2. 24-Hour Graph (Middle)
- **Line chart** showing weight history over the past 24 hours
- **Interactive tooltips** on hover
- **Auto-scaling** Y-axis for optimal viewing
- **Time-based X-axis** with hour:minute format

### 3. Activity Log (Bottom)
- **Real-time log entries** for all system events
- **Color-coded messages**: 
  - 🔵 Info (blue)
  - 🟢 Success (green)
  - 🟡 Warning (yellow)
  - 🔴 Error (red)
- **Clear Logs** button to reset the log
- **Export CSV** button to download all logged data

## Features in Detail

### Real-time Weight Monitoring
The system uses Socket.IO for bidirectional real-time communication:
- Weight sensor connects and registers with the server
- Server broadcasts weight data to all connected web clients
- Web interface updates instantly without page reload

### 5-Minute Data Retention with Server Persistence
- **Server-side storage**: Weight data is stored on the server, not just in the browser
- **Survives page refresh**: Historical data loads automatically when you open/refresh the page
- **Continuous collection**: Data continues to be collected even when no browser is connected
- Automatically stores weight measurements for 5 minutes
- Older data is automatically pruned every 10 seconds
- Maximum of 300 data points (one per second for 5 minutes)
- **Real-time synchronization**: New clients instantly receive all historical data

### CSV Export
Export format includes:
- Timestamp (ISO 8601 format)
- Event type
- Message description
- Weight value (if applicable)

Example CSV output:
```csv
Timestamp,Type,Message,Weight (kg)
2025-10-01T12:30:45.123Z,info,Weight measurement received,75.50
2025-10-01T12:30:48.456Z,info,Weight measurement received,75.52
```

## Customization

### Adjust Data Sending Interval

In `device/weight-sensor.js`, modify the interval (default: 3000ms):

```javascript
this.dataInterval = setInterval(() => {
    const weightData = this.generateWeightData();
    this.sendData(weightData);
}, 3000); // Change this value (in milliseconds)
```

### Change Weight Range

Modify the `generateWeightData()` function in `device/weight-sensor.js`:

```javascript
// Initialize with custom range
this.currentWeight = Math.random() * 30 + 60; // 60-90 kg

// Keep weight in custom range
this.currentWeight = Math.max(50, Math.min(100, this.currentWeight));
```

### Adjust Graph Time Range

In `public/app.js`, modify:

```javascript
const MAX_HISTORY_HOURS = 24; // Change to desired hours
const MAX_HISTORY_POINTS = 288; // Adjust for performance
```

## Connecting Your Real IoT Device

To connect a real weight sensor instead of the simulator:

1. Use Socket.IO client library for your device's platform
2. Connect to `http://your-server-ip:3000`
3. Register device:
   ```javascript
   socket.emit('register-device', {
       deviceId: 'YOUR_DEVICE_ID',
       deviceType: 'Weight Scale'
   });
   ```
4. Send weight data:
   ```javascript
   socket.emit('device-data', weightValue.toString());
   ```

### Example for ESP32/Arduino

```cpp
// Pseudo-code for ESP32 with Arduino SocketIO client
#include <SocketIOClient.h>

SocketIOClient socket;

void setup() {
    socket.begin("192.168.1.100", 3000);
    
    // Register device
    String payload = "{\"deviceId\":\"SCALE_001\",\"deviceType\":\"Weight Scale\"}";
    socket.emit("register-device", payload.c_str());
}

void loop() {
    float weight = readWeightSensor(); // Your sensor reading function
    String weightStr = String(weight, 2);
    socket.emit("device-data", weightStr.c_str());
    delay(3000);
}
```

## Socket.IO Events

### Device → Server
- `register-device`: Register weight scale with server
  ```json
  {
    "deviceId": "WEIGHT_SCALE_001",
    "deviceType": "Weight Scale"
  }
  ```
- `device-data`: Send weight measurement (string)
  ```
  "75.50"
  ```

### Server → Web Client
- `device-connected`: Notification when device connects
- `device-disconnected`: Notification when device disconnects
- `iot-data`: Weight measurement with metadata
  ```json
  {
    "deviceId": "WEIGHT_SCALE_001",
    "deviceType": "Weight Scale",
    "data": "75.50",
    "timestamp": "2025-10-01T12:30:45.123Z"
  }
  ```

## Technologies Used

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Charts**: Chart.js 4.x
- **Real-time**: WebSocket via Socket.IO
- **Design**: Modern glassmorphism UI with gradient background

## Development

For auto-restart during development:

```bash
npm run dev
```

## Troubleshooting

### Device Can't Connect
- Ensure server is running (`npm start`)
- Check firewall settings
- Verify correct server URL in device code

### No Data on Graph
- Wait for at least 2 measurements to appear
- Check browser console for errors
- Ensure weight data is being sent as a string containing a number

### Graph Performance Issues
- Reduce `MAX_HISTORY_POINTS` in `app.js`
- Increase data sending interval on device

## License

MIT License