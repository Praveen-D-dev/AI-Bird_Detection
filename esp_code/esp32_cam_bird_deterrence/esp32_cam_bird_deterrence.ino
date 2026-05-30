#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Make sure to install ArduinoJson library
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <WebServer.h>
#include <WebSocketsClient.h> // Make sure to install WebSockets by Links2004

// ================= WIFI CONFIG =================
const char* ssid = "POCO M6 Pro 5G";
const char* password = "20061109";

// ================= SERVER CONFIG =================
// Use the URL of your Node.js Express server (e.g., Render/Railway public URL or local IP)
// For cloud: "https://your-express-app.onrender.com/detect"
// For local testing: "http://192.168.1.50:5000/detect"
const char* serverUrl = "https://bird-deterrent-node-backend.onrender.com/detect";

// WebSocket config (extract domain/IP and port from your server URL)
// For cloud: "your-express-app.onrender.com", 80 (or 443 for wss)
// For local testing: "192.168.1.50", 5000
const char* wsHost = "bird-deterrent-node-backend.onrender.com";
const int wsPort = 443;
const char* wsPath = "/";

WebSocketsClient webSocket;

// ================= PINS CONFIG =================
// Using GPIO 12 for the speaker/buzzer (available on most ESP32-CAMs when not using SD card in 4-bit mode)
#define SPEAKER_PIN 12 

// ================= AI THINKER PINS =================
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

unsigned long lastCapture = 0;
int interval = 300000; // Capture every 5 minutes (300,000 milliseconds)

// A lightweight web server to handle the GET /trigger request from the backend
WebServer server(80);

void playDeterrentSound() {
  Serial.println(">>> ACTIVATING DETERRENT SYSTEM (FIRECRACKER BURST) <<<");
  
  // Simulate a machine gun / firecracker burst using randomized white noise frequencies
  for (int burst = 0; burst < 6; burst++) { // 6 rapid shots
    for (int i = 0; i < 15; i++) {
      tone(SPEAKER_PIN, random(200, 2500)); // Random crackling frequency
      delay(random(2, 8)); // Random short duration for noise effect
    }
    noTone(SPEAKER_PIN);
    delay(random(60, 100)); // Pause between individual "shots"
  }
  noTone(SPEAKER_PIN);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to Server!");
      break;
    case WStype_TEXT: {
      String msg = String((char*)payload);
      Serial.println("[WS] Received: " + msg);
      if (msg.indexOf("\"trigger\"") > 0 || msg.indexOf("trigger") >= 0) {
        Serial.println("[WS] Trigger command received via WebSocket! Activating deterrent.");
        playDeterrentSound();
      }
      break;
    }
  }
}

void handleTrigger() {
  server.send(200, "text/plain", "Trigger received. Activating deterrent.");
  playDeterrentSound();
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); 
  Serial.begin(115200);
  
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(SPEAKER_PIN, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP()); // This is the IP the backend needs for the GET /trigger request

  // Start the trigger listener
  server.on("/trigger", handleTrigger);
  server.begin();
  Serial.println("Trigger server started.");

  // Start WebSocket client
  webSocket.beginSSL(wsHost, wsPort, wsPath, "", "");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("WebSocket client started.");

  // Camera init
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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed");
    while(true);
  }
  Serial.println("Camera Ready! System Operating.");
}

void loop() {
  // Handle incoming HTTP requests for /trigger
  server.handleClient();
  
  // Maintain WebSocket connection
  webSocket.loop();

  if (millis() - lastCapture > interval) {
    lastCapture = millis();
    
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      return;
    }

    if (WiFi.status() == WL_CONNECTED) {
        WiFiClientSecure client;
        client.setInsecure(); // Bypass SSL verification since Render has valid certs but ESP32 lacks root CA

        HTTPClient http;
        Serial.println("Sending image to AI Backend...");
        
        http.begin(client, serverUrl);
        String boundary = "--------------------------123456789";
        http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

        String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
        String tail = "\r\n--" + boundary + "--\r\n";
        uint32_t totalLen = head.length() + fb->len + tail.length();

        // Send payload manually
        http.sendRequest("POST", (uint8_t *)NULL, totalLen);
        WiFiClient *stream = http.getStreamPtr();
        
        if (stream) {
            stream->print(head);
            stream->write(fb->buf, fb->len);
            stream->print(tail);
            
            // Wait for response
            long timeout = millis();
            while(!stream->available() && millis() - timeout < 10000) {
               delay(10);
            }
            if(stream->available()) {
              String response = stream->readString();
              Serial.println("Server response: " + response);
            }
        } else {
            Serial.println("Connection failed (stream is null)");
        }
        
        http.end();
    } else {
        Serial.println("WiFi Disconnected");
    }

    esp_camera_fb_return(fb); 
  }
}
