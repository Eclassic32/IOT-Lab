// Initialize Socket.IO connection
const socket = io();

// DOM elements
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const mqttIndicator = document.getElementById('mqtt-indicator');
const mqttText = document.getElementById('mqtt-text');
const weightValue = document.getElementById('weight-value');
const itemCountDisplay = document.getElementById('item-count-display');
const lastUpdate = document.getElementById('last-update');
const inventoryStatus = document.getElementById('inventory-status');
const logsContainer = document.getElementById('logs-list');
const clearLogsBtn = document.getElementById('clear-logs');
const exportLogsBtn = document.getElementById('export-logs');

// Configuration elements
const massPerItemInput = document.getElementById('mass-per-item');
const boardMassInput = document.getElementById('board-mass');
const itemCountInput = document.getElementById('item-count');
const applyConfigBtn = document.getElementById('apply-config');
const allowAddingToggle = document.getElementById('allow-adding');
const allowRemovingToggle = document.getElementById('allow-removing');

// Inventory configuration
let inventoryConfig = {
    massPerItem: 0.5,        // kg per item
    boardMass: 0.0,          // kg board/container (tare weight)
    initialItemCount: 10,    // number of items
    allowAdding: true,
    allowRemoving: true
};

// Data storage
let weightHistory = [];
let itemCountHistory = [];
let allLogs = [];
const MAX_HISTORY_MINUTES = 5;
const MAX_HISTORY_POINTS = 300; // 5 minutes * 60 seconds

// Stabilization settings
const STABILIZATION_TIME = 3000; // 3 seconds in milliseconds
let weightBuffer = [];
let lastStableWeight = 0;
let lastStableItemCount = 0;
let stabilizationTimer = null;

// Chart initialization
let inventoryChart = null;

