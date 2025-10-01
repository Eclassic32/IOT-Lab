# Inventory Counting System# Inventory Counting System



## Overview## Overview



This branch implements an intelligent inventory counting system that uses a weight sensor to track items on a scale. The system accurately counts items, detects additions/removals, and filters out accidental bumps or noise.This branch implements an intelligent inventory counting system that uses a weight sensor to track items on a stack. The system can accurately count items, detect additions/removals, and filter out accidental bumps or noise.



## Key Concept: Board Mass (Tare Weight)## Features



The **board mass** is the weight of your container, board, or platform that holds the items. This tare weight is automatically subtracted from sensor readings to calculate the net weight of items only.### 📋 Configuration Panel



### FormulaSet up your inventory parameters:

- **Mass per item**: Weight of a single item (kg)

```- **Total stack mass**: Current total weight on the scale (kg)

Item Count = (Sensor Reading - Board Mass) / Mass per Item- **Number of items**: Current number of items in the stack

```

The system automatically calculates the baseline (tare) weight.

**Example:**

- Sensor reading: 87.5 kg (total weight on scale)### ⚖️ Dual Display

- Board mass: 2.0 kg (weight of empty container)

- Mass per item: 0.5 kg (weight of one item)- **Current Weight**: Real-time weight reading in large display

- **Item Count = (87.5 - 2.0) / 0.5 = 171 items**- **Item Count**: Calculated number of items based on weight



## Features### 📊 Dual-Axis Graph



### 📋 Configuration PanelInteractive chart showing:

- **Item Count** (left axis, purple line): Track inventory changes over time

Three simple inputs:- **Weight** (right axis, blue line): Raw weight measurements

1. **Mass per item** (kg) - Weight of a single item

2. **Board/Container mass** (kg) - Tare weight to subtract### 🔒 Safety Toggles

3. **Number of items** - Current baseline count

- **Allow Adding Items**: When unchecked, prevents count from increasing

### ⚖️ Dual Display- **Allow Removing Items**: When unchecked, prevents count from decreasing



- **Left Box**: Current sensor reading (kg)Use these toggles to lock the current inventory level and ignore phantom readings.

- **Right Box**: Calculated item count (purple, highlighted)

### ⏱️ 3-Second Stabilization

### 🔒 Safety Toggles

The system uses a smart stabilization algorithm:

Control which direction changes are allowed:- Collects weight readings over a 3-second window

- **☑ Allow Adding Items** - Unchecked = count won't increase- Calculates statistical variance to detect stability

- **☑ Allow Removing Items** - Unchecked = count won't decrease- Only records changes when weight is stable (< 0.05kg std deviation)

- **Filters out**: Accidental bumps, vibrations, brief contacts

### ⏱️ 3-Second Stabilization

### 📝 Smart Activity Log

- Buffers readings for 3 seconds

- Only counts when stable (variance < 0.05kg)Logs only meaningful events:

- Filters accidental bumps and vibrations- ➕ Items added (e.g., "+3 items added")

- ➖ Items removed (e.g., "-2 items removed")

### 📊 Dual-Axis Graph (5 Minutes)- ✓ Stable readings

- Configuration changes

- Purple line: Item count over time

- Blue line: Raw weight readings### 🎨 Visual Status Indicator



### 📝 Activity LogColor-coded status bar:

- **Green**: Items being added

Shows only meaningful events:- **Red**: Items being removed

- ➕ "3 items added"- **Blue**: Stable at current count

- ➖ "2 items removed"  

- ✓ "Stable at 175 items"## How It Works



## Setup Process### Initial Configuration



### Step 1: Weigh Your Board/Container1. Place your stack of items on the scale

2. Weigh a single item to get mass per item

Place empty board/container on scale.3. Enter the total weight and number of items

4. Click "Apply Configuration"

**Example:** Empty container = **2.0 kg**

The system calculates:

### Step 2: Weigh One Item```

Baseline Weight = Total Mass - (Mass per Item × Item Count)

Weigh a single item separately.```



**Example:** One item = **0.5 kg**### Real-Time Counting



### Step 3: Count Current Items1. **Continuous Monitoring**: Weight readings arrive every 1 second

2. **Buffering**: Last 3 seconds of readings stored

Count how many items you currently have.3. **Stability Check**: Calculates standard deviation

4. **Threshold**: If std dev < 0.05kg, weight is considered stable

**Example:** **10 items**5. **Wait Period**: After stability detected, waits full 3 seconds

6. **Calculate Items**: `Item Count = (Current Weight - Baseline) / Mass per Item`

### Step 4: Configure System7. **Detect Change**: Compares with last stable count

8. **Log Event**: If changed, logs addition/removal

Enter in configuration panel:

- Mass per item: `0.500`### Example Scenario

- Board/Container mass: `2.000`

- Number of items: `10`**Configuration:**

- Mass per item: 0.5 kg

Click "Apply Configuration"- Total mass: 5.0 kg

- Item count: 10 items

### Verification- Baseline: 0.0 kg (pure stack weight)



With 10 items on the scale:**Events:**

```1. Someone adds 2 items → Weight: 6.0 kg

