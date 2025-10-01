# IoT Web Application with Socket.IO

A real-time web application for monitoring IoT devices using Socket.IO. This project includes a server, web frontend, and simulated IoT devices that send data as strings.

## Features

- **Real-time Communication**: Uses Socket.IO for instant data transmission
- **Web Dashboard**: Modern, responsive web interface for monitoring devices
- **Device Simulation**: Multiple types of IoT device simulators
- **Activity Logging**: Real-time activity logs with different severity levels
- **Connection Management**: Automatic reconnection and status monitoring

## Project Structure

```
IOT-Lab/
├── server/
│   └── server.js          # Main server with Socket.IO
├── public/
│   ├── index.html         # Web frontend
│   ├── styles.css         # Styling
│   └── app.js            # Frontend JavaScript
├── device/
│   └── iot-device.js     # IoT device simulator
└── package.json          # Dependencies and scripts
```

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

## Usage

### 1. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 2. Open the Web Dashboard

Open your browser and navigate to `http://localhost:3000` to view the real-time dashboard.

### 3. Run IoT Device Simulation

In a new terminal, run:

```bash
npm run device
```

This will start multiple simulated IoT devices that will connect and send data.

## Device Types

The simulation includes several device types:

- **Temperature Sensor**: Sends temperature and humidity readings
- **Motion Sensor**: Detects motion events
- **Smart Meter**: Reports power usage and voltage
- **Custom Sensor**: Sends various status messages and alerts

## API Endpoints

- `GET /api/health` - Server health check with connection statistics

## Socket.IO Events

### Client to Server
- `register-device` - Register a new IoT device
- `device-data` - Send data from IoT device
- `get-devices` - Request list of connected devices
- `get-latest-data` - Request latest data from specific device

### Server to Client
- `iot-data` - Real-time data from IoT devices
- `device-connected` - Notification of new device connection
- `device-disconnected` - Notification of device disconnection
- `devices-list` - List of currently connected devices

## Development

For development with auto-restart:

```bash
npm run dev
```

## Customizing IoT Devices

You can create custom IoT devices by extending the `IoTDevice` class:

```javascript
const { IoTDevice } = require('./device/iot-device');

class MyCustomDevice extends IoTDevice {
    constructor(deviceId) {
        super(deviceId, 'My Custom Device Type');
    }

    generateData() {
        return "Your custom data string here";
    }
}

const device = new MyCustomDevice('MY_DEVICE_001');
device.connect();
```

## Features of the Web Dashboard

- **Connection Status**: Real-time server connection indicator
- **Device List**: Shows all connected IoT devices with status
- **Live Data Stream**: Displays incoming data from all devices
- **Activity Log**: Comprehensive logging of all system events
- **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript, Socket.IO Client
- **Real-time Communication**: WebSocket via Socket.IO

## License

MIT License