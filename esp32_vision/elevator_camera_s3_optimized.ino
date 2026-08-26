// ============================================================
// ESP32-S3OV3660 카메라로 엘리베이터 숫자 인식
// ESP32-S3 최적화 버전
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>

// ============================================================
// WiFi 설정 (AP 모드)
// ============================================================
const char* apSSID = "ESP32-Sense";
const char* apPassword = "12345678";

// AP 모드 설정
IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// ============================================================
// 웹서버 설정
// ============================================================
WebServer server(80);

// ============================================================
// ESP32-S3OV3660 카메라 핀 설정 (최적화)
// ============================================================
// ESP32-S3-USB-OTG 기반 핀 맵
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
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
#define HREF_GPIO_NUM    7
#define PCLK_GPIO_NUM    13

// ============================================================
// 전역 변수
// ============================================================
int currentFloor = 1;
int previousFloor = 1;
String direction = "stopped";

// 이미지 처리 버퍼
#define IMAGE_WIDTH  96
#define IMAGE_HEIGHT 72
uint8_t processedImage[IMAGE_WIDTH * IMAGE_HEIGHT];

// 세그먼트 분석 결과
int currentSegments[7] = {0, 0, 0, 0, 0, 0, 0};
int lastConfidenceScore = 0;
unsigned long lastRecognitionTime = 0;
unsigned long lastProcessingTime = 0;

// 숫자 템플릿
const uint8_t digitPatterns[10][7] = {
    {1, 1, 1, 1, 1, 1, 0}, // 0
    {0, 1, 1, 0, 0, 0, 0}, // 1
    {1, 1, 0, 1, 1, 0, 1}, // 2
    {1, 1, 1, 1, 0, 0, 1}, // 3
    {0, 1, 1, 0, 0, 1, 1}, // 4
    {1, 0, 1, 1, 0, 1, 1}, // 5
    {1, 0, 1, 1, 1, 1, 1}, // 6
    {1, 1, 1, 0, 0, 0, 0}, // 7
    {1, 1, 1, 1, 1, 1, 1}, // 8
    {1, 1, 1, 1, 0, 1, 1}  // 9
};

// ============================================================
// 카메라 초기화 (ESP32-S3 최적화)
// ============================================================
void initCamera() {
    Serial.println("카메라 초기화 시작...");

    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;

    // 핀 설정
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

    // ESP32-S3 최적화 설정
    config.xclk_freq_hz = 16000000; // 16MHz로 감소
    config.pixel_format = PIXFORMAT_GRAYSCALE;
    config.frame_size = FRAMESIZE_QQVGA;  // 160x120
    config.jpeg_quality = 15;
    config.fb_count = 2;

    // PSRAM 사용 가능 여부 확인
    if (psramFound()) {
        config.fb_count = 3;
        Serial.println("PSRAM 감지됨 - 프레임 버퍼 증가");
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("❌ 카메라 초기화 실패: 0x%x\n", err);
        Serial.println("가능한 원인:");
        Serial.println("- 핀 설정 불일치");
        Serial.println("- 카메라 모듈 연결 문제");
        Serial.println("- 전력 부족");
        return;
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 0);
        s->set_contrast(s, 0);
        s->set_saturation(s, 0);
        s->set_special_effect(s, 0);
        s->set_whitebal(s, 1);
        s->set_awb_gain(s, 1);
        s->set_wb_mode(s, 0);

        Serial.println("카메라 설정 완료");
    }

    Serial.println("✅ 카메라 초기화 완료");
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

    // 이진화
    uint8_t threshold = 128;
    for (int i = 0; i < IMAGE_WIDTH * IMAGE_HEIGHT; i++) {
        processedImage[i] = processedImage[i] > threshold ? 255 : 0;
    }
}

// ============================================================
// 숫자 영역 추출
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
    *regionW = min(IMAGE_WIDTH - *regionX, maxX - minX + 5);
    *regionH = min(IMAGE_HEIGHT - *regionY, maxY - minY + 5);

    return true;
}

// ============================================================
// 세그먼트 분석
// ============================================================
void analyzeSegments(int regionX, int regionY, int regionW, int regionH, int segments[7]) {
    float segCenters[7][2] = {
        {0.5, 0.2},  // a
        {0.9, 0.35}, // b
        {0.9, 0.65}, // c
        {0.5, 0.8},  // d
        {0.1, 0.65}, // e
        {0.1, 0.35}, // f
        {0.5, 0.5}   // g
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
// 숫자 인식
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
    unsigned long startTime = millis();

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("❌ 카메라 캡처 실패");
        return -1;
    }

    preprocessImage(fb);

    int regionX, regionY, regionW, regionH;
    if (!extractDigitRegion(&regionX, &regionY, &regionW, &regionH)) {
        Serial.println("⚠️ 숫자 영역을 찾을 수 없음");
        esp_camera_fb_return(fb);
        return -1;
    }

    int segments[7];
    analyzeSegments(regionX, regionY, regionW, regionH, segments);

    for (int i = 0; i < 7; i++) {
        currentSegments[i] = segments[i];
    }

    int recognizedDigit = recognizeDigit(segments);

    lastProcessingTime = millis() - startTime;
    lastRecognitionTime = millis();

    esp_camera_fb_return(fb);

    if (recognizedDigit >= 0) {
        Serial.printf("🔢 인식된 숫자: %d, 처리 시간: %lums\n", recognizedDigit, lastProcessingTime);
    } else {
        Serial.println("❓ 숫자를 인식하지 못함");
    }

    return recognizedDigit;
}

