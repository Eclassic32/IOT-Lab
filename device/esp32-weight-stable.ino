#include <WiFi.h>
#include <PubSubClient.h>
#include <HX711_ADC.h>

// ------- Wi-Fi / MQTT -------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_HOST     = "192.168.1.100";   // IP/host брокера
const uint16_t MQTT_PORT  = 1883;
const char* DEVICE_ID     = "WEIGHT_SCALE_001";
const char* TOPIC_WEIGHT  = "weight/sensor/WEIGHT_SCALE_001"; // можно собрать как "weight/sensor/" + DEVICE_ID
const char* TOPIC_STATUS  = "weight/sensor/WEIGHT_SCALE_001/status"; // опционально

// ------- Датчик HX711 -------
const int HX711_DT_PIN = 13;
const int HX711_SCK_PIN = 12;
const float CAL_FACTOR = 274.7355f; // ваш калибровочный коэффициент (в граммах)

// ------- Фильтр и стабилизация -------
const int SMA_WINDOW = 15;                  // окно скользящего среднего для сглаживания (быстрый отклик)
const float STAB_WINDOW_SEC = 2.5f;         // длительность окна стабильности (сек)
const float STAB_MAX_DELTA_KG = 0.02f;      // максимальный разброс в окне (кг), 0.02=20г
const unsigned long PUBLISH_PERIOD_MS = 1000; // публиковать каждую секунду

// Кольцевой буфер для окна стабильности (по времени), рассчитан под ~80 Гц
// 80 Гц * 2.5 сек ≈ 200; берем 256 для запаса
const int STAB_BUFFER_CAPACITY = 256;

WiFiClient espClient;
PubSubClient mqttClient(espClient);
HX711_ADC loadCell(HX711_DT_PIN, HX711_SCK_PIN);

// Скользящее среднее
float smaValues[SMA_WINDOW];
int smaIndex = 0;
float smaSum = 0.0f;
float smaAvg = 0.0f;

// Буфер стабильности
struct Sample {
  unsigned long tMs;
  float valueKg;
};
Sample stabBuffer[STAB_BUFFER_CAPACITY];
int stabHead = 0;     // следующая позиция для записи
int stabCount = 0;    // текущее число элементов

// Публикация
unsigned long lastPublishMs = 0;  // время последней периодической публикации
float lastPublishedKg = NAN;

// ---- helpers ----
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.print("\nWiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  while (!mqttClient.connected()) {
    String clientId = String("esp32-weight-") + String((uint32_t)ESP.getEfuseMac(), HEX);
    Serial.printf("MQTT connecting as %s ... ", clientId.c_str());
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      // статус (опционально)
      mqttClient.publish(TOPIC_STATUS, "boot");
    } else {
      Serial.printf("failed (rc=%d), retry in 2s\n", mqttClient.state());
      delay(2000);
    }
  }
}

void publishStatus(const char* status) {
  mqttClient.publish(TOPIC_STATUS, status, false);
}

void publishWeightKg(float kg) {
  char payload[16];
  dtostrf(kg, 0, 2, payload); // "75.50"
  if (mqttClient.publish(TOPIC_WEIGHT, payload, false)) {
    Serial.print("Published: ");
    Serial.print(payload);
    Serial.println(" kg");
  } else {
    Serial.println("Publish failed");
  }
}

void smaInit() {
  for (int i = 0; i < SMA_WINDOW; i++) smaValues[i] = 0.0f;
  smaIndex = 0;
  smaSum = 0.0f;
  smaAvg = 0.0f;
}

void stabBufferClear() {
  stabHead = 0;
  stabCount = 0;
}

