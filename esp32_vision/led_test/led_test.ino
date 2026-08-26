// ESP32-S3 LED 테스트 (가장 간단)
void setup() {
    Serial.begin(115200);
    delay(1000);

    // 내장 LED 핀 (ESP32-S3)
    pinMode(2, OUTPUT);

    // 와이파이 테스트 없이 LED만 깜빡
    Serial.println("========================================");
    Serial.println("ESP32-S3 LED 테스트 시작");
    Serial.println("========================================");
    Serial.println("LED 깜빡 3회:");
    Serial.println("");

    for (int i = 0; i < 3; i++) {
        Serial.println("LED ON");
        digitalWrite(2, HIGH);
        delay(1000);
        Serial.println("LED OFF");
        digitalWrite(2, LOW);
        delay(1000);
    }

    Serial.println("========================================");
    Serial.println("LED 테스트 완료!");
    Serial.println("ESP32가 정상 작동하면 메시지가 보입니다");
    Serial.println("========================================");
}

void loop() {
    // 무한 루프 (LED 깜빡 반복)
    digitalWrite(2, HIGH);
    delay(1000);
    digitalWrite(2, LOW);
    delay(1000);
}