// ============================================================
// 방향 판단
// ============================================================
void updateDirection(int newFloor) {
    if (newFloor < 0) {
        direction = "stopped";
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

    Serial.printf("📍 현재 층: %d, 방향: %s\n", currentFloor, direction.c_str());
}

// ============================================================
// API 핸들러
// ============================================================
void handleAPIStatus() {
    String json = "{";
    json += "\"floor\":" + String(currentFloor) + ",";
    json += "\"direction\":\"" + direction + "\",";
    json += "\"processingTime\":" + String(lastProcessingTime);
    json += "}";

    server.sendHeader("Content-Type", "application/json; charset=UTF-8");
    server.send(200, "application/json", json);
}

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
    json += "}";

    server.sendHeader("Content-Type", "application/json; charset=UTF-8");
    server.send(200, "application/json", json);
}

void handleCapture() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.sendHeader("Content-Type", "text/plain; charset=UTF-8");
        server.send(500, "text/plain", "캡처 실패");
        return;
    }

    server.sendHeader("Content-Type", "image/jpeg");
    server.sendHeader("Content-Length", String(fb->len));
    server.send(200, "image/jpeg", fb->buf, fb->len);

    esp_camera_fb_return(fb);
}

void handleRoot() {
    String html = "<!DOCTYPE html><html lang=\"ko\"><head>";
    html += "<meta charset=\"UTF-8\">";
    html += "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
    html += "<title>ESP32 엘리베이터 모니터</title>";
    html += "</head>";
    html += "<body>";
    html += "<h1>🏢 ESP32 엘리베이터 모니터</h1>";
    html += "<p>현재 층: " + String(currentFloor) + "</p>";
    html += "<p>방향: " + direction + "</p>";
    html += "<p><a href='/api/status'>API 상태</a></p>";
    html += "<p><a href='/capture'>카메라 캡처</a></p>";
    html += "</body></html>";

    server.sendHeader("Content-Type", "text/html; charset=UTF-8");
    server.send(200, "text/html", html);
}

// ============================================================
// WiFi AP 설정
// ============================================================
void setupWiFiAP() {
    Serial.println("📡 ESP32 AP 모드 시작...");

    WiFi.mode(WIFI_AP);

    if (WiFi.softAPConfig(localIP, gateway, subnet) && WiFi.softAP(apSSID, apPassword)) {
        Serial.println("✅ AP 모드 시작 성공!");
        Serial.printf("SSID: %s\n", apSSID);
        Serial.printf("비밀번호: %s\n", apPassword);
        Serial.printf("IP 주소: %s\n", WiFi.softAPIP().toString().c_str());

        Serial.println("\n📱 연결 방법:");
        Serial.println("1. 스마트폰 WiFi 설정 열기");
        Serial.printf("2. '%s' 와이파이 선택\n", apSSID);
        Serial.printf("3. 비밀번호: %s 입력\n", apPassword);
        Serial.println("4. 브라우저에서 http://192.168.4.1 접속");
        Serial.println("");
    } else {
        Serial.println("❌ AP 모드 시작 실패!");
    }
}

// ============================================================
// Setup
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("========================================");
    Serial.println("🚀 ESP32-S3OV3660 엘리베이터 숫자 인식 시스템");
    Serial.println("========================================");

    // 메모리 정보 출력
    Serial.printf("📊 총 PSRAM: %d bytes\n", ESP.getPsramSize());
    Serial.printf("📊 사용 가능 PSRAM: %d bytes\n", ESP.getFreePsram());
    Serial.printf("📊 총 heap: %d bytes\n", ESP.getHeapSize());
    Serial.printf("📊 사용 가능 heap: %d bytes\n", ESP.getFreeHeap());

    // WiFi AP 설정
    setupWiFiAP();

    // 카메라 초기화
    initCamera();

    // 웹서버 설정
    server.on("/", handleRoot);
    server.on("/api/status", handleAPIStatus);
    server.on("/api/segments", handleAPISegments);
    server.on("/capture", HTTP_GET, handleCapture);

    server.enableCORS(true);
    server.onNotFound([]() {
        server.sendHeader("Content-Type", "text/html; charset=UTF-8");
        server.send(404, "text/plain", "페이지를 찾을 수 없습니다");
    });

    server.begin();
    Serial.println("✅ 웹서버 시작");
    Serial.printf("🌐 서버 주소: http://%s\n", WiFi.softAPIP().toString().c_str());

    Serial.println("========================================");
    Serial.println("🎉 시스템 준비 완료!");
    Serial.println("========================================");
}

// ============================================================
// Loop
// ============================================================
void loop() {
    server.handleClient();

    static unsigned long lastCaptureTime = 0;
    if (millis() - lastCaptureTime > 2000) {
        lastCaptureTime = millis();

        int recognizedFloor = captureAndRecognize();
        if (recognizedFloor >= 0) {
            updateDirection(recognizedFloor);
        }
    }

    delay(10);
}