function initChart() {
    const ctx = document.getElementById('inventoryChart').getContext('2d');
    
    inventoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Item Count',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                tension: 0.1,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y'
            }, {
                label: 'Weight (kg)',
                data: [],
                borderColor: '#4299e1',
                backgroundColor: 'rgba(66, 153, 225, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: '#4299e1',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: function(context) {
                            return `Weight: ${context.parsed.y.toFixed(2)} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time (HH:MM:SS)',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        maxTicksLimit: 12,
                        autoSkip: true
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Item Count',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#667eea'
                    },
                    grid: {
                        color: 'rgba(102, 126, 234, 0.1)'
                    },
                    ticks: {
                        stepSize: 1,
                        color: '#667eea'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Weight (kg)',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#4299e1'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#4299e1'
                    }
                }
            }
        }
    });
}

// Utility functions
function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function formatTimeShort(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
    });
}

function parseWeight(dataString) {
    // Try to extract number from string
    // Handles formats like: "75.5", "Weight: 75.5", "75.5kg", etc.
    const match = dataString.match(/(\d+\.?\d*)/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

function calculateItemCount(currentWeight) {
    if (inventoryConfig.massPerItem === 0) return 0;
    
    // Calculate net weight (subtract board/container mass from sensor reading)
    const netWeight = currentWeight - inventoryConfig.boardMass;
    
    // Calculate item count
    let itemCount = Math.round(netWeight / inventoryConfig.massPerItem);
    
    // Apply constraints based on toggles
    if (!inventoryConfig.allowAdding && itemCount > lastStableItemCount) {
        itemCount = lastStableItemCount;
    }
    if (!inventoryConfig.allowRemoving && itemCount < lastStableItemCount) {
        itemCount = lastStableItemCount;
    }
    
    // Ensure non-negative
    return Math.max(0, itemCount);
}

function applyConfiguration() {
    // Read values from inputs
    const massPerItem = parseFloat(massPerItemInput.value);
    const boardMass = parseFloat(boardMassInput.value);
    const itemCount = parseInt(itemCountInput.value);
    
    // Validate inputs
    if (isNaN(massPerItem) || massPerItem <= 0) {
        alert('Mass per item must be a positive number');
        return;
    }
    if (isNaN(boardMass) || boardMass < 0) {
        alert('Board mass must be a non-negative number');
        return;
    }
    if (isNaN(itemCount) || itemCount < 1) {
        alert('Item count must be at least 1');
        return;
    }
    
    // Update configuration
    inventoryConfig.massPerItem = massPerItem;
    inventoryConfig.boardMass = boardMass;
    inventoryConfig.initialItemCount = itemCount;
    
    // Update toggles
    inventoryConfig.allowAdding = allowAddingToggle.checked;
    inventoryConfig.allowRemoving = allowRemovingToggle.checked;
    
    // Reset stable counts
    lastStableItemCount = itemCount;
    
    // Clear buffer
    weightBuffer = [];
    
    addLogEntry(`Configuration applied: ${massPerItem}kg/item, ${boardMass}kg board mass, ${itemCount} items baseline`, 'success');
    
    // Note: Display will update with next sensor reading
    itemCountDisplay.textContent = itemCount;
}

function checkStabilization(currentWeight, timestamp) {
    // Add to buffer
    weightBuffer.push({ weight: currentWeight, timestamp: timestamp });
    
    // Keep only last 3 seconds of data
    const cutoffTime = Date.now() - STABILIZATION_TIME;
    weightBuffer = weightBuffer.filter(entry => 
        new Date(entry.timestamp).getTime() > cutoffTime
    );
    
    // Clear existing timer
    if (stabilizationTimer) {
        clearTimeout(stabilizationTimer);
    }
    
    // Check if we have enough data (at least 3 readings)
    if (weightBuffer.length < 3) {
        return false;
    }
    
    // Calculate variance to check stability
    const weights = weightBuffer.map(entry => entry.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);
    
    // If stable (low variance), process after stabilization time
    if (stdDev < 0.05) { // Tolerance: 0.05kg standard deviation
        stabilizationTimer = setTimeout(() => {
            processStableWeight(avgWeight, timestamp);
        }, STABILIZATION_TIME);
        return true;
    }
    
    return false;
}

function processStableWeight(avgWeight, timestamp) {
    const currentItemCount = calculateItemCount(avgWeight);
    const itemChange = currentItemCount - lastStableItemCount;
    
    // Only log if there's a change in item count
    if (itemChange !== 0) {
        const changeType = itemChange > 0 ? 'adding' : 'removing';
        const absChange = Math.abs(itemChange);
        
        addLogEntry(
            `${itemChange > 0 ? '➕' : '➖'} ${absChange} item${absChange !== 1 ? 's' : ''} ${itemChange > 0 ? 'added' : 'removed'}`,
            changeType === 'adding' ? 'success' : 'warning',
            avgWeight
        );
        
        // Update status display
        inventoryStatus.className = `inventory-status ${changeType}`;
        inventoryStatus.textContent = `${itemChange > 0 ? '➕' : '➖'} ${absChange} item${absChange !== 1 ? 's' : ''} ${itemChange > 0 ? 'added' : 'removed'}`;
        
        // Add to history
        addToHistory(avgWeight, currentItemCount, timestamp);
        
        // Update stable values
        lastStableWeight = avgWeight;
        lastStableItemCount = currentItemCount;
    } else {
        // No change, just stable
        inventoryStatus.className = 'inventory-status stable';
        inventoryStatus.textContent = `✓ Stable at ${currentItemCount} items`;
    }
}

function updateWeightDisplay(weight, timestamp) {
    weightValue.textContent = weight.toFixed(2);
    weightValue.classList.add('updating');
    
    setTimeout(() => {
        weightValue.classList.remove('updating');
    }, 300);
    
    lastUpdate.textContent = `Last update: ${formatTimestamp(timestamp)}`;
    
    // Update item count display
    const itemCount = calculateItemCount(weight);
    itemCountDisplay.textContent = itemCount;
    itemCountDisplay.classList.add('updating');
    
    setTimeout(() => {
        itemCountDisplay.classList.remove('updating');
    }, 300);
}

function addToHistory(weight, itemCount, timestamp) {
    const entry = {
        weight: weight,
        itemCount: itemCount,
        timestamp: timestamp
    };
    
    weightHistory.push(entry);
    
    // Keep only last 5 minutes of data
    const cutoffTime = Date.now() - (MAX_HISTORY_MINUTES * 60 * 1000);
    weightHistory = weightHistory.filter(entry => 
        new Date(entry.timestamp).getTime() > cutoffTime
    );
    
    // Limit total points to prevent performance issues
    if (weightHistory.length > MAX_HISTORY_POINTS) {
        weightHistory = weightHistory.slice(-MAX_HISTORY_POINTS);
    }
    
    updateChart();
}

function updateChart() {
    if (!inventoryChart || weightHistory.length === 0) return;
    
    const labels = weightHistory.map(entry => formatTimeShort(entry.timestamp));
    const itemData = weightHistory.map(entry => entry.itemCount);
    const weightData = weightHistory.map(entry => entry.weight);
    
    inventoryChart.data.labels = labels;
    inventoryChart.data.datasets[0].data = itemData;
    inventoryChart.data.datasets[1].data = weightData;
    
    // Use 'none' mode for better performance
    inventoryChart.update('none');
}

function addLogEntry(message, type = 'info', weight = null) {
    const timestamp = new Date();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    
    let logMessage = message;
    if (weight !== null) {
        logMessage = `${message} - Weight: ${weight.toFixed(2)} kg`;
    }
    
    logEntry.innerHTML = `
        <span class="log-timestamp">${formatTimestamp(timestamp)}</span>
        ${logMessage}
    `;
    
    logsContainer.insertBefore(logEntry, logsContainer.firstChild);
    
    // Store log with data for export
    allLogs.unshift({
        timestamp: timestamp.toISOString(),
        type: type,
        message: message,
        weight: weight
    });
    
    // Keep only last 100 log entries in DOM
    const logEntries = logsContainer.querySelectorAll('.log-entry');
    if (logEntries.length > 100) {
        logEntries[logEntries.length - 1].remove();
    }
    
    // Keep last 1000 logs in memory for export
    if (allLogs.length > 1000) {
        allLogs = allLogs.slice(0, 1000);
    }
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionIndicator.className = 'indicator connected';
        connectionText.textContent = 'Connected';
        addLogEntry('Connected to server', 'success');
    } else {
        connectionIndicator.className = 'indicator disconnected';
        connectionText.textContent = 'Disconnected';
        addLogEntry('Disconnected from server', 'error');
        weightValue.textContent = '---';
        lastUpdate.textContent = 'Connection lost...';
    }
}

function exportLogsToCSV() {
    if (allLogs.length === 0) {
        alert('No logs to export');
        return;
    }
    
    // Create CSV content
    let csvContent = 'Timestamp,Type,Message,Weight (kg)\n';
    
    allLogs.forEach(log => {
        const weight = log.weight !== null ? log.weight.toFixed(2) : '';
        const message = log.message.replace(/,/g, ';'); // Replace commas in message
        csvContent += `${log.timestamp},${log.type},${message},${weight}\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const filename = `weight-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLogEntry(`Exported ${allLogs.length} logs to ${filename}`, 'info');
}

// Socket event handlers
socket.on('connect', () => {
    updateConnectionStatus(true);
    socket.emit('get-devices');
    socket.emit('get-weight-history'); // Request historical data on connect
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

socket.on('device-connected', (device) => {
    addLogEntry(`Device connected: ${device.deviceId}`, 'success');
});

socket.on('device-disconnected', (device) => {
    addLogEntry(`Device disconnected: ${device.deviceId}`, 'warning');
    weightValue.textContent = '---';
    lastUpdate.textContent = 'Device disconnected';
});

socket.on('iot-data', (data) => {
    const weight = parseWeight(data.data);
    
    if (weight !== null && !isNaN(weight)) {
        updateWeightDisplay(weight, data.timestamp);
        
        // Check for stabilization (3-second buffer)
        checkStabilization(weight, data.timestamp);
    } else {
        addLogEntry(`Invalid weight data received: ${data.data}`, 'warning');
    }
});

socket.on('weight-history', (history) => {
    addLogEntry(`Loaded ${history.length} historical measurements from server`, 'success');
    
    // Clear existing history and load from server
    weightHistory = [];
    
    // Process historical data - Note: old data won't have item counts, calculate them
    history.forEach(entry => {
        const weight = parseWeight(entry.data);
        if (weight !== null && !isNaN(weight)) {
            const itemCount = calculateItemCount(weight);
            weightHistory.push({
                weight: weight,
                itemCount: itemCount,
                timestamp: entry.timestamp
            });
        }
    });
    
    // Update display with most recent weight if available
    if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1];
        updateWeightDisplay(latest.weight, latest.timestamp);
        lastStableWeight = latest.weight;
        lastStableItemCount = latest.itemCount;
    }
    
    // Update chart with historical data
    updateChart();
});

socket.on('mqtt-status', (status) => {
    if (status.connected) {
        mqttIndicator.className = 'indicator connected';
        mqttText.textContent = `MQTT: Connected (${status.topic})`;
        addLogEntry(`MQTT connected to ${status.broker}`, 'success');
    } else {
        mqttIndicator.className = 'indicator disconnected';
        mqttText.textContent = 'MQTT: Disconnected';
        if (status.error) {
            addLogEntry(`MQTT error: ${status.error}`, 'error');
        } else {
            addLogEntry('MQTT disconnected', 'warning');
        }
    }
});

// Event listeners
clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
    allLogs = [];
    addLogEntry('Logs cleared', 'info');
});

exportLogsBtn.addEventListener('click', () => {
    exportLogsToCSV();
});

applyConfigBtn.addEventListener('click', () => {
    applyConfiguration();
});

allowAddingToggle.addEventListener('change', () => {
    inventoryConfig.allowAdding = allowAddingToggle.checked;
    addLogEntry(`${allowAddingToggle.checked ? 'Enabled' : 'Disabled'} adding items`, 'info');
});

allowRemovingToggle.addEventListener('change', () => {
    inventoryConfig.allowRemoving = allowRemovingToggle.checked;
    addLogEntry(`${allowRemovingToggle.checked ? 'Enabled' : 'Disabled'} removing items`, 'info');
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    addLogEntry('Inventory counting system initialized', 'info');
    updateConnectionStatus(false);
    
    // Apply initial configuration
    applyConfiguration();
});