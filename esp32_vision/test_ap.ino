// ESP32 디버깅용 간단한 AP 테스트 코드

#include <WiFi.h>
#include <WebServer.h>

// ESP32-S3용 설정
const char* apSSID = "ESP32-Test";
const char* apPassword = "12345678";

WebServer server(80);

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("ESP32-S3 AP 테스트 시작...");

    // AP 모드 설정
    WiFi.mode(WIFI_AP);
    WiFi.softAP(apSSID, apPassword);

    Serial.println("AP 모드 시작!");
    Serial.printf("SSID: %s\n", apSSID);
    Serial.printf("비밀번호: %s\n", apPassword);
    Serial.printf("IP 주소: %s\n", WiFi.softAPIP().toString().c_str());

    // 간단한 웹서버
    server.on("/", []() {
        server.send(200, "text/html", "<h1>ESP32-S3 AP 테스트 성공!</h1>");
    });

    server.begin();
    Serial.println("웹서버 시작!");

    Serial.println("========================================");
    Serial.println("📱 연결 방법:");
    Serial.printf("1. '%s' 와이파이 선택\n", apSSID);
    Serial.println("2. 비밀번호: 12345678");
    Serial.println("3. 브라우저: http://192.168.4.1");
    Serial.println("========================================");
}

void loop() {
    server.handleClient();
    delay(10);
}