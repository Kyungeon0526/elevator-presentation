# ESP32-Sense 엘리베이터 숫자 인식 시스템

ESP32-Sense 카메라를 사용하여 엘리베이터 디지털 디스플레이의 숫자를 전통적 비전 알고리즘으로 인식하고, 웹사이트에 실시간으로 전달하는 시스템입니다.

## 📋 요구 사항

- ESP32-Sense 또는 ESP32-CAM
- Arduino IDE (PlatformIO도 가능)
- 엘리베이터 디지털 디스플레이 (7-segment 또는 유사 형식)
- 안정적인 WiFi 연결

## 🚀 빠른 시작

### 1. Arduino IDE 설정

1. Arduino IDE를 설치하고 설정합니다:
   - File → Preferences → Additional Board Manager URLs
   - 다음 URL 추가: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`

2. Board Manager에서 ESP32 보드 설치:
   - Tools → Board → Boards Manager → "ESP32" 검색 후 설치

3. 라이브러리 설치:
   - Tools → Manage Libraries
   - 다음 라이브러리 설치:
     - WiFi (기본 포함)
     - ESP32 (기본 포함)

### 2. WiFi 설정

`elevator_camera.ino` 파일에서 WiFi 설정을 수정합니다:

```cpp
const char* ssid = "YOUR_WIFI_SSID";      // 와이파이 이름
const char* password = "YOUR_WIFI_PASSWORD";  // 와이파이 비밀번호
```

### 3. ESP32 업로드

1. ESP32를 USB에 연결
2. Arduino IDE에서:
   - Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM 선택
   - Tools → Port에서 올바른 포트 선택
   - 업로드 버튼 클릭

**주의**: ESP32-CAM은 업로드 전에 GPIO0을 GND에 연결해야 합니다. 업로드 후 연결 해제하고 리셋 버튼 누르세요.

### 4. IP 주소 확인

시리얼 모니터 (115200 baud)를 열고 ESP32의 IP 주소를 확인합니다:

```
WiFi 연결 성공!
IP 주소: 192.168.1.100
```

### 5. 디버깅 페이지 실행

`elevator-monitor` 폴더에서 웹서버를 시작합니다:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server 설치 필요)
npx http-server -p 8000
```

브라우저에서 `http://localhost:8000/debug.html` 접속

## 🔧 작동 원리

### 숫자 인식 알고리즘

1. **이미지 캡처**: 카메라에서 160x120 해상도의 그레이스케일 이미지 캡처
2. **이미지 전처리**:
   - 96x72로 다운샘플링 (처리 속도 향상)
   - 이진화 (임계값 128)
3. **ROI 추출**: 밝은 픽셀(숫자) 영역 자동 감지
4. **세그먼트 분석**: 7-segment 디스플레이의 7개 세그먼트 활성화 상태 분석
5. **패턴 매칭**: 인식된 세그먼트 패턴과 미리 정의된 숫자 패턴 비교

### 7-Segment 세그먼트 구조

```
 aaa
f   b
f   b
 ggg
e   c
e   c
 ddd
```

### 웹사이트 통신

ESP32는 다음 API 엔드포인트를 제공합니다:

- `GET /` - 기본 웹페이지
- `GET /api/status` - JSON 형식의 층수 데이터
  ```json
  {
    "floor": 3,
    "direction": "up",
    "processingTime": 120
  }
  ```
- `GET /api/segments` - 세그먼트 분석 결과
  ```json
  {
    "segments": [1, 1, 1, 1, 1, 1, 0],
    "floor": 3,
    "direction": "up",
    "processingTime": 120,
    "lastUpdate": 1692345678900
  }
  ```
- `GET /capture` - 현재 카메라 이미지 (디버깅용)

## 📷 디버깅 페이지 사용법

### 페이지 기능

1. **카메라 이미지 표시**: 실시간 카메라 캡처 이미지
2. **숫자 인식 결과**: 인식된 층수와 신뢰도
3. **세그먼트 분석**: 7-segment 각 세그먼트의 활성화 상태
4. **인식 로그**: 실시간 인식 과정 로그
5. **통계 정보**: 캡처 횟수, 성공률, 처리 시간 등

### 사용 단계

1. ESP32 URL 입력 (예: `http://192.168.1.100`)
2. "연결" 버튼 클릭
3. 실시간으로 카메라 이미지와 인식 결과 확인
4. 업데이트 주기 조절 (100ms ~ 5000ms)

### 테스트 시나리오

#### 1단계: 연결 테스트
```
1. ESP32 IP 확인: 시리얼 모니터에서 "IP 주소: 192.168.1.100" 확인
2. 브라우저에서 http://192.168.1.100 접속
3. "ESP32 엘리베이터 모니터" 페이지 표시 확인
```

#### 2단계: 카메라 테스트
```
1. 디버깅 페이지 접속: http://localhost:8000/debug.html
2. ESP32 URL 입력 후 연결
3. 카메라 이미지가 표시되는지 확인
4. 이미지 해상도 확인 (160x120)
```

#### 3단계: 숫자 인식 테스트
```
1. 카메라를 엘리베이터 디스플레이 방향으로 설치
2. 조명 조정 (너무 밝거나 어두우지 않게)
3. 실시간 숫자 인식 확인
4. 세그먼트 활성화 상태 확인
```

#### 4단계: 성능 테스트
```
1. 업데이트 주기를 500ms로 설정
2. 인식 성공률 확인
3. 처리 시간 측정
4. 층수 변경 반응 속도 테스트
```

## 🎯 사용 시나리오

### 엘리베이터 모니터링