Total sensor reading = 2.0 + (10 × 0.5) = 7.0 kg2. System buffers readings for 3 seconds

Item count = (7.0 - 2.0) / 0.5 = 10 ✓3. Detects stability (low variance)

```4. Calculates: (6.0 - 0.0) / 0.5 = 12 items

5. Logs: "➕ 2 items added"

## Usage Examples

## Usage

### Example 1: Warehouse Parts

### Start the System

**Setup:**

- Empty pallet: 15.0 kg```bash

- Part weight: 2.5 kg each# Terminal 1 - Start MQTT server

- Starting with: 50 partsnpm run start:mqtt



**Configuration:**# Terminal 2 - Start MQTT weight sensor

```npm run mqtt:device

Mass per item: 2.500 kg

Board mass: 15.000 kg  # Browser

Number of items: 50http://localhost:3000

``````



**Sensor shows 140 kg:**### Configure Your Inventory

```

Items = (140 - 15) / 2.5 = 50 parts ✓1. Weigh your items:

```   - Single item: 0.5 kg

   - Full stack of 10: 5.0 kg

**After adding 10 parts (sensor shows 165 kg):**

```2. Enter in configuration panel:

Items = (165 - 15) / 2.5 = 60 parts   - Mass per item: `0.500`

Change: +10 parts logged   - Total stack mass: `5.00`

```   - Number of items: `10`



### Example 2: Retail Products3. Click "Apply Configuration"



**Setup:**### Monitor Changes

- Display tray: 0.5 kg

- Product weight: 0.150 kg- Watch the **Item Count** display update when items are added/removed

- Starting with: 30 products- Check the **Activity Log** for timestamped events

- Review the **Graph** for historical trends

**Configuration:**

```### Use Safety Toggles

Mass per item: 0.150 kg

Board mass: 0.500 kg**Scenario: Counting items being removed**

Number of items: 30- Uncheck "Allow Adding Items"

```- Only removals will be counted

- System ignores any weight increases

**Sensor shows 5.0 kg:**

```**Scenario: Counting items being added**

Items = (5.0 - 0.5) / 0.15 = 30 products ✓- Uncheck "Allow Removing Items"

```- Only additions will be counted

- System ignores any weight decreases

### Example 3: No Container

## Configuration Tips

**Setup:**

- No container (direct on scale)### Accurate Counting

- Box weight: 1.0 kg

- Starting with: 100 boxes✅ **Do:**

- Weigh items accurately before configuration

**Configuration:**- Place items gently (avoid dropping)

```- Keep scale on stable surface

Mass per item: 1.000 kg- Wait for "Stable" indicator before adding/removing

Board mass: 0.000 kg

Number of items: 100❌ **Avoid:**

```- Touching scale during measurements

- Vibrating the surface

**Sensor shows 100 kg:**- Rapid additions/removals

```- Extremely light items (< 10g) - may be unreliable

Items = (100 - 0) / 1.0 = 100 boxes ✓

```### Adjusting Sensitivity



## Real-Time OperationThe 3-second stabilization period can be adjusted in code:



### Adding Items```javascript

// In app.js

1. Someone places 3 items on scaleconst STABILIZATION_TIME = 3000; // 3 seconds

2. Weight increases by 1.5 kg (3 × 0.5kg)

3. System buffers for 3 seconds// For faster response (less filtering):

4. Detects stable readingconst STABILIZATION_TIME = 1000; // 1 second

5. Calculates new count

6. Logs: "➕ 3 items added"// For more filtering (noisy environment):

const STABILIZATION_TIME = 5000; // 5 seconds

### Removing Items```



1. Someone takes 2 items from scaleThe stability threshold can also be adjusted:

2. Weight decreases by 1.0 kg (2 × 0.5kg)

3. 3-second stabilization```javascript

4. Calculates new count// In app.js, processStableWeight function

5. Logs: "➖ 2 items removed"if (stdDev < 0.05) { // Current: 50g tolerance



## Configuration Tips// For higher precision (stable environment):

if (stdDev < 0.02) { // 20g tolerance

### ✅ Best Practices

// For noisy environment:

- Weigh board/container when completely emptyif (stdDev < 0.1) { // 100g tolerance

- Include all container weight (lids, trays, etc.)```

- Weigh multiple items and average for better accuracy

- Use stable, vibration-free surface## Technical Details

- Wait for "Stable" status before changes

### Data Flow

### ❌ Common Mistakes

```

- Forgetting to include container weightWeight Sensor (MQTT)

- Using average item weight incorrectly    ↓

- Making changes during unstable readingsMQTT Broker

- Not calibrating scale regularly    ↓

Server (Bridge)

## Adjusting Sensitivity    ↓

WebSocket

### Stabilization Time    ↓

Web Dashboard

In `app.js` (~line 41):    ↓

```javascriptStabilization Buffer (3s)

const STABILIZATION_TIME = 3000; // 3 seconds    ↓

Item Count Calculator

// Faster (less filtering):    ↓

const STABILIZATION_TIME = 1000;Display + Chart + Logs

