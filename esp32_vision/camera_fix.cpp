// ============================================================
// ESP32-S3 카메라 초기화 (안정 버전)
// ============================================================
void initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;

    // ESP32-S3 카메라 핀 (수정됨)
    config.pin_d0 = Y2_GPIO_NUM;   // 11
    config.pin_d1 = Y3_GPIO_NUM;   // 9
    config.pin_d2 = Y4_GPIO_NUM;   // 8
    config.pin_d3 = Y5_GPIO_NUM;   // 10
    config.pin_d4 = Y6_GPIO_NUM;   // 12
    config.pin_d5 = Y7_GPIO_NUM;   // 18
    config.pin_d6 = Y8_GPIO_NUM;   // 17
    config.pin_d7 = Y9_GPIO_NUM;   // 16
    config.pin_xclk = XCLK_GPIO_NUM;   // 15
    config.pin_pclk = PCLK_GPIO_NUM;   // 13
    config.pin_vsync = VSYNC_GPIO_NUM; // 6
    config.pin_href = HREF_GPIO_NUM;   // 7
    config.pin_sscb_sda = SIOD_GPIO_NUM; // 4
    config.pin_sscb_scl = SIOC_GPIO_NUM; // 5
    config.pin_pwdn = PWDN_GPIO_NUM;   // -1
    config.pin_reset = RESET_GPIO_NUM; // -1

    // PSRAM 설정
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_GRAYSCALE; // 그레이스케일
    config.frame_size = FRAMESIZE_QQVGA;  // 160x120
    config.jpeg_quality = 12;
    config.fb_count = 2;

    // PSRAM 사용 설정
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

    Serial.println("카메라 초기화 시작...");

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("카메라 초기화 실패: 0x%x", err);
        return;
    }

    sensor_t *s = esp_camera_sensor_get();
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_special_effect(s, 0);

    Serial.println("카메라 초기화 완료");
}

// ============================================================
// 간단한 카메라 테스트 함수
// ============================================================
bool testCamera() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("카메라 테스트 실패: 이미지 캡처 안 됨");
        return false;
    }

    Serial.printf("카메라 테스트 성공: %dx%d, %d bytes\n",
                 fb->width, fb->height, fb->len);

    esp_camera_fb_return(fb);
    return true;
}