require('dotenv').config();

const mqtt = require('mqtt');

// Environment/config
const BROKER_URL = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const RAW_TOPIC = process.env.MQTT_TOPIC_RAW || 'weight/sensor/#';
const OUTPUT_PREFIX = process.env.MQTT_TOPIC_STABLE_PREFIX || 'weight/stable/';
const CLIENT_ID = 'mqtt-stabilizer-' + Math.random().toString(16).slice(2, 8);

// Stabilization parameters
const WINDOW_SECONDS = parseFloat(process.env.STAB_WINDOW_SEC || '2.5');
const MAX_DELTA_KG = parseFloat(process.env.STAB_MAX_DELTA_KG || '0.02'); // 20 g
const PUBLISH_MIN_INTERVAL_MS = parseInt(process.env.STAB_MIN_PUB_MS || '500');

// State per device/topic
// key: deviceId (last path segment), value: { samples: Array<{t, v}>, lastPublishedAt, lastPublishedValue }
const stateByDevice = new Map();

function nowMs() { return Date.now(); }

function parseWeightKg(payload) {
  const str = payload.toString();
  const m = str.match(/(\d+\.?\d*)/);
  if (!m) return null;
  const val = parseFloat(m[1]);
  if (Number.isNaN(val)) return null;
  return val; // assume already in kg
}

function getDeviceIdFromTopic(topic) {
  const parts = topic.split('/');
  return parts[parts.length - 1] || 'UNKNOWN_DEVICE';
}

function outputTopicFor(topic) {
  // Replace leading prefix (e.g., weight/sensor/DEVICE) with weight/stable/DEVICE
  const deviceId = getDeviceIdFromTopic(topic);
  return OUTPUT_PREFIX + deviceId;
}

function ensureDeviceState(deviceId) {
  if (!stateByDevice.has(deviceId)) {
    stateByDevice.set(deviceId, {
      samples: [],
      lastPublishedAt: 0,
      lastPublishedValue: null
    });
  }
  return stateByDevice.get(deviceId);
}

function appendSample(deviceState, valueKg) {
  const t = nowMs();
  deviceState.samples.push({ t, v: valueKg });
  // Drop samples older than WINDOW_SECONDS
  const cutoff = t - WINDOW_SECONDS * 1000;
  while (deviceState.samples.length && deviceState.samples[0].t < cutoff) {
    deviceState.samples.shift();
  }
}

function isStable(deviceState) {
  if (deviceState.samples.length < 3) return false;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of deviceState.samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
  }
  return (max - min) <= MAX_DELTA_KG;
}

function averageValue(deviceState) {
  if (deviceState.samples.length === 0) return null;
  let sum = 0;
  for (const s of deviceState.samples) sum += s.v;
  return sum / deviceState.samples.length;
}

function formatKg(value) {
  return value.toFixed(2);
}

function start() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║        MQTT Weight Stabilizer             ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`🔌 Broker: ${BROKER_URL}`);
  console.log(`📡 Subscribing RAW: ${RAW_TOPIC}`);
  console.log(`📮 Publishing STABLE prefix: ${OUTPUT_PREFIX}<deviceId>`);

  const client = mqtt.connect(BROKER_URL, {
    clientId: CLIENT_ID,
    clean: true,
    reconnectPeriod: 1000,
    connectTimeout: 30000,
  });

  client.on('connect', () => {
    console.log('✅ Stabilizer connected to MQTT');
    client.subscribe(RAW_TOPIC, (err) => {
      if (err) {
        console.error('❌ Stabilizer subscribe error:', err.message);
      } else {
        console.log('📡 Stabilizer subscribed');
      }
    });
  });

  client.on('message', (topic, payload) => {
    const deviceId = getDeviceIdFromTopic(topic);
    const stableTopic = outputTopicFor(topic);
    const valueKg = parseWeightKg(payload);
    if (valueKg == null) {
      // ignore non-numeric payloads
      return;
    }

    const st = ensureDeviceState(deviceId);
    appendSample(st, valueKg);

    if (isStable(st)) {
      const avg = averageValue(st);
      const now = nowMs();
      if (
        st.lastPublishedValue === null ||
        Math.abs(avg - st.lastPublishedValue) > MAX_DELTA_KG ||
        now - st.lastPublishedAt >= PUBLISH_MIN_INTERVAL_MS
      ) {
        const out = formatKg(avg);
        client.publish(stableTopic, out, { qos: 0 }, (err) => {
          if (err) {
            console.error('⚠️  Stabilizer publish failed:', err.message);
          } else {
            console.log(`📤 STABLE [${stableTopic}] ${out} kg`);
            st.lastPublishedAt = now;
            st.lastPublishedValue = avg;
          }
        });
      }
    }
  });

  client.on('error', (err) => {
    console.error('🔥 Stabilizer MQTT error:', err.message);
  });

  client.on('reconnect', () => {
    console.log('🔄 Stabilizer reconnecting...');
  });
}

if (require.main === module) {
  start();
}

module.exports = { start };