void stabBufferPush(float valueKg) {
  unsigned long t = millis();
  stabBuffer[stabHead] = { t, valueKg };
  stabHead = (stabHead + 1) % STAB_BUFFER_CAPACITY;
  if (stabCount < STAB_BUFFER_CAPACITY) {
    stabCount++;
  }
  // удалить устаревшие (вышедшие за окно по времени)
  const unsigned long cutoff = t - (unsigned long)(STAB_WINDOW_SEC * 1000.0f);
  // будем выталкивать «самые старые» элементы, пока count>0 и старший элемент старее cutoff
  // старший элемент: индекс (stabHead - stabCount + capacity) % capacity
  while (stabCount > 0) {
    int oldestIdx = (stabHead - stabCount + STAB_BUFFER_CAPACITY) % STAB_BUFFER_CAPACITY;
    if (stabBuffer[oldestIdx].tMs >= cutoff) break;
    stabCount--;
  }
}

bool computeWindowMinMax(float& outMin, float& outMax) {
  if (stabCount < 3) return false;
  outMin = FLT_MAX;
  outMax = -FLT_MAX;
  for (int i = 0; i < stabCount; i++) {
    int idx = (stabHead - stabCount + i + STAB_BUFFER_CAPACITY) % STAB_BUFFER_CAPACITY;
    float v = stabBuffer[idx].valueKg;
    if (v < outMin) outMin = v;
    if (v > outMax) outMax = v;
  }
  return true;
}

bool computeWindowAverage(float& outAvg) {
  if (stabCount == 0) return false;
  double sum = 0.0;
  for (int i = 0; i < stabCount; i++) {
    int idx = (stabHead - stabCount + i + STAB_BUFFER_CAPACITY) % STAB_BUFFER_CAPACITY;
    sum += stabBuffer[idx].valueKg;
  }
  outAvg = (float)(sum / stabCount);
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  smaInit();
  stabBufferClear();

  loadCell.begin();
  loadCell.start(2000, true); // стабилизация и tare
  loadCell.setCalFactor(CAL_FACTOR);

  connectWiFi();
  connectMQTT();

  Serial.println("ESP32 MQTT weight with stability detector ready.");
  Serial.print("Publishing topic: ");
  Serial.println(TOPIC_WEIGHT);
}

void handleSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == 't' || c == 'T') {
      loadCell.tare();
      stabBufferClear();                // сбросить окно после tare
      lastPublishedKg = NAN;            // сброс последнего значения
      publishStatus("tare");
      Serial.println("Scale tared");
    }
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqttClient.connected()) connectMQTT();
  mqttClient.loop();

  // Обновление HX711 и скользящее среднее (в граммах)
  if (loadCell.update()) {
    float grams = loadCell.getData(); // калибровка в граммах
    // SMA
    smaSum -= smaValues[smaIndex];
    smaValues[smaIndex] = grams;
    smaSum += smaValues[smaIndex];
    smaIndex++;
    if (smaIndex >= SMA_WINDOW) smaIndex = 0;
    smaAvg = smaSum / (float)SMA_WINDOW;

    // в кг
    float kg = smaAvg / 1000.0f;

    // окно стабильности (по времени)
    stabBufferPush(kg);

    // проверка стабильности окна
    float wMin, wMax;
    bool haveMM = computeWindowMinMax(wMin, wMax);
    bool isStable = false;
    if (haveMM) {
      isStable = (wMax - wMin) <= STAB_MAX_DELTA_KG;
    }

    // Периодическая публикация раз в секунду: всегда отправляем вес + статус
    unsigned long nowMs = millis();
    if (nowMs - lastPublishMs >= PUBLISH_PERIOD_MS) {
      float outKg = kg; // по умолчанию сглаженное текущее значение (SMA)
      if (isStable) {
        float avgKg;
        if (computeWindowAverage(avgKg)) {
          outKg = avgKg; // при стабильности используем среднее окна
        }
      }

      publishWeightKg(outKg);
      publishStatus(isStable ? "stable" : "unstable");
      lastPublishMs = nowMs;
      lastPublishedKg = outKg;
    }
  }

  handleSerial();
}



