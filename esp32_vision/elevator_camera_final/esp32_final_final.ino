// ESP32-Sense Elevator Number Recognition System - Final Version
// Traditional Vision (Template Matching) Based, English Display

#include <WiFi.h>
#include <WebServer.h>
#include <esp_camera.h>

// WiFi AP Mode Settings
const char* apSSID = "ESP32-Sense";
const char* apPassword = "12345678";
IPAddress localIP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

WebServer server(80);

// Camera Pin Map for ESP32-S3-Sense
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

// Global Variables
int currentFloor = 1;
int previousFloor = 1;
String