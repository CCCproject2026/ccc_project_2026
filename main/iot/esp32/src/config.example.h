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

// ── Cloud Server (FastAPI test receiver) ──────────────────────
// Set to your FastAPI server. For local testing, use your PC's
// LAN IP (find with: ip addr | grep 192.168). e.g. "http://192.168.1.50:8000"
#define SERVER_URL  "http://192.168.1.50:8000"  // <-- Change this
#define SERVER_PATH "/sensor"
#define DEVICE_ID   "esp32-mpu6050-01"

// ── Web Server ────────────────────────────────────────────────
#define WEB_SERVER_PORT 80

// ── MPU6050 Range Settings ────────────────────────────────────
#define ACCEL_RANGE MPU6050_RANGE_8_G
#define GYRO_RANGE  MPU6050_RANGE_500_DEG
#define FILTER_BANDWIDTH MPU6050_BAND_44_HZ

// ── Low-pass filter alpha (0.0=max smooth, 1.0=raw) ──────────
#define FILTER_ALPHA 0.1f

#endif // CONFIG_H
