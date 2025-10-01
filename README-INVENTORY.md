# Inventory Counting System

## Overview

This branch implements an intelligent inventory counting system that uses a weight sensor to track items on a stack. The system can accurately count items, detect additions/removals, and filter out accidental bumps or noise.

## Features

### 📋 Configuration Panel

Set up your inventory parameters:
- **Mass per item**: Weight of a single item (kg)
- **Total stack mass**: Current total weight on the scale (kg)
- **Number of items**: Current number of items in the stack

The system automatically calculates the baseline (tare) weight.

### ⚖️ Dual Display

- **Current Weight**: Real-time weight reading in large display
- **Item Count**: Calculated number of items based on weight

### 📊 Dual-Axis Graph

Interactive chart showing:
- **Item Count** (left axis, purple line): Track inventory changes over time
- **Weight** (right axis, blue line): Raw weight measurements

### 🔒 Safety Toggles

- **Allow Adding Items**: When unchecked, prevents count from increasing
- **Allow Removing Items**: When unchecked, prevents count from decreasing

Use these toggles to lock the current inventory level and ignore phantom readings.

### ⏱️ 3-Second Stabilization

The system uses a smart stabilization algorithm:
- Collects weight readings over a 3-second window
- Calculates statistical variance to detect stability
- Only records changes when weight is stable (< 0.05kg std deviation)
- **Filters out**: Accidental bumps, vibrations, brief contacts

### 📝 Smart Activity Log

Logs only meaningful events:
- ➕ Items added (e.g., "+3 items added")
- ➖ Items removed (e.g., "-2 items removed")
- ✓ Stable readings
- Configuration changes

### 🎨 Visual Status Indicator

Color-coded status bar:
- **Green**: Items being added
- **Red**: Items being removed
- **Blue**: Stable at current count

## How It Works

### Initial Configuration

1. Place your stack of items on the scale
2. Weigh a single item to get mass per item
3. Enter the total weight and number of items
4. Click "Apply Configuration"

The system calculates:
```
Baseline Weight = Total Mass - (Mass per Item × Item Count)
```

### Real-Time Counting

1. **Continuous Monitoring**: Weight readings arrive every 1 second
2. **Buffering**: Last 3 seconds of readings stored
3. **Stability Check**: Calculates standard deviation
4. **Threshold**: If std dev < 0.05kg, weight is considered stable
5. **Wait Period**: After stability detected, waits full 3 seconds
6. **Calculate Items**: `Item Count = (Current Weight - Baseline) / Mass per Item`
7. **Detect Change**: Compares with last stable count
8. **Log Event**: If changed, logs addition/removal

### Example Scenario

**Configuration:**
- Mass per item: 0.5 kg
- Total mass: 5.0 kg
- Item count: 10 items
- Baseline: 0.0 kg (pure stack weight)

**Events:**
1. Someone adds 2 items → Weight: 6.0 kg
2. System buffers readings for 3 seconds
3. Detects stability (low variance)
4. Calculates: (6.0 - 0.0) / 0.5 = 12 items
5. Logs: "➕ 2 items added"

## Usage

### Start the System

```bash
# Terminal 1 - Start MQTT server
npm run start:mqtt

# Terminal 2 - Start MQTT weight sensor
npm run mqtt:device

# Browser
http://localhost:3000
```

### Configure Your Inventory

1. Weigh your items:
   - Single item: 0.5 kg
   - Full stack of 10: 5.0 kg

2. Enter in configuration panel:
   - Mass per item: `0.500`
   - Total stack mass: `5.00`
   - Number of items: `10`

3. Click "Apply Configuration"

### Monitor Changes

- Watch the **Item Count** display update when items are added/removed
- Check the **Activity Log** for timestamped events
- Review the **Graph** for historical trends

### Use Safety Toggles

**Scenario: Counting items being removed**
- Uncheck "Allow Adding Items"
- Only removals will be counted
- System ignores any weight increases

**Scenario: Counting items being added**
- Uncheck "Allow Removing Items"
- Only additions will be counted
- System ignores any weight decreases

