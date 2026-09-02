// =============================================================
//  main.cpp — ESP32 + MPU6050 Web Dashboard Firmware
//
//  Features:
//    - Reads Accelerometer (X/Y/Z), Gyroscope (X/Y/Z), Temperature
//    - EMA low-pass filter to smooth sensor noise
//    - Serves a real-time web dashboard via WiFi
//    - REST API: GET /api/sensor  → JSON data
//    - REST API: GET /api/status  → device health
//
//  Wiring:
//    MPU6050 VCC → ESP32 3.3V
//    MPU6050 GND → ESP32 GND
//    MPU6050 SDA → ESP32 GPIO 21
//    MPU6050 SCL → ESP32 GPIO 22
//    MPU6050 AD0 → GND (I2C addr = 0x68)
// =============================================================

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ESPAsyncWebServer.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include "config.h"

// ── Global Objects ────────────────────────────────────────────
Adafruit_MPU6050 mpu;
AsyncWebServer server(WEB_SERVER_PORT);

// ── Sensor Data Structure ─────────────────────────────────────
struct SensorData {
    float accel_x, accel_y, accel_z;   // m/s²
    float gyro_x,  gyro_y,  gyro_z;    // rad/s
    float temperature;                  // °C
    unsigned long timestamp;
    bool  valid;
};

SensorData sensorData = {0};

// ── EMA filter state ──────────────────────────────────────────
static bool  filterInitialized = false;
static float f_ax, f_ay, f_az;
static float f_gx, f_gy, f_gz;

// ── Batch buffer for HTTP POST ────────────────────────────────
struct BatchSample {
    unsigned long t;
    float ax, ay, az;
    float gx, gy, gz;
};
static BatchSample batch[BATCH_SIZE];
static int batchIndex = 0;

// ── Function Prototypes ───────────────────────────────────────
bool    initMPU6050();
bool    connectWiFi();
void    readSensor();
void    setupRoutes();
void    printSensorSerial();
String  buildJsonResponse();
void    sendToServer();

extern const char DASHBOARD_HTML[] PROGMEM;

// ─────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    delay(500);

    Serial.println("\n╔══════════════════════════════════════╗");
    Serial.println("║   ESP32 + MPU6050 Web Dashboard      ║");
    Serial.println("╚══════════════════════════════════════╝");

    Wire.begin(MPU_SDA_PIN, MPU_SCL_PIN);
    Serial.printf("[I2C] SDA=%d  SCL=%d\n", MPU_SDA_PIN, MPU_SCL_PIN);

    if (!initMPU6050()) {
        Serial.println("[ERROR] MPU6050 init failed. Check wiring!");
        while (1) { delay(1000); }
    }

    if (!connectWiFi()) {
        Serial.println("[WARN]  Running in Serial-only mode.");
    } else {
        setupRoutes();
        server.begin();
        Serial.println("[WEB]  Server started!");
        Serial.printf("[WEB]  Dashboard: http://%s/\n", WiFi.localIP().toString().c_str());
        Serial.printf("[WEB]  API:       http://%s/api/sensor\n", WiFi.localIP().toString().c_str());
    }

    Serial.println("\n[READY] Reading sensor data...\n");
}

