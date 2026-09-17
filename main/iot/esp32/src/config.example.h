// =============================================================
//  config.example.h — Template for WiFi & hardware config
//
//  HOW TO USE:
//    1. Copy this file and rename it to config.h
//    2. Fill in your WiFi SSID and password
//    3. Never commit config.h to git (it's in .gitignore)
// =============================================================

#ifndef CONFIG_H
#define CONFIG_H

// ── WiFi Settings ─────────────────────────────────────────────
#define WIFI_SSID     "YOUR_WIFI_SSID"      // <-- Replace this
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"  // <-- Replace this
#define WIFI_TIMEOUT_MS 15000

// ── MPU6050 I2C Pins (ESP32 default) ─────────────────────────
#define MPU_SDA_PIN  21
#define MPU_SCL_PIN  22
#define MPU_I2C_ADDR 0x68

// ── Sensor Sample Rate ────────────────────────────────────────
// 20 ms interval = 50 Hz, matching the AI model's input rate.
#define SAMPLE_INTERVAL_MS 20

// ── Batch Upload ──────────────────────────────────────────────
// 100 samples at 50 Hz = a 2-second window = one model inference.
#define BATCH_SIZE 100

// ── MQTT Broker (Mosquitto) ───────────────────────────────────
// Set to your broker. For local testing, use the machine running
// Mosquitto (e.g. your PC's LAN IP). Change to EC2 IP for production.
#define MQTT_HOST       "192.168.1.50"      // <-- Change this
#define MQTT_PORT       1883
#define MQTT_USER       ""                  // empty = no auth
#define MQTT_PASS       ""
#define MQTT_MAX_RETRIES 5                  // connect attempts before giving up
#define MQTT_RETRY_INTERVAL_MS 3000         // min gap between reconnect attempts
#define MQTT_BUFFER_SIZE        12000       // PubSubClient buffer (batch ~10 KB)

// ── Time (NTP) ────────────────────────────────────────────────
// Adds an absolute wall-clock timestamp to each MQTT batch.
// Offsets in seconds; e.g. Japan UTC+9 = (9 * 3600).
#define NTP_SERVER              "pool.ntp.org"
#define NTP_GMT_OFFSET_SEC      0
#define NTP_DAYLIGHT_OFFSET_SEC 0

// ── MQTT Topics ───────────────────────────────────────────────
#define DEVICE_ID   "esp32-mpu6050-01"
#define MQTT_TOPIC_DATA   "fall/esp32-mpu6050-01/data"     // 100-sample batches
#define MQTT_TOPIC_STATUS "fall/esp32-mpu6050-01/status"   // online/offline (LWT)

// ── Web Server ────────────────────────────────────────────────
#define WEB_SERVER_PORT 80

// ── MPU6050 Range Settings ────────────────────────────────────
#define ACCEL_RANGE MPU6050_RANGE_8_G
#define GYRO_RANGE  MPU6050_RANGE_500_DEG
#define FILTER_BANDWIDTH MPU6050_BAND_44_HZ

// ── Low-pass filter alpha (0.0=max smooth, 1.0=raw) ──────────
#define FILTER_ALPHA 0.1f

#endif // CONFIG_H
