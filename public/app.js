// Initialize Socket.IO connection
const socket = io();

// DOM elements
const connectionIndicator = document.getElementById('connection-indicator');
const connectionText = document.getElementById('connection-text');
const mqttIndicator = document.getElementById('mqtt-indicator');
const mqttText = document.getElementById('mqtt-text');
const weightValue = document.getElementById('weight-value');
const lastUpdate = document.getElementById('last-update');
const logsContainer = document.getElementById('logs-list');
const clearLogsBtn = document.getElementById('clear-logs');
const exportLogsBtn = document.getElementById('export-logs');

// Item counting DOM elements
const itemCountValue = document.getElementById('item-count-value');
const itemCountChange = document.getElementById('item-count-change');
const configBtn = document.getElementById('config-btn');
const resetCountBtn = document.getElementById('reset-count-btn');
const configModal = document.getElementById('config-modal');
const configForm = document.getElementById('item-config-form');

// Data storage
let weightHistory = [];
let allLogs = [];
const MAX_HISTORY_MINUTES = 5;
const MAX_HISTORY_POINTS = 300; // 5 minutes * 60 seconds

// Item counting data
let currentItemCount = null;
let itemCountAnimFrame = null;
let itemCountAnimStart = null;
let itemCountAnimFrom = null;
let itemCountAnimTo = null;
let itemConfig = null;
const ITEM_COUNT_ANIM_DURATION_MS = 400;

// Chart initialization
let weightChart = null;
let currentWeight = null;
let weightAnimFrame = null;
let weightAnimStart = null;
let weightAnimFrom = null;
let weightAnimTo = null;
const WEIGHT_ANIM_DURATION_MS = 600;

function initChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Weight (kg)',
                data: [],
                borderColor: '#4299e1',
                backgroundColor: 'rgba(66, 153, 225, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#4299e1',
                pointBorderColor: '#fff',
                pointBorderWidth: 0
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
                    display: true,
                    title: {
                        display: true,
                        text: 'Weight (kg)',
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    beginAtZero: false
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

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function animateWeightTo(targetWeight, timestamp) {
    // Initialize current weight if first run
    if (currentWeight === null || isNaN(currentWeight)) {
        currentWeight = targetWeight;
        weightValue.textContent = currentWeight.toFixed(2);
        lastUpdate.textContent = `Last update: ${formatTimestamp(timestamp)}`;
        return;
    }

    // Cancel any ongoing animation
    if (weightAnimFrame) {
        cancelAnimationFrame(weightAnimFrame);
        weightAnimFrame = null;
    }

    weightAnimStart = null;
    weightAnimFrom = currentWeight;
    weightAnimTo = targetWeight;
    
    // Add a subtle scale effect without color change
    weightValue.classList.add('updating');

    const step = (now) => {
        if (!weightAnimStart) weightAnimStart = now;
        const elapsed = now - weightAnimStart;
        const t = Math.min(1, elapsed / WEIGHT_ANIM_DURATION_MS);
        const eased = easeOutCubic(t);
        const value = weightAnimFrom + (weightAnimTo - weightAnimFrom) * eased;
        weightValue.textContent = value.toFixed(2);

        if (t < 1) {
            weightAnimFrame = requestAnimationFrame(step);
        } else {
            currentWeight = targetWeight;
            weightValue.textContent = currentWeight.toFixed(2);
            weightValue.classList.remove('updating');
            lastUpdate.textContent = `Last update: ${formatTimestamp(timestamp)}`;
        }
    };

    weightAnimFrame = requestAnimationFrame(step);
}

function updateWeightDisplay(weight, timestamp) {
    animateWeightTo(weight, timestamp);
}

// Item counting functions
function animateItemCountTo(targetCount) {
    // Initialize current item count if first run
    if (currentItemCount === null || isNaN(currentItemCount)) {
        currentItemCount = targetCount;
        itemCountValue.textContent = currentItemCount;
        return;
    }

    // Cancel any ongoing animation
    if (itemCountAnimFrame) {
        cancelAnimationFrame(itemCountAnimFrame);
        itemCountAnimFrame = null;
    }

    itemCountAnimStart = null;
    itemCountAnimFrom = currentItemCount;
    itemCountAnimTo = targetCount;
    
    // Add a subtle scale effect
    itemCountValue.classList.add('updating');

    const step = (now) => {
        if (!itemCountAnimStart) itemCountAnimStart = now;
        const elapsed = now - itemCountAnimStart;
        const t = Math.min(1, elapsed / ITEM_COUNT_ANIM_DURATION_MS);
        const eased = easeOutCubic(t);
        const value = Math.round(itemCountAnimFrom + (itemCountAnimTo - itemCountAnimFrom) * eased);
        itemCountValue.textContent = value;

        if (t < 1) {
            itemCountAnimFrame = requestAnimationFrame(step);
        } else {
            currentItemCount = targetCount;
            itemCountValue.textContent = currentItemCount;
            itemCountValue.classList.remove('updating');
        }
    };

    itemCountAnimFrame = requestAnimationFrame(step);
}

function updateItemCountDisplay(itemCount, countChange) {
    if (itemCount !== null && itemCount !== undefined) {
        animateItemCountTo(itemCount);
    }
    
    // Show item count change
    if (countChange && countChange !== 0) {
        const changeText = countChange > 0 ? `+${countChange} items added` : `${countChange} items removed`;
        itemCountChange.textContent = changeText;
        itemCountChange.className = countChange > 0 ? 'item-count-change positive' : 'item-count-change negative';
        
        // Clear the change message after 3 seconds
        setTimeout(() => {
            if (itemCountChange.textContent === changeText) {
                itemCountChange.textContent = '';
                itemCountChange.className = 'item-count-change';
            }
        }, 3000);
    }
}

function addToHistory(weight, timestamp) {
    weightHistory.push({
        weight: weight,
        timestamp: timestamp
    });
    
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
    if (!weightChart || weightHistory.length === 0) return;
    
    const labels = weightHistory.map(entry => formatTimeShort(entry.timestamp));
    const data = weightHistory.map(entry => entry.weight);
    
    weightChart.data.labels = labels;
    weightChart.data.datasets[0].data = data;
    
    // Use 'none' mode for better performance with 1-second updates
    weightChart.update('none');
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
    // Prefer numeric field from server if present
    const candidate = (typeof data.weightKg === 'number') ? data.weightKg : parseWeight(data.data);

    // Always show latest reading in UI if it is a valid number
    if (candidate !== null && !isNaN(candidate)) {
        const isStable = (data.status || '').toLowerCase() === 'stable';
        // Toggle state BEFORE animating to ensure immediate color update
        if (isStable) {
            weightValue.classList.remove('unstable');
        } else {
            weightValue.classList.add('unstable');
        }

        updateWeightDisplay(candidate, data.timestamp);

        // Update item count display if available
        if (data.itemCount !== null && data.itemCount !== undefined) {
            updateItemCountDisplay(data.itemCount, data.itemCountChange);
        }

        // Add to history and chart for both stable and unstable readings
        addToHistory(candidate, data.timestamp);
        if (isStable) {
            addLogEntry('Stable weight measurement', 'info', candidate);
            if (data.itemCountChange && data.itemCountChange !== 0) {
                const changeText = data.itemCountChange > 0 ? `${data.itemCountChange} items added` : `${Math.abs(data.itemCountChange)} items removed`;
                addLogEntry(changeText, 'info');
            }
        } else {
            addLogEntry('Unstable reading (plotted, server not persisting)', 'warning', candidate);
        }
    } else {
        addLogEntry(`Invalid weight data received: ${data.data}`, 'warning');
    }
});

