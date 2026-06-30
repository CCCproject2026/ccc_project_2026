#include <Arduino.h>
#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"

const char* ssid = "ccmcmdm-student";
const char* password = "ZTFg2EQ2JDfy79i5";

static constexpr auto PWDN_GPIO_NUM  = (gpio_num_t)-1;
static constexpr auto RESET_GPIO_NUM = (gpio_num_t)-1;
static constexpr auto XCLK_GPIO_NUM  = GPIO_NUM_21;
static constexpr auto SIOD_GPIO_NUM  = GPIO_NUM_26;
static constexpr auto SIOC_GPIO_NUM  = GPIO_NUM_27;
static constexpr auto Y9_GPIO_NUM    = GPIO_NUM_35;
static constexpr auto Y8_GPIO_NUM    = GPIO_NUM_34;
static constexpr auto Y7_GPIO_NUM    = GPIO_NUM_39;
static constexpr auto Y6_GPIO_NUM    = GPIO_NUM_36;
static constexpr auto Y5_GPIO_NUM    = GPIO_NUM_19;
static constexpr auto Y4_GPIO_NUM    = GPIO_NUM_18;
static constexpr auto Y3_GPIO_NUM    = GPIO_NUM_5;
static constexpr auto Y2_GPIO_NUM    = GPIO_NUM_4;
static constexpr auto VSYNC_GPIO_NUM = GPIO_NUM_25;
static constexpr auto HREF_GPIO_NUM  = GPIO_NUM_23;
static constexpr auto PCLK_GPIO_NUM  = GPIO_NUM_22;

static httpd_handle_t camera_httpd = nullptr;
static const char* STREAM_TYPE = "multipart/x-mixed-replace; boundary=frame";

static esp_err_t index_handler(httpd_req_t *req) {
  const char* html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>ESP32 Camera</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; text-align: center; margin-top: 20px; }
    img { max-width: 100%; height: auto; border: 2px solid #333; border-radius: 8px; }
    button { font-size: 18px; padding: 10px 20px; margin: 10px; border: none; border-radius: 6px; cursor: pointer; background: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>ESP32 Camera</h1>
  <img id="stream" src="/stream">
  <p><a href="/capture"><button>Capture</button></a></p>
</body>
</html>
)rawliteral";
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html, strlen(html));
}

static esp_err_t jpeg_stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = nullptr;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, STREAM_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) { res = ESP_FAIL; break; }

    uint8_t *jpg_buf = nullptr;
    size_t jpg_len = 0;
  bool ok = frame2jpg(fb, 30, &jpg_buf, &jpg_len);
    esp_camera_fb_return(fb);
    fb = nullptr;
    if (!ok) { delay(10); continue; }

    size_t hlen = snprintf(part_buf, sizeof(part_buf),
      "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", jpg_len);

    res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res != ESP_OK) { free(jpg_buf); break; }

    res = httpd_resp_send_chunk(req, (const char*)jpg_buf, jpg_len);
    free(jpg_buf);
    if (res != ESP_OK) break;

    res = httpd_resp_send_chunk(req, "\r\n--frame\r\n", 10);
    if (res != ESP_OK) break;
  }

  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) { httpd_resp_send_500(req); return ESP_FAIL; }

  uint8_t *jpg_buf = nullptr;
  size_t jpg_len = 0;
  bool ok = frame2jpg(fb, 30, &jpg_buf, &jpg_len);
  esp_camera_fb_return(fb);
  if (!ok) { httpd_resp_send_500(req); return ESP_FAIL; }

  httpd_resp_set_type(req, "image/jpeg");
  esp_err_t res = httpd_resp_send(req, (const char*)jpg_buf, jpg_len);
  free(jpg_buf);
  return res;
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri   = { .uri = "/", .method = HTTP_GET, .handler = index_handler, .user_ctx = nullptr };
  httpd_uri_t stream_uri  = { .uri = "/stream", .method = HTTP_GET, .handler = jpeg_stream_handler, .user_ctx = nullptr };
  httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = nullptr };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
  }
}

void initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_RGB565;
  config.frame_size   = FRAMESIZE_96X96;
  config.jpeg_quality = 12;
  config.fb_count     = 2;
  config.fb_location  = CAMERA_FB_IN_PSRAM;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return;
  }
  Serial.println("Camera OK");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- ESP32 Camera ---");

  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP: ");
  Serial.println(WiFi.localIP());

  initCamera();
  startCameraServer();
  Serial.println("Open http://" + WiFi.localIP().toString());
}

void loop() {
  delay(1000);
}
