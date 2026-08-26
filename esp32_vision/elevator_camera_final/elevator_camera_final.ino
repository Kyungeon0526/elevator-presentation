// ============================================================
// ESP32-Sense 엘리베이터 숫자 인식 시스템 - 최종 버전
// 전통적 비전 (Template Matching) 기반, 영어 표시
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>

// ============================================================
// WiFi AP 모드 설정
// ============================================================
const char* apSSID = "ESP32-Sense";
const char* apPassword = "12345678";
IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// ============================================================
// 웹서버 설정
// ============================================================
WebServer server(80);

// ============================================================
// 카메라 모델에 따른 핀 맵 (ESP32-S3-Sense)
// ============================================================
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      15
#define SIOD_GPIO_NUM     4
#define SIOC_GPIO_NUM     5

#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10
#define Y4_GPIO_NUM       8
#define Y3_GPIO_NUM       9
#define Y2_GPIO_NUM       11
#define VSYNC_GPIO_NUM    6
#define HREF_GPIO_NUM     7
#define PCLK_GPIO_NUM     13

// ============================================================
// 전역 변수
// ============================================================
int currentFloor = 1;
int previousFloor = 1;
String direction = "stopped";
bool cameraEnabled = false;

// 이미지 처리 버퍼
#define IMAGE_WIDTH  96
#define IMAGE_HEIGHT 72
uint8_t processedImage[IMAGE_WIDTH * IMAGE_HEIGHT];

// 세그먼트 분석 결과 (전역 저장)
int currentSegments[7] = {0, 0, 0, 0, 0, 0, 0};
int lastConfidenceScore = 0;
unsigned long lastRecognitionTime = 0;
unsigned long lastProcessingTime = 0;

// 숫자 템플릿 (7-segment 패턴)
const uint8_t digitPatterns[10][7] = {
    {1, 1, 1, 1, 1, 1, 0},  // 0
    {0, 1, 1, 0, 0, 0, 0},  // 1
    {1, 1, 0, 1, 1, 0, 1},  // 2
    {1, 1, 1, 1, 0, 0, 1},  // 3
    {0, 1, 1, 0, 0, 1, 1},  // 4
    {1, 0, 1, 1, 0, 1, 1},  // 5
    {1, 0, 1, 1, 1, 1, 1},  // 6
    {1, 1, 1, 0, 0, 0, 0},  // 7
    {1, 1, 1, 1, 1, 1, 1},  // 8
    {1, 1, 1, 1, 0, 1, 1}   // 9
};

// ============================================================
// 카메라 초기화
// ============================================================
void initCamera() {
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

    config.pixel_format = PIXFORMAT_GRAYSCALE;
    config.frame_size = FRAMESIZE_QQVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

    Serial.println("Camera initialization starting...");

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed: 0x%x", err);
        Serial.println("Continuing without camera...");
        cameraEnabled = false;
        return;
    }

    sensor_t *s = esp_camera_sensor_get();
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_special_effect(s, 0);

    Serial.println("Camera initialization complete");
    cameraEnabled = true;
}

// ============================================================
// 이미지 전처리
// ============================================================
void preprocessImage(camera_fb_t *fb) {
    int scale = fb->width / IMAGE_WIDTH;

    for (int y = 0; y < IMAGE_HEIGHT; y++) {
        for (int x = 0; x < IMAGE_WIDTH; x++) {
            int srcX = x * scale;
            int srcY = y * scale;
            processedImage[y * IMAGE_WIDTH + x] = fb->buf[srcY * fb->width + srcX];
        }
    }

    uint8_t threshold = 128;
    for (int i = 0; i < IMAGE_WIDTH * IMAGE_HEIGHT; i++) {
        processedImage[i] = processedImage[i] > threshold ? 255 : 0;
    }
}

// ============================================================
// 숫자 영역(ROI) 추출
// ============================================================
bool extractDigitRegion(int* regionX, int* regionY, int* regionW, int* regionH) {
    int minX = IMAGE_WIDTH, maxX = 0, minY = IMAGE_HEIGHT, maxY = 0;
    int brightPixels = 0;

    for (int y = 0; y < IMAGE_HEIGHT; y++) {
        for (int x = 0; x < IMAGE_WIDTH; x++) {
            if (processedImage[y * IMAGE_WIDTH + x] > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                brightPixels++;
            }
        }
    }

    if (brightPixels < 50) {
        return false;
    }

    *regionX = max(0, minX - 2);
    *regionY = max(0, minY - 2);
    *regionW = min(IMAGE_WIDTH - *regionX, maxX - *regionX + 5);
    *regionH = min(IMAGE_HEIGHT - *regionY, maxY - *regionY + 5);

    return true;
}

