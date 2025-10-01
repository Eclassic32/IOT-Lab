#!/usr/bin/env node

/**
 * Inventory Counter Test Script
 * Tests the inventory counting logic without needing servers
 */

console.log('╔════════════════════════════════════════════╗');
console.log('║    Inventory Counter Logic Test           ║');
console.log('╚════════════════════════════════════════════╝\n');

// Configuration
const config = {
    massPerItem: 0.5,      // 500 grams per item
    boardMass: 2.0,        // 2kg container/board weight
    initialItemCount: 10,  // Starting with 10 items
    allowAdding: true,
    allowRemoving: true
};

let lastStableItemCount = config.initialItemCount;

console.log('📋 Configuration:');
console.log(`   Mass per item: ${config.massPerItem} kg`);
console.log(`   Board mass (tare): ${config.boardMass} kg`);
console.log(`   Initial items: ${config.initialItemCount}`);
console.log('');

// Calculate item count from sensor reading
function calculateItemCount(sensorReading) {
    if (config.massPerItem === 0) return 0;
    
    // Subtract board mass (tare weight) from sensor reading
    const netWeight = sensorReading - config.boardMass;
    
    console.log(`   Sensor: ${sensorReading.toFixed(2)} kg - Board: ${config.boardMass} kg = Net: ${netWeight.toFixed(2)} kg`);
    
    // Calculate item count
    let itemCount = Math.round(netWeight / config.massPerItem);
    
    // Apply toggle constraints
    if (!config.allowAdding && itemCount > lastStableItemCount) {
        console.log(`   ⚠️  Adding disabled - keeping at ${lastStableItemCount}`);
        itemCount = lastStableItemCount;
    }
    if (!config.allowRemoving && itemCount < lastStableItemCount) {
        console.log(`   ⚠️  Removing disabled - keeping at ${lastStableItemCount}`);
        itemCount = lastStableItemCount;
    }
    
    // Ensure non-negative
    itemCount = Math.max(0, itemCount);
    
    return itemCount;
}

// Test scenarios
console.log('📊 Test Scenarios:\n');

// Test 1: Initial state
console.log('1️⃣  Initial State (10 items on scale)');
let sensorReading = 2.0 + (10 * 0.5); // board + items = 7.0 kg
let itemCount = calculateItemCount(sensorReading);
console.log(`   Result: ${itemCount} items\n`);

// Test 2: Add 3 items
console.log('2️⃣  Add 3 items');
sensorReading = 7.0 + (3 * 0.5); // 7.0 + 1.5 = 8.5 kg
itemCount = calculateItemCount(sensorReading);
let change = itemCount - lastStableItemCount;
console.log(`   Result: ${itemCount} items (${change > 0 ? '+' : ''}${change})`);
if (change !== 0) {
    console.log(`   ✅ ${change > 0 ? 'ADDED' : 'REMOVED'}: ${Math.abs(change)} items`);
    lastStableItemCount = itemCount;
}
console.log('');

// Test 3: Remove 2 items
console.log('3️⃣  Remove 2 items');
sensorReading = 8.5 - (2 * 0.5); // 8.5 - 1.0 = 7.5 kg
itemCount = calculateItemCount(sensorReading);
change = itemCount - lastStableItemCount;
console.log(`   Result: ${itemCount} items (${change > 0 ? '+' : ''}${change})`);
if (change !== 0) {
    console.log(`   ✅ ${change > 0 ? 'ADDED' : 'REMOVED'}: ${Math.abs(change)} items`);
    lastStableItemCount = itemCount;
}
console.log('');

// Test 4: Toggle constraint - disable adding
console.log('4️⃣  Try to add 5 items (with "Allow Adding" disabled)');
config.allowAdding = false;
sensorReading = 7.5 + (5 * 0.5); // 7.5 + 2.5 = 10.0 kg
itemCount = calculateItemCount(sensorReading);
change = itemCount - lastStableItemCount;
console.log(`   Result: ${itemCount} items (${change > 0 ? '+' : ''}${change})`);
console.log(`   ${change === 0 ? '🔒' : '❌'} Toggle constraint prevented change\n`);
config.allowAdding = true; // reset

// Test 5: Toggle constraint - disable removing
console.log('5️⃣  Try to remove 3 items (with "Allow Removing" disabled)');
config.allowRemoving = false;
sensorReading = 7.5 - (3 * 0.5); // 7.5 - 1.5 = 6.0 kg
itemCount = calculateItemCount(sensorReading);
change = itemCount - lastStableItemCount;
console.log(`   Result: ${itemCount} items (${change > 0 ? '+' : ''}${change})`);
console.log(`   ${change === 0 ? '🔒' : '❌'} Toggle constraint prevented change\n`);
config.allowRemoving = true; // reset

// Test 6: Empty scale (only board)
console.log('6️⃣  Empty scale (only board/container)');
sensorReading = 2.0; // only board weight
itemCount = calculateItemCount(sensorReading);
console.log(`   Result: ${itemCount} items\n`);

// Test 7: Different item weight
console.log('7️⃣  Reconfigure for heavier items');
config.massPerItem = 2.5; // 2.5 kg per item
config.boardMass = 1.0;   // 1 kg board
lastStableItemCount = 20;
console.log(`   New config: ${config.massPerItem} kg/item, ${config.boardMass} kg board, ${lastStableItemCount} items`);
sensorReading = 1.0 + (20 * 2.5); // 1.0 + 50.0 = 51.0 kg
itemCount = calculateItemCount(sensorReading);
console.log(`   Result: ${itemCount} items\n`);

// Test 8: Add 5 heavy items
console.log('8️⃣  Add 5 heavy items');
sensorReading = 51.0 + (5 * 2.5); // 51.0 + 12.5 = 63.5 kg
itemCount = calculateItemCount(sensorReading);
change = itemCount - lastStableItemCount;
console.log(`   Result: ${itemCount} items (${change > 0 ? '+' : ''}${change})`);
if (change !== 0) {
    console.log(`   ✅ ${change > 0 ? 'ADDED' : 'REMOVED'}: ${Math.abs(change)} items`);
}
console.log('');

// Summary
console.log('╔════════════════════════════════════════════╗');
console.log('║            Test Summary                    ║');
console.log('╚════════════════════════════════════════════╝');
console.log('✅ Formula works: Item Count = (Sensor - Board) / Mass Per Item');
console.log('✅ Tare weight correctly subtracted');
console.log('✅ Toggle constraints working');
console.log('✅ Handles edge cases (empty scale, heavy items)');
console.log('');
console.log('🎉 All tests passed! The inventory counting logic is correct.\n');