```

// More filtering (noisy):

const STABILIZATION_TIME = 5000;### Stabilization Algorithm

```

1. **Rolling Buffer**: Maintains last 3 seconds of weight readings

### Stability Threshold2. **Variance Calculation**: 

   ```

In `app.js` (~line 296):   variance = Σ(weight - avg)² / n

```javascript   stdDev = √variance

if (stdDev < 0.05) { // 50g tolerance   ```

3. **Stability Check**: `stdDev < threshold`

// Tighter (precision):4. **Delayed Processing**: Timer ensures full 3-second stable period

if (stdDev < 0.02) // 20g

### Item Count Calculation

// Looser (noisy):

if (stdDev < 0.1)  // 100g```javascript

```netWeight = currentWeight - baselineWeight

itemCount = round(netWeight / massPerItem)

## Troubleshooting

// Apply constraints

| Problem | Cause | Solution |if (!allowAdding && itemCount > lastCount)

|---------|-------|----------|    itemCount = lastCount

| Count is off by constant | Wrong board mass | Re-weigh empty container |    

| Count drifts over time | Scale calibration | Recalibrate scale |if (!allowRemoving && itemCount < lastCount)

| Too many false changes | Low threshold | Increase stabilization time/threshold |    itemCount = lastCount

| Changes not detected | High threshold | Decrease threshold |```

| Toggles don't work | Not applied | Click "Apply Configuration" |

## CSV Export

## Technical Details

Export logs include:

### Item Count Calculation- Timestamp

- Event type (adding/removing/stable)

```javascript- Message

function calculateItemCount(currentWeight) {- Weight (kg)

    // Subtract tare (board mass)- Item count changes

    const netWeight = currentWeight - inventoryConfig.boardMass;

    ## Troubleshooting

    // Calculate items

    let itemCount = Math.round(netWeight / inventoryConfig.massPerItem);### Items count is inaccurate

    

    // Apply toggle constraints1. **Re-calibrate**: Verify mass per item is correct

    if (!allowAdding && itemCount > lastCount)2. **Check baseline**: Ensure total mass and count are accurate

        itemCount = lastCount;3. **Stable surface**: Make sure scale isn't vibrating

        4. **Wait for stability**: Let system stabilize before changes

    if (!allowRemoving && itemCount < lastCount)

        itemCount = lastCount;### System too sensitive / not sensitive enough

    

    // Non-negativeAdjust the stabilization time or threshold (see Configuration Tips above)

    return Math.max(0, itemCount);

}### Toggles not working

```

1. Ensure "Apply Configuration" was clicked after changes

### Stabilization Algorithm2. Check toggle states are enabled

3. Review activity log for constraint messages

```

1. Buffer last 3 seconds of readings### Graph not updating

2. Calculate average weight

3. Calculate variance: Σ(weight - avg)² / n1. Check connection indicators (both should be green)

4. Calculate std deviation: √variance2. Verify device is sending data (check server logs)

5. If stdDev < 0.05kg → STABLE3. Try refreshing the page

6. Wait full 3 seconds

7. Process change## API Integration

```

### Get Current Inventory

## Running the System

```javascript

```bash// Via Socket.IO

# Start MQTT serversocket.on('iot-data', (data) => {

npm run start:mqtt    const weight = parseWeight(data.data);

    const itemCount = calculateItemCount(weight);

# Start weight sensor    // Use weight and itemCount

npm run mqtt:device});

```

# Open browser

http://localhost:3000### Configure Programmatically

```

```javascript

## CSV Export// Update configuration

inventoryConfig.massPerItem = 0.5;

Logs can be exported including:inventoryConfig.initialTotalMass = 5.0;

- TimestampinventoryConfig.initialItemCount = 10;

- Event typeapplyConfiguration();

- Message```

- Weight reading

- Item count## Future Enhancements



## Branch InfoPotential improvements:

- [ ] Save configuration to localStorage

- **Branch**: `inventory-counting`- [ ] Multiple item types/SKUs

- **Latest commit**: Board mass implementation- [ ] Database persistence for history

- **Status**: Ready for use- [ ] Alerts when inventory low/high

- [ ] Barcode scanner integration

## Changes- [ ] Multi-scale support

- [ ] Mobile app

### v2 - Board Mass (Current)- [ ] REST API for inventory queries

✅ Simple tare weight concept  

✅ Direct subtraction from sensor  ## Branch Information

✅ Clear configuration  

✅ No complex calculations  - **Branch**: `inventory-counting`

- **Based on**: `main`

### v1 - Total Stack Mass- **Status**: Feature complete, ready for testing

❌ Required reverse calculation  

❌ Confusing baseline concept  ## See Also

❌ Auto-sync complexity  

- [README.md](README.md) - Main project documentation

## See Also- [CONFIGURATION.md](CONFIGURATION.md) - Environment configuration

- [README-MQTT.md](README-MQTT.md) - MQTT implementation details

- [README.md](../README.md) - Main documentation
- [CONFIGURATION.md](../CONFIGURATION.md) - Environment setup
- [README-MQTT.md](../README-MQTT.md) - MQTT details