// ============================================================
// 세그먼트 활성화 분석
// ============================================================
void analyzeSegments(int regionX, int regionY, int regionW, int regionH, int segments[7]) {
    float segCenters[7][2] = {
        {0.5, 0.2},  // a (상단)
        {0.9, 0.35}, // b (우상)
        {0.9, 0.65}, // c (우하)
        {0.5, 0.8},  // d (하단)
        {0.1, 0.65}, // e (좌하)
        {0.1, 0.35}, // f (좌상)
        {0.5, 0.5}   // g (중앙)
    };

    int sampleRadius = max(2, min(regionW, regionH) / 6);

    for (int s = 0; s < 7; s++) {
        int centerX = regionX + (int)(segCenters[s][0] * regionW);
        int centerY = regionY + (int)(segCenters[s][1] * regionH);

        int brightPixels = 0;
        int totalPixels = 0;

        for (int dy = -sampleRadius; dy <= sampleRadius; dy++) {
            for (int dx = -sampleRadius; dx <= sampleRadius; dx++) {
                int x = centerX + dx;
                int y = centerY + dy;

                if (x >= 0 && x < IMAGE_WIDTH && y >= 0 && y < IMAGE_HEIGHT) {
                    totalPixels++;
                    if (processedImage[y * IMAGE_WIDTH + x] > 0) {
                        brightPixels++;
                    }
                }
            }
        }

        segments[s] = (brightPixels * 100 / totalPixels > 30) ? 1 : 0;
    }
}

// ============================================================
// 숫자 인식 (세그먼트 패턴 매칭)
// ============================================================
int recognizeDigit(int segments[7]) {
    int bestMatch = -1;
    int bestScore = 0;

    for (int digit = 0; digit < 10; digit++) {
        int matches = 0;
        int total = 0;

        for (int s = 0; s < 7; s++) {
            int weight = (s == 6) ? 1 : 2;

            if (segments[s] == digitPatterns[digit][s]) {
                matches += weight;
            }
            total += weight;
        }

        float score = (float)matches / total;

        if (score > bestScore && score > 0.7) {
            bestScore = score;
            bestMatch = digit;
        }
    }

    return bestMatch;
}

// ============================================================
// 카메라 캡처 및 숫자 인식
// ============================================================
int captureAndRecognize() {
    if (!cameraEnabled) {
        return -1;
    }

    unsigned long startTime = millis();

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        return -1;
    }

    preprocessImage(fb);

    int regionX, regionY, regionW, regionH;
    if (!extractDigitRegion(&regionX, &regionY, &regionW, &regionH)) {
        return -1;
    }

    analyzeSegments(regionX, regionY, regionW, regionH, currentSegments);

    int recognizedDigit = recognizeDigit(currentSegments);

    esp_camera_fb_return(fb);

    lastProcessingTime = millis() - startTime;
    lastRecognitionTime = millis();

    return recognizedDigit;
}

// ============================================================
// 방향 판단
// ============================================================
void updateDirection(int newFloor) {
    if (newFloor < 0) {
        return;
    }

    if (newFloor > currentFloor) {
        direction = "up";
    } else if (newFloor < currentFloor) {
        direction = "down";
    } else {
        direction = "stopped";
    }

    previousFloor = currentFloor;
    currentFloor = newFloor;
}

// ============================================================
// HTTP 엔드포인트: / (기본 웹페이지)
// ============================================================
void handleRoot() {
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>ESP32 Elevator Monitor</title></head>";
    html += "<body><div style='font-family: Arial; max-width:800px; margin: 20px auto; padding: 20px;'>";
    html += "<h1>ESP32 Elevator Monitor</h1>";
    html += "<p>Current floor: " + String(currentFloor) + "</p>";
    html += "<p>Direction: " + direction + "</p>";
    html += "<p>Status: " + (cameraEnabled ? "Camera working" : "No camera") + "</p>";
    html += "<hr>";
    html += "<h2>API Endpoints:</h2>";
    html += "<ul>";
    html += "<li><a href='/api/status'>/api/status</a></li>";
    html += "<li><a href='/api/segments'>/api/segments</a></li>";
    html += "<li><a href='/capture'>/capture</a></li>";
    html += "</ul>";
    html += "</div></body></html>";

    server.send(200, "text/html; charset=UTF-8", html);
}