1. ESP32 카메라를 엘리베이터 내부 디스플레이를 보도록 설치
2. 전원 공급 (USB 또는 배터리)
3. 웹사이트 접속 후 실시간 층수 모니터링

### 데이터 수집

시스템은 다음 데이터를 자동 수집합니다:
- 총 정차 횟수
- 총 이용 횟수
- 시간대별 이용량
- 마지막 정차 시간

## 🐛 디버깅

### 시리얼 모니터

Arduino IDE 시리얼 모니터 (115200 baud)에서 상태 확인:

```
ESP32 엘리베이터 숫자 인식 시스템 시작...
WiFi 연결 중...
WiFi 연결 성공!
IP 주소: 192.168.1.100
카메라 초기화 완료
웹서버 시작
서버 주소: http://192.168.1.100
인식된 숫자: 3, 처리 시간: 120ms
현재 층: 3, 방향: up
```

### 카메라 이미지 확인

브라우저에서 `http://ESP32_IP/capture` 접속으로 현재 카메라 이미지 확인

### API 테스트

브라우저나 curl로 API 테스트:

```bash
# 기본 상태 확인
curl http://192.168.1.100/api/status

# 세그먼트 분석 확인
curl http://192.168.1.100/api/segments
```

### 디버깅 페이지 로그

디버깅 페이지의 로그 섹션에서 다음 정보를 확인할 수 있습니다:
- 연결 상태
- 인식 성공/실패 메시지
- 처리 시간
- 층수 변경 로그

## ⚙️ 튜닝 파라미터

### 카메라 설정

```cpp
s->set_brightness(s, 0);     // -2 ~ 2
s->set_contrast(s, 0);       // -2 ~ 2
s->set_saturation(s, 0);     // -2 ~ 2
```

### 이미지 처리

```cpp
#define IMAGE_WIDTH  96
#define IMAGE_HEIGHT 72
uint8_t threshold = 128;  // 이진화 임계값
```

### 인식 파라미터

```cpp
// 세그먼트 활성화 임계값 (30% 이상이면 활성으로 판단)
segments[s] = (brightPixels * 100 / totalPixels > 30) ? 1 : 0;

// 매칭 점수 임계값 (70% 이상이면 인식 성공)
if (score > bestScore && score > 0.7)
```

### 디버깅 페이지 설정

```javascript
// 업데이트 주기 (ms)
UPDATE_INTERVAL: 1000

// 세그먼트 샘플링 반경
sampleRadius = max(2, min(regionW, regionH) / 6);
```

## 📱 웹사이트 기능

### 메인 페이지 (index.html)
- 실시간 층수 표시
- 엘리베이터 방향 (▲ 상행, ▼ 하행, ■ 정지)
- 시간대별 이용량 차트
- 오늘의 총 이용량 통계
- 실시간 업데이트 (2초 주기)

### 디버깅 페이지 (debug.html)
- 실시간 카메라 이미지
- 숫자 인식 결과 및 신뢰도
- 7-segment 세그먼트 시각화
- 인식 로그 및 통계
- 업데이트 주기 조절

## 🔒 보안 고려사항

- 로컬 네트워크에서만 사용 권장
- 공용 WiFi 사용 시 HTTPS 추가 고려
- API 인증 메커니즘 추가 권장 (공용 배포 시)

## 🛠️ 문제 해결

### WiFi 연결 실패
- WiFi 이름과 비밀번호 확인
- ESP32가 WiFi 범위 내에 있는지 확인

### 카메라 초기화 실패
- 전원 공급 확인 (안정적인 5V 필요)
- 카메라 모델 확인 (AI Thinker ESP32-CAM)
- GPIO 연결 확인

### 숫자 인식 실패
- 카메라와 디스플레이 간격 조정
- 조명 최적화 (너무 밝거나 어두우면 안 됨)
- 이미지 튜닝 파라미터 조정
- ROI 추출 영역 확인
- 디스플레이 형태 확인 (7-segment인지)

### 웹사이트 연결 실패
- ESP32 IP 주소 확인
- 웹사이트에서 ESP32_URL 설정 확인
- 같은 네트워크에 있는지 확인
- 방화벽 설정 확인

### 낮은 인식 성공률
- 카메라 각도 조정
- 조명 개선
- 세그먼트 활성화 임계값 조정 (30% → 25%)
- 매칭 점수 임계값 조정 (70% → 60%)

## 📂 파일 구조

```
esp32_vision/
├── elevator_camera.ino    # ESP32 메인 코드
├── README.md              # 이 파일
└── test_images/           # 테스트용 이미지 (선택 사항)

elevator-monitor/
├── index.html             # 웹사이트 메인 페이지
├── script.js              # 웹사이트 JavaScript
├── styles.css             # 웹사이트 스타일
├── debug.html             # 디버깅 페이지
├── debug.js               # 디버깅 JavaScript
├── debug.css              # 디버깅 스타일
└── README.md              # 웹사이트 문서
```

## 🤝 기여

버그 리포트, 기능 요청, 풀 리퀘스트 환영합니다!

## 📄 라이선스

MIT License

## 👥 개발자

ESP32 전통적 비전 기반 엘리베이터 모니터링 시스템

---

## 🔄 업데이트 내역

### v1.1.0 (2024-08-21)
- 디버깅 페이지 추가
- 세그먼트 분석 API 추가
- 실시간 카메라 이미지 표시
- 인식 통계 기능 추가

### v1.0.0 (2024-08-21)
- 초기 릴리스
- 7-segment 숫자 인식
- 웹사이트 연동
- 실시간 모니터링