// ─────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────
void loop() {
    static unsigned long lastSampleTime = 0;
    unsigned long now = millis();
    if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
        lastSampleTime = now;
        readSensor();
        printSensorSerial();

        // Add sample to batch buffer
        if (sensorData.valid) {
            batch[batchIndex] = {
                sensorData.timestamp,
                sensorData.accel_x, sensorData.accel_y, sensorData.accel_z,
                sensorData.gyro_x,  sensorData.gyro_y,  sensorData.gyro_z
            };
            batchIndex++;

            // When batch is full, send to server
            if (batchIndex >= BATCH_SIZE) {
                sendToServer();
                batchIndex = 0;
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  MPU6050 INITIALIZATION
// ─────────────────────────────────────────────────────────────
bool initMPU6050() {
    Serial.print("[MPU]  Initializing MPU6050... ");
    if (!mpu.begin(MPU_I2C_ADDR)) {
        Serial.println("FAILED");
        return false;
    }
    Serial.println("OK");
    mpu.setAccelerometerRange(ACCEL_RANGE);
    mpu.setGyroRange(GYRO_RANGE);
    mpu.setFilterBandwidth(FILTER_BANDWIDTH);
    Serial.println("[MPU]  Ranges & filter configured.");
    return true;
}

// ─────────────────────────────────────────────────────────────
//  WiFi CONNECTION
// ─────────────────────────────────────────────────────────────
bool connectWiFi() {
    Serial.printf("[WiFi] Connecting to '%s'", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - startTime > WIFI_TIMEOUT_MS) {
            Serial.println("\n[WiFi] Timeout!");
            return false;
        }
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n[WiFi] Connected!");
    Serial.printf("[WiFi] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] RSSI: %d dBm\n", WiFi.RSSI());
    return true;
}

// ─────────────────────────────────────────────────────────────
//  READ SENSOR (with EMA filter)
// ─────────────────────────────────────────────────────────────
void readSensor() {
    sensors_event_t accel_event, gyro_event, temp_event;

    if (!mpu.getEvent(&accel_event, &gyro_event, &temp_event)) {
        sensorData.valid = false;
        return;
    }

    float raw_ax = accel_event.acceleration.x;
    float raw_ay = accel_event.acceleration.y;
    float raw_az = accel_event.acceleration.z;
    float raw_gx = gyro_event.gyro.x;
    float raw_gy = gyro_event.gyro.y;
    float raw_gz = gyro_event.gyro.z;

    // Exponential Moving Average filter
    if (!filterInitialized) {
        f_ax = raw_ax; f_ay = raw_ay; f_az = raw_az;
        f_gx = raw_gx; f_gy = raw_gy; f_gz = raw_gz;
        filterInitialized = true;
    } else {
        f_ax = FILTER_ALPHA * raw_ax + (1.0f - FILTER_ALPHA) * f_ax;
        f_ay = FILTER_ALPHA * raw_ay + (1.0f - FILTER_ALPHA) * f_ay;
        f_az = FILTER_ALPHA * raw_az + (1.0f - FILTER_ALPHA) * f_az;
        f_gx = FILTER_ALPHA * raw_gx + (1.0f - FILTER_ALPHA) * f_gx;
        f_gy = FILTER_ALPHA * raw_gy + (1.0f - FILTER_ALPHA) * f_gy;
        f_gz = FILTER_ALPHA * raw_gz + (1.0f - FILTER_ALPHA) * f_gz;
    }

    sensorData.accel_x     = f_ax;
    sensorData.accel_y     = f_ay;
    sensorData.accel_z     = f_az;
    sensorData.gyro_x      = f_gx;
    sensorData.gyro_y      = f_gy;
    sensorData.gyro_z      = f_gz;
    sensorData.temperature = temp_event.temperature;
    sensorData.timestamp   = millis();
    sensorData.valid       = true;
}

// ─────────────────────────────────────────────────────────────
//  SERIAL PRINT
// ─────────────────────────────────────────────────────────────
void printSensorSerial() {
    if (!sensorData.valid) { Serial.println("[SENSOR] Read failed!"); return; }
    Serial.printf(
        "[t=%lums] Accel(m/s²): X=%7.3f  Y=%7.3f  Z=%7.3f  | "
        "Gyro(rad/s): X=%7.3f  Y=%7.3f  Z=%7.3f  | Temp: %.1f°C\n",
        sensorData.timestamp,
        sensorData.accel_x, sensorData.accel_y, sensorData.accel_z,
        sensorData.gyro_x,  sensorData.gyro_y,  sensorData.gyro_z,
        sensorData.temperature
    );
}

// ─────────────────────────────────────────────────────────────
//  BUILD JSON RESPONSE
// ─────────────────────────────────────────────────────────────
String buildJsonResponse() {
    JsonDocument doc;
    doc["timestamp"] = sensorData.timestamp;
    doc["valid"]     = sensorData.valid;

    JsonObject accel = doc["accelerometer"].to<JsonObject>();
    accel["x"]    = serialized(String(sensorData.accel_x, 4));
    accel["y"]    = serialized(String(sensorData.accel_y, 4));
    accel["z"]    = serialized(String(sensorData.accel_z, 4));
    accel["unit"] = "m/s²";

    JsonObject gyro = doc["gyroscope"].to<JsonObject>();
    gyro["x"]    = serialized(String(sensorData.gyro_x, 4));
    gyro["y"]    = serialized(String(sensorData.gyro_y, 4));
    gyro["z"]    = serialized(String(sensorData.gyro_z, 4));
    gyro["unit"] = "rad/s";

    doc["temperature"]["value"] = serialized(String(sensorData.temperature, 2));
    doc["temperature"]["unit"]  = "°C";

    doc["device"]["ssid"] = WIFI_SSID;
    doc["device"]["ip"]   = WiFi.localIP().toString();
    doc["device"]["rssi"] = WiFi.RSSI();

    String output;
    serializeJson(doc, output);
    return output;
}

// ─────────────────────────────────────────────────────────────
//  SEND BATCH TO SERVER
// ─────────────────────────────────────────────────────────────
void sendToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[HTTP]  WiFi not connected, skipping send.");
        return;
    }

    // Build JSON payload
    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    JsonArray samples = doc["samples"].to<JsonArray>();

    for (int i = 0; i < BATCH_SIZE; i++) {
        JsonObject s = samples.add<JsonObject>();
        s["t"]  = batch[i].t;
        s["ax"] = serialized(String(batch[i].ax, 4));
        s["ay"] = serialized(String(batch[i].ay, 4));
        s["az"] = serialized(String(batch[i].az, 4));
        s["gx"] = serialized(String(batch[i].gx, 4));
        s["gy"] = serialized(String(batch[i].gy, 4));
        s["gz"] = serialized(String(batch[i].gz, 4));
    }

    String payload;
    serializeJson(doc, payload);

    // Send HTTP POST
    HTTPClient http;
    String url = String(SERVER_URL) + SERVER_PATH;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(3000); // 3 second timeout

    int httpCode = http.POST(payload);

    if (httpCode == 200) {
        String response = http.getString();

        // Parse response
        JsonDocument res;
        if (deserializeJson(res, response) == DeserializationError::Ok) {
            bool fall     = res["fall_detected"].as<bool>();
            float conf    = res["confidence"].as<float>();
            const char* reason = res["reason"].as<const char*>();

            if (fall) {
                Serial.printf("[SERVER] 🚨 FALL DETECTED! Confidence: %.0f%% | %s\n",
                              conf * 100, reason);
            } else {
                Serial.printf("[SERVER] ✅ Normal | %s\n", reason);
            }
        }
    } else if (httpCode < 0) {
        Serial.printf("[HTTP]  Connection failed: %s\n", http.errorToString(httpCode).c_str());
    } else {
        Serial.printf("[HTTP]  Server error: HTTP %d\n", httpCode);
    }

    http.end();
}

// ─────────────────────────────────────────────────────────────
//  WEB SERVER ROUTES
// ─────────────────────────────────────────────────────────────
void setupRoutes() {
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "text/html", DASHBOARD_HTML);
    });

    server.on("/api/sensor", HTTP_GET, [](AsyncWebServerRequest *request) {
        String json = buildJsonResponse();
        AsyncWebServerResponse *response = request->beginResponse(200, "application/json", json);
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Cache-Control", "no-cache");
        request->send(response);
    });

    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
        JsonDocument doc;
        doc["status"]       = "ok";
        doc["uptime_ms"]    = millis();
        doc["free_heap"]    = ESP.getFreeHeap();
        doc["chip_model"]   = ESP.getChipModel();
        doc["wifi_rssi"]    = WiFi.RSSI();
        doc["sensor_valid"] = sensorData.valid;
        String json;
        serializeJson(doc, json);
        request->send(200, "application/json", json);
    });

    server.onNotFound([](AsyncWebServerRequest *request) {
        request->send(404, "application/json", "{\"error\":\"Not found\"}");
    });
}

#include "dashboard.h"
