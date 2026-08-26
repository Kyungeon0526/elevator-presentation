// ============================================================
// ESP32-Sense 카메라로 엘리베이터 숫자 인식
// 전통적 비전 (Template Matching) 기반
// ============================================================

#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>

// ============================================================
// WiFi 설정 (AP 모드)
// ============================================================
// ESP32가 자체 와이파이를 생성합니다
const char* apSSID = "ESP32-Sense";        // 와이파이 이름
const char* apPassword = "12345678";       // 와이파이 비밀번호 (8자 이상)

// AP 모드 설정
IPAddress localIP(192, 168, 4, 1);        // ESP32 IP
IPAddress gateway(192, 168, 4, 1);        // 게이트웨이
IPAddress subnet(255, 255, 255, 0);       // 서브넷 마스크

// ============================================================
// 웹서버 설정
// ============================================================
WebServer server(80);

// ============================================================
// 카메라 모델에 따른 핀 맵 (ESP32-S3-Sense)
// ============================================================
// ESP32-S3-Sense 카메라 핀 맵
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
bool cameraEnabled = false;  // 카메라 작동 여부

// 이미지 처리 버퍼
#define IMAGE_WIDTH  96
#define IMAGE_HEIGHT 72
uint8_t processedImage[IMAGE_WIDTH * IMAGE_HEIGHT];

// 세그먼트 분석 결과 (전역 저장)
int currentSegments[7] = {0, 0, 0, 0, 0, 0, 0}; // a,b,c,d,e,f,g
int lastConfidenceScore = 0;
unsigned long lastRecognitionTime = 0;
unsigned long lastProcessingTime = 0;

// 숫자 템플릿 (96x72 이미지에서 각 숫자의 특징점)
// 엘리베이터 디지털 디스플레이의 7-segment 패턴
// 각 숫자에 대한 세그먼트 ON/OFF 패턴
const uint8_t digitPatterns[10][7] = {
    // 0: a,b,c,d,e,f
    {1, 1, 1, 1, 1, 1, 0},
    // 1: b,c
    {0, 1, 1, 0, 0, 0, 0},
    // 2: a,b,g,e,d
    {1, 1, 0, 1, 1, 0, 1},
    // 3: a,b,g,c,d
    {1, 1, 1, 1, 0, 0, 1},
    // 4: f,g,b,c
    {0, 1, 1, 0, 0, 1, 1},
    // 5: a,f,g,c,d
    {1, 0, 1, 1, 0, 1, 1},
    // 6: a,f,g,c,d,e
    {1, 0, 1, 1, 1, 1, 1},
    // 7: a,b,c
    {1, 1, 1, 0, 0, 0, 0},
    // 8: a,b,c,d,e,f,g
    {1, 1, 1, 1, 1, 1, 1},
    // 9: a,b,c,d,f,g
    {1, 1, 1, 1, 0, 1, 1}
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
    config.xclk_freq_hz = 20000000;
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

    Serial.println("카메라 초기화 완료");
}

// ============================================================
// 이미지 전처리
// ============================================================
void preprocessImage(camera_fb_t *fb) {
    // 원본 이미지를 작은 버퍼로 다운샘플링
    int scale = fb->width / IMAGE_WIDTH;

    for (int y = 0; y < IMAGE_HEIGHT; y++) {
        for (int x = 0; x < IMAGE_WIDTH; x++) {
            int srcX = x * scale;
            int srcY = y * scale;
            processedImage[y * IMAGE_WIDTH + x] = fb->buf[srcY * fb->width + srcX];
        }
    }

    // 이진화 (임계값 적용)
    uint8_t threshold = 128;
    for (int i = 0; i < IMAGE_WIDTH * IMAGE_HEIGHT; i++) {
        processedImage[i] = processedImage[i] > threshold ? 255 : 0;
    }
}

