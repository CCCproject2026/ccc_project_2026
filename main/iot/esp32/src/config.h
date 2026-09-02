// =============================================================
//  config.h — WiFi credentials & hardware pin configuration
//  ESP32 + MPU6050 Web Dashboard Project
// =============================================================

#ifndef CONFIG_H
#define CONFIG_H

// ── WiFi Settings ─────────────────────────────────────────────
#define WIFI_SSID     "RiddlerL"            // Auto-detected from your system
#define WIFI_PASSWORD "Kurumi123"           // Your WiFi password
#define WIFI_TIMEOUT_MS 15000               // 15 seconds connection timeout

// ── MPU6050 I2C Pins (ESP32 default) ─────────────────────────
// SDA -> GPIO 21
// SCL -> GPIO 22
// VCC -> 3.3V
// GND -> GND
// AD0 -> GND  (I2C address: 0x68)
#define MPU_SDA_PIN  21
#define MPU_SCL_PIN  22
#define MPU_I2C_ADDR 0x68

// ── Sensor Sample Rate ────────────────────────────────────────
#define SAMPLE_INTERVAL_MS 100  // Read sensor every 100ms (10 Hz)

// ── Web Server ────────────────────────────────────────────────
#define WEB_SERVER_PORT 80

// ── MPU6050 Range Settings ────────────────────────────────────
#define ACCEL_RANGE MPU6050_RANGE_8_G
#define GYRO_RANGE  MPU6050_RANGE_500_DEG
#define FILTER_BANDWIDTH MPU6050_BAND_44_HZ

// ── Low-pass filter alpha (0.0=max smooth, 1.0=raw) ──────────
#define FILTER_ALPHA 0.1f

// ── Cloud Server Settings ─────────────────────────────────────
// For local testing: use your PC's IP on the same WiFi
// Find it with: ip addr | grep 192.168
// Example: "http://192.168.1.50:8000"
#define SERVER_URL   "http://192.168.1.50:8000"  // <-- Change to your PC's IP
#define SERVER_PATH  "/sensor"
#define DEVICE_ID    "esp32-mpu6050-01"

// How many samples to batch before sending
// 10 samples @ 100ms each = 1 second of data per POST
#define BATCH_SIZE   10

#endif // CONFIG_H