## Configuration Tips

### Accurate Counting

✅ **Do:**
- Weigh items accurately before configuration
- Place items gently (avoid dropping)
- Keep scale on stable surface
- Wait for "Stable" indicator before adding/removing

❌ **Avoid:**
- Touching scale during measurements
- Vibrating the surface
- Rapid additions/removals
- Extremely light items (< 10g) - may be unreliable

### Adjusting Sensitivity

The 3-second stabilization period can be adjusted in code:

```javascript
// In app.js
const STABILIZATION_TIME = 3000; // 3 seconds

// For faster response (less filtering):
const STABILIZATION_TIME = 1000; // 1 second

// For more filtering (noisy environment):
const STABILIZATION_TIME = 5000; // 5 seconds
```

The stability threshold can also be adjusted:

```javascript
// In app.js, processStableWeight function
if (stdDev < 0.05) { // Current: 50g tolerance

// For higher precision (stable environment):
if (stdDev < 0.02) { // 20g tolerance

// For noisy environment:
if (stdDev < 0.1) { // 100g tolerance
```

## Technical Details

### Data Flow

```
Weight Sensor (MQTT)
    ↓
MQTT Broker
    ↓
Server (Bridge)
    ↓
WebSocket
    ↓
Web Dashboard
    ↓
Stabilization Buffer (3s)
    ↓
Item Count Calculator
    ↓
Display + Chart + Logs
```

### Stabilization Algorithm

1. **Rolling Buffer**: Maintains last 3 seconds of weight readings
2. **Variance Calculation**: 
   ```
   variance = Σ(weight - avg)² / n
   stdDev = √variance
   ```
3. **Stability Check**: `stdDev < threshold`
4. **Delayed Processing**: Timer ensures full 3-second stable period

### Item Count Calculation

```javascript
netWeight = currentWeight - baselineWeight
itemCount = round(netWeight / massPerItem)

// Apply constraints
if (!allowAdding && itemCount > lastCount)
    itemCount = lastCount
    
if (!allowRemoving && itemCount < lastCount)
    itemCount = lastCount
```

## CSV Export

Export logs include:
- Timestamp
- Event type (adding/removing/stable)
- Message
- Weight (kg)
- Item count changes

## Troubleshooting

### Items count is inaccurate

1. **Re-calibrate**: Verify mass per item is correct
2. **Check baseline**: Ensure total mass and count are accurate
3. **Stable surface**: Make sure scale isn't vibrating
4. **Wait for stability**: Let system stabilize before changes

### System too sensitive / not sensitive enough

Adjust the stabilization time or threshold (see Configuration Tips above)

### Toggles not working

1. Ensure "Apply Configuration" was clicked after changes
2. Check toggle states are enabled
3. Review activity log for constraint messages

### Graph not updating

1. Check connection indicators (both should be green)
2. Verify device is sending data (check server logs)
3. Try refreshing the page

## API Integration

### Get Current Inventory

```javascript
// Via Socket.IO
socket.on('iot-data', (data) => {
    const weight = parseWeight(data.data);
    const itemCount = calculateItemCount(weight);
    // Use weight and itemCount
});
```

### Configure Programmatically

```javascript
// Update configuration
inventoryConfig.massPerItem = 0.5;
inventoryConfig.initialTotalMass = 5.0;
inventoryConfig.initialItemCount = 10;
applyConfiguration();
```

## Future Enhancements

Potential improvements:
- [ ] Save configuration to localStorage
- [ ] Multiple item types/SKUs
- [ ] Database persistence for history
- [ ] Alerts when inventory low/high
- [ ] Barcode scanner integration
- [ ] Multi-scale support
- [ ] Mobile app
- [ ] REST API for inventory queries

## Branch Information

- **Branch**: `inventory-counting`
- **Based on**: `main`
- **Status**: Feature complete, ready for testing

## See Also

- [README.md](README.md) - Main project documentation
- [CONFIGURATION.md](CONFIGURATION.md) - Environment configuration
- [README-MQTT.md](README-MQTT.md) - MQTT implementation details