// ============================================================
// 숫자 영역(ROI) 추출
// ============================================================
bool extractDigitRegion(int* regionX, int* regionY, int* regionW, int* regionH) {
    // 이미지의 중심 영역 추정 (디스플레이가 보통 중앙에 위치)
    // 실제 환경에서는 카메라 설치 위치에 따라 조정 필요

    // 밝은 픽셀(숫자) 찾기
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

    // 충분한 밝은 픽셀이 있는지 확인
    if (brightPixels < 50) {
        return false; // 숫자를 찾지 못함
    }

    // ROI 설정 (약간의 여유 공간 추가)
    *regionX = max(0, minX - 2);
    *regionY = max(0, minY - 2);
    *regionW = min(IMAGE_WIDTH - *regionX, maxX - minX + 5);
    *regionH = min(IMAGE_HEIGHT - *regionY, maxY - minY + 5);

    return true;
}

// ============================================================
// 세그먼트 활성화 분석 (7-segment 디스플레이)
// ============================================================
void analyzeSegments(int regionX, int regionY, int regionW, int regionH, int segments[7]) {
    // 7-segment 디스플레이의 각 세그먼트 위치 정의
    // 영역 비율로 정규화된 좌표

    // 세그먼트 중심점 (비율)
    float segCenters[7][2] = {
        {0.5, 0.2},  // a (상단)
        {0.9, 0.35}, // b (우상)
        {0.9, 0.65}, // c (우하)
        {0.5, 0.8},  // d (하단)
        {0.1, 0.65}, // e (좌하)
        {0.1, 0.35}, // f (좌상)
        {0.5, 0.5}   // g (중앙)
    };

    // 각 세그먼트 영역에서 밝은 픽셀 비율 계산
    int sampleRadius = max(2, min(regionW, regionH) / 6);

    for (int s = 0; s < 7; s++) {
        int centerX = regionX + (int)(segCenters[s][0] * regionW);
        int centerY = regionY + (int)(segCenters[s][1] * regionH);

        int brightPixels = 0;
        int totalPixels = 0;

        // 세그먼트 영역 샘플링
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

        // 임계값으로 세그먼트 활성화 판단
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
            // 중앙 세그먼트(g)는 가중치를 줄임 (노이즈에 민감)
            int weight = (s == 6) ? 1 : 2;

            if (segments[s] == digitPatterns[digit][s]) {
                matches += weight;
            }
            total += weight;
        }

        float score = (float)matches / total;

        if (score > bestScore && score > 0.7) { // 70% 이상 매칭
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
        Serial.println("Camera disabled, skipping capture");
        return -1;
    }

    unsigned long startTime = millis();

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        return -1;
    }

    // 이미지 전처리
    preprocessImage(fb);

    // 숫자 영역 추출
    int regionX, regionY, regionW, regionH;
    if (!extractDigitRegion(&regionX, &regionY, &regionW, &regionH)) {
        Serial.println("숫자 영역을 찾을 수 없음");
        esp_camera_fb_return(fb);
        return -1;
    }

    // 세그먼트 분석
    int segments[7];
    analyzeSegments(regionX, regionY, regionW, regionH, segments);

    // 세그먼트 결과 전역 저장
    for (int i = 0; i < 7; i++) {
        currentSegments[i] = segments[i];
    }

    // 숫자 인식
    int recognizedDigit = recognizeDigit(segments);

    // 처리 시간 계산
    lastProcessingTime = millis() - startTime;
    lastRecognitionTime = millis();

    esp_camera_fb_return(fb);

    if (recognizedDigit >= 0) {
        Serial.printf("인식된 숫자: %d, 처리 시간: %lums\n", recognizedDigit, lastProcessingTime);
    } else {
        Serial.println("숫자를 인식하지 못함");
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

    Serial.printf("현재 층: %d, 방향: %s\n", currentFloor, direction.c_str());
}

