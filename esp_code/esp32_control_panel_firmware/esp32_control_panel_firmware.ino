#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ===========================
// Wi-Fi Configuration
// ===========================
const char* ssid = "POCO M6 Pro 5G";
const char* password = "20061109";

// ===========================
// Hardware Configuration
// ===========================
// Speaker/Buzzer Pin
#define SPEAKER_PIN 12 

// Camera Pin definitions for ESP32-CAM AI Thinker module
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

httpd_handle_t camera_httpd = NULL;

// ===========================
// Handlers
// ===========================

// Handler for the /capture endpoint
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;

    // Capture an image
    fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    // Set CORS headers so the web panel can fetch it from any origin
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    // Set content type to JPEG
    httpd_resp_set_type(req, "image/jpeg");

    // Send the image buffer
    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);

    // Return the frame buffer back to the driver for reuse
    esp_camera_fb_return(fb);

    return res;
}

// Global flag for playing sound
bool playSound = false;

// Handler for the /speaker endpoint
static esp_err_t speaker_handler(httpd_req_t *req) {
    // Default CORS headers
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    httpd_resp_set_type(req, "application/json");

    // Trigger the sound flag
    playSound = true;
    Serial.println("Siren alarm triggered!");
    
    return httpd_resp_send(req, "{\"status\":\"success\"}", HTTPD_RESP_USE_STRLEN);
}

// Setup the HTTP Server
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();

    httpd_uri_t capture_uri = {
        .uri       = "/capture",
        .method    = HTTP_GET,
        .handler   = capture_handler,
        .user_ctx  = NULL
    };

    httpd_uri_t speaker_uri = {
        .uri       = "/speaker",
        .method    = HTTP_GET,
        .handler   = speaker_handler,
        .user_ctx  = NULL
    };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        httpd_register_uri_handler(camera_httpd, &speaker_uri);
    }
}

// ===========================
// Main Setup and Loop
// ===========================

void setup() {
    Serial.begin(115200);
    Serial.setDebugOutput(true);
    Serial.println();

    // Initialize speaker pin
    pinMode(SPEAKER_PIN, OUTPUT);
    digitalWrite(SPEAKER_PIN, LOW); // Start with speaker off

    // Initialize the camera
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    
    // Configure resolution and quality
    // Options: FRAMESIZE_UXGA, FRAMESIZE_SVGA, FRAMESIZE_VGA, etc.
    config.frame_size = FRAMESIZE_VGA; 
    config.jpeg_quality = 12; // 0-63, lower is better quality
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x", err);
        return;
    }

    // Connect to Wi-Fi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to Wi-Fi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println();
    Serial.println("Wi-Fi connected!");
    
    // Start the server
    startCameraServer();

    Serial.print("Camera Server ready! Connect to IP: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    if (playSound) {
        Serial.println("Playing siren sound...");
        // Setup LEDC channel 1 for the speaker
        int channel = 1; 
        int resolution = 8;
        ledcSetup(channel, 2000, resolution);
        ledcAttachPin(SPEAKER_PIN, channel);
        
        // Play an alarm/siren effect for ~3 seconds
        for (int i = 0; i < 3; i++) {
            for (int f = 800; f < 2000; f += 20) {
                ledcWriteTone(channel, f);
                delay(5);
            }
            for (int f = 2000; f > 800; f -= 20) {
                ledcWriteTone(channel, f);
                delay(5);
            }
        }
        
        // Turn off speaker
        ledcWriteTone(channel, 0);
        ledcDetachPin(SPEAKER_PIN);
        digitalWrite(SPEAKER_PIN, LOW);
        
        playSound = false;
        Serial.println("Siren stopped.");
    }
    delay(50);
}