socket.on('weight-history', (history) => {
    addLogEntry(`Loaded ${history.length} historical measurements from server`, 'success');
    
    // Clear existing history and load from server
    weightHistory = [];
    
    // Process historical data
    history.forEach(entry => {
        const weight = parseWeight(entry.data);
        if (weight !== null && !isNaN(weight)) {
            weightHistory.push({
                weight: weight,
                timestamp: entry.timestamp
            });
        }
    });
    
    // Update display with most recent weight if available
    if (weightHistory.length > 0) {
        const latest = weightHistory[weightHistory.length - 1];
        updateWeightDisplay(latest.weight, latest.timestamp);
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

// Optional: listen for device-status updates
socket.on('device-status', (payload) => {
    const s = (payload.status || '').toLowerCase();
    if (s === 'stable') {
        addLogEntry(`Device ${payload.deviceId} is stable`, 'success');
        weightValue.classList.remove('unstable');
    } else if (s === 'unstable') {
        addLogEntry(`Device ${payload.deviceId} is unstable`, 'warning');
        weightValue.classList.add('unstable');
    } else if (s) {
        addLogEntry(`Device ${payload.deviceId} status: ${s}`, 'info');
    }
});

// Item counting socket handlers
socket.on('item-config', (data) => {
    itemConfig = data.config;
    currentItemCount = data.state.currentItemCount;
    updateItemCountDisplay(currentItemCount, 0);
    addLogEntry('Item counting configuration loaded', 'info');
});

socket.on('item-config-updated', (data) => {
    itemConfig = data.config;
    currentItemCount = data.state.currentItemCount;
    updateItemCountDisplay(currentItemCount, 0);
    addLogEntry('Item counting configuration updated', 'success');
});

socket.on('item-count-reset', (data) => {
    currentItemCount = data.itemCount;
    updateItemCountDisplay(currentItemCount, 0);
    addLogEntry(`Item count reset to ${data.itemCount}`, 'info');
});

// Modal functions
function openConfigModal() {
    if (!itemConfig) {
        // Request current config if not loaded
        socket.emit('get-item-config');
        setTimeout(openConfigModal, 100);
        return;
    }
    
    // Populate form with current configuration
    document.getElementById('single-item-mass').value = itemConfig.singleItemMass;
    document.getElementById('initial-item-count').value = itemConfig.initialItemCount;
    document.getElementById('container-mass').value = itemConfig.containerMass;
    document.getElementById('error-range-min').value = itemConfig.errorRangeMin;
    document.getElementById('error-range-max').value = itemConfig.errorRangeMax;
    document.getElementById('enable-adding').checked = itemConfig.enableAdding;
    document.getElementById('enable-removing').checked = itemConfig.enableRemoving;
    
    configModal.style.display = 'block';
}

function closeConfigModal() {
    configModal.style.display = 'none';
}

function saveItemConfig() {
    const config = {
        singleItemMass: parseFloat(document.getElementById('single-item-mass').value),
        initialItemCount: parseInt(document.getElementById('initial-item-count').value),
        containerMass: parseFloat(document.getElementById('container-mass').value),
        errorRangeMin: parseFloat(document.getElementById('error-range-min').value),
        errorRangeMax: parseFloat(document.getElementById('error-range-max').value),
        enableAdding: document.getElementById('enable-adding').checked,
        enableRemoving: document.getElementById('enable-removing').checked
    };
    
    // Validate configuration
    if (isNaN(config.singleItemMass) || config.singleItemMass <= 0) {
        alert('Single item mass must be a positive number');
        return;
    }
    if (isNaN(config.initialItemCount) || config.initialItemCount < 0) {
        alert('Initial item count must be a non-negative number');
        return;
    }
    if (isNaN(config.containerMass) || config.containerMass < 0) {
        alert('Container mass must be a non-negative number');
        return;
    }
    if (isNaN(config.errorRangeMin) || isNaN(config.errorRangeMax)) {
        alert('Error range values must be valid numbers');
        return;
    }
    
    // Send configuration to server
    fetch('/api/item-config', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            closeConfigModal();
            addLogEntry('Item counting configuration saved', 'success');
        }
    })
    .catch(error => {
        console.error('Error saving configuration:', error);
        alert('Failed to save configuration');
    });
}

function resetItemCount() {
    const newCount = prompt('Enter new item count:', currentItemCount || 0);
    if (newCount === null) return;
    
    const count = parseInt(newCount);
    if (isNaN(count) || count < 0) {
        alert('Item count must be a non-negative number');
        return;
    }
    
    fetch('/api/reset-item-count', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemCount: count }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            addLogEntry(`Item count reset to ${count}`, 'success');
        }
    })
    .catch(error => {
        console.error('Error resetting count:', error);
        alert('Failed to reset item count');
    });
}

// Event listeners
clearLogsBtn.addEventListener('click', () => {
    logsContainer.innerHTML = '';
    allLogs = [];
    addLogEntry('Logs cleared', 'info');
});

exportLogsBtn.addEventListener('click', () => {
    exportLogsToCSV();
});

// Item counting event listeners
configBtn.addEventListener('click', openConfigModal);
resetCountBtn.addEventListener('click', resetItemCount);

// Modal event listeners
configModal.querySelector('.close').addEventListener('click', closeConfigModal);
document.getElementById('cancel-config').addEventListener('click', closeConfigModal);
configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveItemConfig();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === configModal) {
        closeConfigModal();
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    addLogEntry('Weight monitoring system initialized', 'info');
    updateConnectionStatus(false);
    
    // Request item counting configuration
    setTimeout(() => {
        socket.emit('get-item-config');
    }, 1000);
});