// ============================================================
// HTTP 엔드포인트: /api/status
// ============================================================
void handleAPIStatus() {
    String json = "{";
    json += "\"floor\":" + String(currentFloor) + ",";
    json += "\"direction\":\"" + direction + "\",";
    json += "\"processingTime\":" + String(lastProcessingTime);
    json += "}";

    server.send(200, "application/json", json);
}

// ============================================================
// HTTP 엔드포인트: /api/segments (세그먼트 분석 결과)
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
    json += "}";

    server.send(200, "application/json", json);
}

// ============================================================
// HTTP 엔드포인트: /capture (디버깅용)
// ============================================================
void handleCapture() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(500, "application/json", "{\"error\":\"캡처 실패\"}");
        return;
    }

    // 이미지를 Base64로 인코딩하여 JSON으로 전송
    String base64Image = "";
    for (size_t i = 0; i < fb->len; i++) {
        base64Image += String(fb->buf[i], HEX);
    }

    String json = "{";
    json += "\"size\":" + String(fb->len) + ",";
    json += "\"format\":\"jpeg\",";
    json += "\"width\":" + String(fb->width) + ",";
    json += "\"height\":" + String(fb->height) + ",";
    json += "\"data\":\"" + base64Image.substring(0, 100) + "...\""; // 처음 100바이트만
    json += "}";

    server.sendHeader("Content-Type", "application/json");
    server.send(200, "application/json", json);

    esp_camera_fb_return(fb);
}

// ============================================================
// HTTP 엔드포인트: / (웹사이트 연결용)
// ============================================================
void handleRoot() {
    String html = "<html><head><title>ESP32 엘리베이터 모니터</title></head>";
    html += "<body><h1>ESP32 엘리베이터 모니터</h1>";
    html += "<p>현재 층: " + String(currentFloor) + "</p>";
    html += "<p>방향: " + direction + "</p>";
    html += "<p><a href='/api/status'>API 상태</a></p>";
    html += "<p><a href='/capture'>카메라 캡처</a></p>";
    html += "</body></html>";
    server.send(200, "text/html", html);
}

// ============================================================
// WiFi AP 모드 설정
// ============================================================
void setupWiFiAP() {
    Serial.println("ESP32 AP 모드 시작...");

    // AP 모드로 설정
    WiFi.mode(WIFI_AP);

    // AP 시작
    WiFi.softAPConfig(localIP, gateway, subnet);

    if (WiFi.softAP(apSSID, apPassword)) {
        Serial.println("AP 모드 시작 성공!");
        Serial.printf("SSID: %s\n", apSSID);
        Serial.printf("비밀번호: %s\n", apPassword);
        Serial.printf("IP 주소: %s\n", WiFi.softAPIP().toString().c_str());

        // 연결된 기기 표시
        Serial.println("\n📱 연결 방법:");
        Serial.println("1. 스마트폰 WiFi 설정 열기");
        Serial.printf("2. '%s' 와이파이 선택\n", apSSID);
        Serial.printf("3. 비밀번호: %s 입력\n", apPassword);
        Serial.println("4. 브라우저에서 http://192.168.4.1 접속");
        Serial.println("");
    } else {
        Serial.println("AP 모드 시작 실패!");
    }
}

// ============================================================
// 설정
// ============================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("ESP32 엘리베이터 숫자 인식 시스템 시작...");

    // WiFi AP 모드 설정
    setupWiFiAP();

    // 카메라 초기화
    initCamera();

    // 웹서버 엔드포인트 설정
    server.on("/", handleRoot);
    server.on("/api/status", handleAPIStatus);
    server.on("/api/segments", handleAPISegments);
    server.on("/capture", HTTP_GET, handleCapture);

    // 웹서버 시작
    server.begin();
    Serial.println("웹서버 시작");
    Serial.printf("서버 주소: http://%s\n", WiFi.localIP().toString().c_str());

    Serial.println("시스템 준비 완료");
}

// ============================================================
// 메인 루프
// ============================================================
void loop() {
    server.handleClient();

    // 주기적으로 숫자 인식 수행 (2초마다)
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