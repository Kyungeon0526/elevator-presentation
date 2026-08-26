// ESP32-S3 간단한 AP 테스트 (카메라 없음)
#include <WiFi.h>
#include <WebServer.h>

const char* apSSID = "ESP32-Sense";
const char* apPassword = "12345678";
IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

WebServer server(80);

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("========================================");
    Serial.println("ESP32-S3 AP 테스트 시작");
    Serial.println("========================================");

    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(localIP, gateway, subnet);

    if (WiFi.softAP(apSSID, apPassword)) {
        Serial.println("AP mode started successfully!");
        Serial.printf("SSID: %s\n", apSSID);
        Serial.printf("Password: %s\n", apPassword);
        Serial.printf("IP: %s\n", WiFi.softAPIP().toString().c_str());

        Serial.println("");
        Serial.println("Smartphone connection method:");
        Serial.printf("1. WiFi Settings -> '%s'\n", apSSID);
        Serial.println("2. Password: 12345678");
        Serial.println("3. Browser: http://192.168.4.1");
        Serial.println("");
    } else {
        Serial.println("AP mode start failed!");
    }

    server.on("/", []() {
        String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>ESP32-S3 Test</title></head>";
        html += "<body><h1>ESP32-S3 AP Test Success!</h1>";
        html += "<p>WiFi connection completed!</p>";
        html += "<p>IP: 192.168.4.1</p>";
        html += "</body></html>";
        server.send(200, "text/html; charset=UTF-8", html);
        Serial.println("Web page request received");
    });

    server.begin();
    Serial.println("Web server started!");
    Serial.println("========================================");
}

void loop() {
    server.handleClient();
    delay(10);
}