// ============================================================
// HTTP 엔드포인트: /api/status
// ============================================================
void handleAPIStatus() {
    String json = "{";
    json += "\"floor\":" + String(currentFloor) + ",";
    json += "\"direction\":\"" + direction + "\",";
    json += "\"processingTime\":" + String(lastProcessingTime);
    json += "\"cameraWorking\":" + String(cameraEnabled ? "true" : "false");
    json += "}";

    server.send(200, "application/json", json);
}

// ============================================================
// HTTP 엔드포인트: /api/segments
// ============================================================
void handleAPISegments() {
    String json = "{";
    json += "\"segments\":[";
    for (int i = 0; i < 7; i++) {
        json += String(currentSegments[i]);
        if (i < 6) json += ",";
    }
    json += "],";
    json += "\"floor\":" + String(currentFloor) + ",";
    json += "\"direction\":\"" + direction + "\",";
    json += "\"processingTime\":" + String(lastProcessingTime) + ",";
    json += "\"lastUpdate\":" + String(lastRecognitionTime);
    json += "\"cameraEnabled\":" + String(cameraEnabled ? "true" : "false");
    json += "}";

    server.send(200, "application/json", json);
}

// ============================================================
// HTTP 엔드포인트: /capture (실시간 이미지)
// ============================================================
void handleCapture() {
    if (!cameraEnabled) {
        server.send(500, "application/json", "{\"error\":\"Camera disabled\"}");
        return;
    }

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(500, "application/json", "{\"error\":\"Capture failed\"}");
        return;
    }

    // Base64 인코딩된 이미지 전송
    String base64Image = "";
    for (size_t i = 0; i < min((size_t)200, fb->len); i++) {
        char hex[3];
        sprintf(hex, "%02X", fb->buf[i]);
        base64Image += hex;
    }

    String json = "{";
    json += "\"size\":" + String(fb->len) + ",";
    json += "\"format\":\"jpeg\",";
    json += "\"width\":" + String(fb->width) + ",";
    json += "\"height\":" + String(fb->height) + ",";
    json += "\"data\":\"" + base64Image + "\"";
    json += "}";

    server.send(200, "application/json", json);

    esp_camera_fb_return(fb);
}

// ============================================================
// WiFi AP 모드 설정
// ============================================================
void setupWiFiAP() {
    Serial.println("ESP32 AP mode start...");

    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(localIP, gateway, subnet);

    if (WiFi.softAP(apSSID, apPassword)) {
        Serial.println("AP mode started successfully!");
        Serial.printf("SSID: %s\n", apSSID.c_str());
        Serial.printf("Password: %s\n", apPassword.c_str());
        Serial.printf("IP: %s\n", WiFi.softAPIP().toString().c_str());

        Serial.println("");
        Serial.println("Connection method:");
        Serial.println("1. Open smartphone WiFi settings");
        Serial.printf("2. Select '%s'\n", apSSID.c_str());
        Serial.println("3. Enter password: 12345678");
        Serial.println("4. Open browser: http://192.168.4.1");
        Serial.println("");
    } else {
        Serial.println("AP mode start failed!");
    }
}

// ============================================================
// 설정
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("ESP32 Elevator Number Recognition System Start");

    // WiFi AP 모드 설정
    setupWiFiAP();

    // 카메라 초기화
    initCamera();

    // 웹서버 시작
    server.on("/", handleRoot);
    server.on("/api/status", handleAPIStatus);
    server.on("/api/segments", handleAPISegments);
    server.on("/capture", handleCapture);

    server.begin();
    Serial.println("Web server started");
    Serial.printf("Server address: http://%s\n", WiFi.localIP().toString().c_str());

    // 주기적으로 숫자 인식 수행 (2초마다)
    Serial.println("System ready!");
    Serial.printf("Total floors: 16\n");
    Serial.println("Update interval: 2 seconds");
    Serial.println("7-segment number recognition");
}

// ============================================================
// 메인 루프
// ============================================================
void loop() {
    server.handleClient();

    // 주기적으로 숫자 인식 수행 (2초마다)
    static unsigned long lastRecognizeTime = 0;
    if (millis() - lastRecognizeTime > 2000 && cameraEnabled) {
        int recognizedDigit = captureAndRecognize();
        if (recognizedDigit >= 0) {
            updateDirection(recognizedDigit);
            lastRecognizeTime = millis();
        }
    }

    delay(10);
}