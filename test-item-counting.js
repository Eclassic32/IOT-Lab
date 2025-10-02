const mqtt = require('mqtt');
const readline = require('readline');

// Connect to the same MQTT broker
const MQTT_BROKER = 'mqtt://test.mosquitto.org:1883';
const DEVICE_ID = 'WEIGHT_SCALE_001';
const TOPIC = `weight/sensor/${DEVICE_ID}`;
const STATUS_TOPIC = `${TOPIC}/status`;

const client = mqtt.connect(MQTT_BROKER);

// Create readline interface for user interaction
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let currentWeight = 2.0; // Start with 2kg (container + some items)

console.log('╔═══════════════════════════════════════╗');
console.log('║     Item Counting Test Simulator     ║');
console.log('╚═══════════════════════════════════════╝');
console.log('');
console.log('This simulator helps test item counting functionality.');
console.log('Configure item counting in the web interface first:');
console.log('- Single item mass: 0.1 kg');
console.log('- Container mass: 0.5 kg');
console.log('- Error range: -0.02 to +0.02 kg');
console.log('- Enable both adding and removing');
console.log('');

client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    console.log(`📮 Publishing to: ${TOPIC}`);
    console.log('');
    
    // Start with stable reading
    publishWeight(currentWeight, 'stable');
    
    showMenu();
});

function publishWeight(weight, status = 'stable') {
    client.publish(TOPIC, weight.toFixed(2));
    client.publish(STATUS_TOPIC, status);
    console.log(`📤 Published: ${weight.toFixed(2)} kg (${status})`);
}

function showMenu() {
    console.log('\n' + '═'.repeat(40));
    console.log('Commands:');
    console.log('1 - Add 1 item (+0.1kg)');
    console.log('2 - Add 5 items (+0.5kg)');
    console.log('3 - Remove 1 item (-0.1kg)');
    console.log('4 - Remove 3 items (-0.3kg)');
    console.log('5 - Set custom weight');
    console.log('6 - Send unstable readings');
    console.log('q - Quit');
    console.log('═'.repeat(40));
    
    rl.question('Enter command: ', (input) => {
        handleCommand(input.trim().toLowerCase());
    });
}

function handleCommand(cmd) {
    switch(cmd) {
        case '1':
            simulateAddItem(1);
            break;
        case '2':
            simulateAddItem(5);
            break;
        case '3':
            simulateRemoveItem(1);
            break;
        case '4':
            simulateRemoveItem(3);
            break;
        case '5':
            rl.question('Enter new weight (kg): ', (weight) => {
                const w = parseFloat(weight);
                if (!isNaN(w) && w >= 0) {
                    simulateWeightChange(w);
                } else {
                    console.log('Invalid weight entered');
                }
                showMenu();
            });
            return;
        case '6':
            simulateUnstableReadings();
            return;
        case 'q':
            console.log('👋 Goodbye!');
            client.end();
            rl.close();
            return;
        default:
            console.log('Invalid command');
    }
    showMenu();
}

function simulateAddItem(count) {
    const itemWeight = 0.1; // 100g per item
    const newWeight = currentWeight + (count * itemWeight);
    
    console.log(`\n🔄 Simulating adding ${count} item${count > 1 ? 's' : ''}...`);
    
    // First send some unstable readings
    publishWeight(currentWeight, 'unstable');
    setTimeout(() => publishWeight(currentWeight + 0.02, 'unstable'), 200);
    setTimeout(() => publishWeight(newWeight - 0.01, 'unstable'), 400);
    
    // Then send stable reading
    setTimeout(() => {
        currentWeight = newWeight;
        publishWeight(currentWeight, 'stable');
        console.log(`✅ Added ${count} item${count > 1 ? 's' : ''}, new weight: ${currentWeight.toFixed(2)} kg`);
    }, 800);
}

function simulateRemoveItem(count) {
    const itemWeight = 0.1; // 100g per item
    const newWeight = Math.max(0.5, currentWeight - (count * itemWeight)); // Don't go below container weight
    
    console.log(`\n🔄 Simulating removing ${count} item${count > 1 ? 's' : ''}...`);
    
    // First send some unstable readings
    publishWeight(currentWeight, 'unstable');
    setTimeout(() => publishWeight(currentWeight - 0.02, 'unstable'), 200);
    setTimeout(() => publishWeight(newWeight + 0.01, 'unstable'), 400);
    
    // Then send stable reading
    setTimeout(() => {
        currentWeight = newWeight;
        publishWeight(currentWeight, 'stable');
        console.log(`✅ Removed ${count} item${count > 1 ? 's' : ''}, new weight: ${currentWeight.toFixed(2)} kg`);
    }, 800);
}

function simulateWeightChange(newWeight) {
    console.log(`\n🔄 Changing weight to ${newWeight.toFixed(2)} kg...`);
    
    // Send unstable readings during transition
    publishWeight(currentWeight, 'unstable');
    setTimeout(() => publishWeight((currentWeight + newWeight) / 2, 'unstable'), 200);
    setTimeout(() => publishWeight(newWeight + 0.01, 'unstable'), 400);
    
    // Then stable
    setTimeout(() => {
        currentWeight = newWeight;
        publishWeight(currentWeight, 'stable');
        console.log(`✅ Weight changed to: ${currentWeight.toFixed(2)} kg`);
    }, 800);
}

function simulateUnstableReadings() {
    console.log('\n🔄 Sending unstable readings for 5 seconds...');
    
    let count = 0;
    const interval = setInterval(() => {
        const variation = (Math.random() - 0.5) * 0.1; // ±50g variation
        publishWeight(currentWeight + variation, 'unstable');
        count++;
        
        if (count >= 10) {
            clearInterval(interval);
            publishWeight(currentWeight, 'stable');
            console.log('✅ Returned to stable reading');
            showMenu();
        }
    }, 500);
}

client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    client.end();
    rl.close();
    process.exit(0);
});
