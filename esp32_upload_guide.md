# ESP32 코드 업로드 가이드

## 🎯 가장 쉬운 방법: Arduino IDE

### 1. Arduino IDE 설치 (5분)
```
1. https://www.arduino.cc/en/software 접속
2. "Windows Win 7 and newer" 다운로드
3. 설치 파일 실행 후 "Install" 클릭
4. 완료될 때까지 기다림
```

### 2. ESP32 보드 매니저 추가 (2분)
```
1. Arduino IDE 실행
2. File → Preferences
3. "Additional Board Manager URLs"에 다음 추가:
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
4. "OK" 클릭
```

### 3. ESP32 보드 설치 (5분)
```
1. Tools → Board → Boards Manager
2. "ESP32" 검색
3. "esp32 by Espressif Systems" 설치
4. 설치 완료까지 기다림 (약 5분)
```

### 4. ESP32 연결 (1분)
```
1. ESP32 USB를 컴퓨터에 연결
2. Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM 선택
3. Tools → Port → COM 포트 선택 (자동 감지됨)
```

### 5. 코드 업로드 (⚠️ 중요)
```
1. GPIO0을 GND에 연결 (EN 버튼 옆의 핀)
2. Arduino IDE에서 elevator_camera.ino 파일 열기
3. 우상단 업로드 버튼 (→) 클릭
4. 업로드 완료 대기
5. GPIO0 연결 해제
6. ESP32 리셋 버튼 클릭
```

### 6. WiFi 설정 (1분)
```
1. elevator_camera.ino 파일 열기
2. 13-14번째 줄 수정:
   const char* ssid = "와이파이이름";
   const char* password = "와이파이비밀번호";
3. 다시 업로드
```

### 7. IP 확인 (시리얼 모니터)
```
1. 우상단 돋보기 아이콘 클릭 (시리얼 모니터)
2. baud rate: 115200 선택
3. "IP 주소: 192.168.0.xxx" 확인
```

---

## 🚀 총 시간: 약 20분

| 단계 | 시간 | 난이도 |
|------|------|--------|
| Arduino IDE 설치 | 5분 | 쉬움 |
| ESP32 보드 설치 | 7분 | 쉬움 |
| 코드 업로드 | 5분 | 중간 |
| WiFi 설정 | 3분 | 쉬움 |

---

## 💡 팁

- **GPIO0 연결이 가장 중요합니다!** 연결하지 않으면 업로드 안 됨
- **업로드 중 USB를 빼지 마세요**
- **시리얼 모니터가 안 보이면 포트를 다시 선택하세요**

---

## 🆘 문제 해결

| 문제 | 해결 방법 |
|------|----------|
| 업로드 안 됨 | GPIO0-GND 연결 확인 |
| 포트 안 보임 | USB 다시 연결 |
| 컴파일 에러 | ESP32 보드 설치 확인 |
| WiFi 안 됨 | 와이파이 정보 확인 |

---

## ⚡ 단축어

- `Ctrl + U`: 업로드
- `Ctrl + Shift + M`: 시리얼 모니터
- `Ctrl + ,`: 설정