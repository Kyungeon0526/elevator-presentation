// ============================================================
// ESP32 카메라 디버깅 - JavaScript
// 실시간 카메라 이미지와 숫자 인식 결과 표시
// ============================================================

// ============================================================
// 설정 및 전역 변수
// ============================================================
let config = {
    esp32Url: 'http://192.168.1.100',
    updateInterval: 1000,
    isConnected: false,
    autoScroll: true
};

let updateTimer = null;
let stats = {
    totalCaptures: 0,
    successfulCaptures: 0,
    failedCaptures: 0,
    processingTimes: []
};

// ============================================================
// DOM 요소
// ============================================================
const elements = {
    esp32Url: document.getElementById('esp32-url'),
    updateInterval: document.getElementById('update-interval'),
    connectBtn: document.getElementById('connect-btn'),
    disconnectBtn: document.getElementById('disconnect-btn'),
    captureOnceBtn: document.getElementById('capture-once-btn'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    cameraImage: document.getElementById('camera-image'),
    cameraLoading: document.getElementById('camera-loading'),
    cameraError: document.getElementById('camera-error'),
    imageTimestamp: document.getElementById('image-timestamp'),
    imageResolution: document.getElementById('image-resolution'),
    resultNumber: document.getElementById('result-number'),
    resultConfidence: document.getElementById('result-confidence'),
    recognitionStatus: document.getElementById('recognition-status'),
    processingTime: document.getElementById('processing-time'),
    segments: {
        a: document.getElementById('seg-a'),
        b: document.getElementById('seg-b'),
        c: document.getElementById('seg-c'),
        d: document.getElementById('seg-d'),
        e: document.getElementById('seg-e'),
        f: document.getElementById('seg-f'),
        g: document.getElementById('seg-g')
    },
    segmentValues: {
        a: document.getElementById('seg-a-val'),
        b: document.getElementById('seg-b-val'),
        c: document.getElementById('seg-c-val'),
        d: document.getElementById('seg-d-val'),
        e: document.getElementById('seg-e-val'),
        f: document.getElementById('seg-f-val'),
        g: document.getElementById('seg-g-val')
    },
    logContainer: document.getElementById('log-container'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    autoScroll: document.getElementById('auto-scroll'),
    stats: {
        totalCaptures: document.getElementById('total-captures'),
        successfulCaptures: document.getElementById('successful-captures'),
        failedCaptures: document.getElementById('failed-captures'),
        avgProcessingTime: document.getElementById('avg-processing-time'),
        successRate: document.getElementById('success-rate')
    }
};

// ============================================================
// 로깅 함수
// ============================================================
function addLog(message, type = 'info') {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR');

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-message">${message}</span>
    `;

    elements.logContainer.appendChild(logEntry);

    if (config.autoScroll) {
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    }
}

function clearLog() {
    elements.logContainer.innerHTML = '';
    addLog('로그가 지워졌습니다', 'info');
}

// ============================================================
// 상태 관리
// ============================================================
function updateConnectionStatus(status) {
    elements.statusIndicator.className = `status-indicator ${status}`;

    switch(status) {
        case 'connected':
            elements.statusText.textContent = '연결됨';
            elements.connectBtn.disabled = true;
            elements.disconnectBtn.disabled = false;
            break;
        case 'connecting':
            elements.statusText.textContent = '연결 중...';
            elements.connectBtn.disabled = true;
            elements.disconnectBtn.disabled = true;
            break;
        case 'disconnected':
            elements.statusText.textContent = '연결 해제';
            elements.connectBtn.disabled = false;
            elements.disconnectBtn.disabled = true;
            break;
        case 'error':
            elements.statusText.textContent = '연결 오류';
            elements.connectBtn.disabled = false;
            elements.disconnectBtn.disabled = true;
            break;
    }
}

// ============================================================
// 이미지 캡처 및 표시
// ============================================================
async function captureImage() {
    if (!config.isConnected) {
        addLog('ESP32에 연결되지 않았습니다', 'error');
        return null;
    }

    const captureUrl = `${config.esp32Url}/capture`;
    const timestamp = new Date().getTime();

    try {
        elements.cameraLoading.style.display = 'block';
        elements.cameraError.style.display = 'none';

        const response = await fetch(`${captureUrl}?t=${timestamp}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        elements.cameraImage.src = imageUrl;

        // 이미지 정보 업데이트
        elements.imageTimestamp.textContent = new Date().toLocaleTimeString('ko-KR');

        // 이미지 로드 시 해상도 확인
        elements.cameraImage.onload = () => {
            elements.imageResolution.textContent = `${elements.cameraImage.naturalWidth} x ${elements.cameraImage.naturalHeight}`;
            elements.cameraLoading.style.display = 'none';
        };

        elements.cameraImage.onerror = () => {
            elements.cameraLoading.style.display = 'none';
            elements.cameraError.style.display = 'block';
            throw new Error('이미지 로드 실패');
        };

        return blob;

    } catch (error) {
        elements.cameraLoading.style.display = 'none';
        elements.cameraError.style.display = 'block';
        addLog(`이미지 캡처 실패: ${error.message}`, 'error');
        return null;
    }
}

// ============================================================
// API 데이터 가져오기
// ============================================================
async function fetchRecognitionData() {
    if (!config.isConnected) {
        return null;
    }

    const segmentsUrl = `${config.esp32Url}/api/segments`;
    const startTime = performance.now();

    try {
        const response = await fetch(segmentsUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const processingTime = Math.round(performance.now() - startTime);

        // 세그먼트 데이터 실시간 표시
        if (data.segments) {
            updateRealSegments(data.segments);
        }

        return {
            floor: data.floor,
            direction: data.direction,
            processingTime: data.processingTime || processingTime,
            segments: data.segments
        };

    } catch (error) {
        addLog(`데이터 가져오기 실패: ${error.message}`, 'error');
        return null;
    }
}

// ============================================================
// 인식 결과 표시
// ============================================================
function displayRecognitionResult(data) {
    if (!data) {
        elements.resultNumber.textContent = '?';
        elements.resultNumber.className = 'result-number unknown';
        elements.resultConfidence.textContent = '신뢰도: --%';
        elements.recognitionStatus.textContent = '인식 실패';
        elements.processingTime.textContent = '-- ms';
        return;
    }

    const floor = data.floor;
    const direction = data.direction;
    const processingTime = data.processingTime || 0;

    // 숫자 표시
    if (floor >= 0 && floor <= 99) {
        elements.resultNumber.textContent = floor;
        elements.resultNumber.className = 'result-number recognized';

        // 방향에 따른 색상
        if (direction === 'up') {
            elements.resultNumber.style.color = '#4CAF50'; // 녹색
        } else if (direction === 'down') {
            elements.resultNumber.style.color = '#FF9800'; // 주황색
        } else {
            elements.resultNumber.style.color = '#2196F3'; // 파란색
        }
    } else {
        elements.resultNumber.textContent = '?';
        elements.resultNumber.className = 'result-number unknown';
        elements.resultNumber.style.color = '#999';
    }

    elements.resultConfidence.textContent = '인식 완료';
    elements.recognitionStatus.textContent = `층: ${floor}, 방향: ${direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■'}`;
    elements.processingTime.textContent = `${processingTime} ms`;

    // 세그먼트 시뮬레이션 (실제 ESP32에서는 세그먼트 데이터를 별도로 받아야 함)
    updateSegmentDisplay(floor);
}

// ============================================================
// 실제 세그먼트 데이터로 디스플레이 업데이트
// ============================================================
function updateRealSegments(segments) {
    const segmentNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    segmentNames.forEach((name, index) => {
        const segment = elements.segments[name];
        const valueDisplay = elements.segmentValues[name];
        const isActive = segments[index] === 1;

        if (isActive) {
            segment.className = 'segment segment-active';
            valueDisplay.textContent = `${name.toUpperCase()}: ON`;
            valueDisplay.className = 'segment-value active';
        } else {
            segment.className = 'segment segment-inactive';
            valueDisplay.textContent = `${name.toUpperCase()}: OFF`;
            valueDisplay.className = 'segment-value inactive';
        }
    });
}

// ============================================================
// 세그먼트 디스플레이 업데이트 (백업 - 연결 실패 시 사용)
// ============================================================
function updateSegmentDisplay(number) {
    // 7-segment 숫자 패턴
    const digitPatterns = {
        0: [1, 1, 1, 1, 1, 1, 0],  // 0
        1: [0, 1, 1, 0, 0, 0, 0],  // 1
        2: [1, 1, 0, 1, 1, 0, 1],  // 2
        3: [1, 1, 1, 1, 0, 0, 1],  // 3
        4: [0, 1, 1, 0, 0, 1, 1],  // 4
        5: [1, 0, 1, 1, 0, 1, 1],  // 5
        6: [1, 0, 1, 1, 1, 1, 1],  // 6
        7: [1, 1, 1, 0, 0, 0, 0],  // 7
        8: [1, 1, 1, 1, 1, 1, 1],  // 8
        9: [1, 1, 1, 1, 0, 1, 1]   // 9
    };

    const segmentNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    if (number >= 0 && number <= 9) {
        const pattern = digitPatterns[number];
        segmentNames.forEach((name, index) => {
            const segment = elements.segments[name];
            const valueDisplay = elements.segmentValues[name];

            if (pattern[index]) {
                segment.className = 'segment segment-active';
                valueDisplay.textContent = `${name.toUpperCase()}: ON`;
                valueDisplay.className = 'segment-value active';
            } else {
                segment.className = 'segment segment-inactive';
                valueDisplay.textContent = `${name.toUpperCase()}: OFF`;
                valueDisplay.className = 'segment-value inactive';
            }
        });
    } else if (number >= 10 && number <= 99) {
        // 두 자리 숫자인 경우, 첫 번째 자리만 표시 (시뮬레이션)
        const firstDigit = Math.floor(number / 10);
        updateSegmentDisplay(firstDigit);
    } else {
        // 알 수 없는 숫자
        segmentNames.forEach(name => {
            const segment = elements.segments[name];
            const valueDisplay = elements.segmentValues[name];

            segment.className = 'segment segment-unknown';
            valueDisplay.textContent = `${name.toUpperCase()}: --`;
            valueDisplay.className = 'segment-value unknown';
        });
    }
}

// ============================================================
// 통계 업데이트
// ============================================================
function updateStats(successful, processingTime) {
    stats.totalCaptures++;

    if (successful) {
        stats.successfulCaptures++;
    } else {
        stats.failedCaptures++;
    }

    if (processingTime > 0) {
        stats.processingTimes.push(processingTime);
        if (stats.processingTimes.length > 100) {
            stats.processingTimes.shift();
        }
    }

    // UI 업데이트
    elements.stats.totalCaptures.textContent = stats.totalCaptures;
    elements.stats.successfulCaptures.textContent = stats.successfulCaptures;
    elements.stats.failedCaptures.textContent = stats.failedCaptures;

    if (stats.processingTimes.length > 0) {
        const avgTime = stats.processingTimes.reduce((a, b) => a + b, 0) / stats.processingTimes.length;
        elements.stats.avgProcessingTime.textContent = `${Math.round(avgTime)} ms`;
    }

    if (stats.totalCaptures > 0) {
        const successRate = (stats.successfulCaptures / stats.totalCaptures) * 100;
        elements.stats.successRate.textContent = `${successRate.toFixed(1)}%`;
    }
}

// ============================================================
// 업데이트 루프
// ============================================================
async function updateLoop() {
    if (!config.isConnected) {
        return;
    }

    // 이미지 캡처
    const imageBlob = await captureImage();

    // 인식 데이터 가져오기
    const recognitionData = await fetchRecognitionData();

    // 결과 표시
    if (recognitionData) {
        displayRecognitionResult(recognitionData);
        updateStats(true, recognitionData.processingTime);

        const floor = recognitionData.floor;
        const direction = recognitionData.direction;
        addLog(`인식 성공: ${floor}층 (${direction === 'up' ? '상행' : direction === 'down' ? '하행' : '정지'})`, 'success');
    } else {
        displayRecognitionResult(null);
        updateStats(false, 0);
    }
}

// ============================================================
// 연결 관리
// ============================================================
async function connectToESP32() {
    const url = elements.esp32Url.value.trim();
    const interval = parseInt(elements.updateInterval.value) || 1000;

    if (!url) {
        addLog('ESP32 URL을 입력해주세요', 'error');
        return;
    }

    config.esp32Url = url;
    config.updateInterval = interval;

    updateConnectionStatus('connecting');
    addLog(`${config.esp32Url}에 연결 시도 중...`, 'info');

    // 연결 테스트
    try {
        const response = await fetch(`${config.esp32Url}/`, {
            method: 'GET',
            timeout: 5000
        });

        if (!response.ok) {
            throw new Error('ESP32 응답 없음');
        }

        config.isConnected = true;
        updateConnectionStatus('connected');
        addLog('ESP32 연결 성공!', 'success');

        // 업데이트 루프 시작
        if (updateTimer) {
            clearInterval(updateTimer);
        }

        updateTimer = setInterval(updateLoop, config.updateInterval);

        // 첫 번째 업데이트 즉시 실행
        updateLoop();

    } catch (error) {
        config.isConnected = false;
        updateConnectionStatus('error');
        addLog(`연결 실패: ${error.message}`, 'error');
    }
}

function disconnectFromESP32() {
    config.isConnected = false;

    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }

    updateConnectionStatus('disconnected');
    addLog('ESP32 연결 해제', 'info');
}

// ============================================================
// 이벤트 리스너
// ============================================================
elements.connectBtn.addEventListener('click', connectToESP32);
elements.disconnectBtn.addEventListener('click', disconnectFromESP32);
elements.captureOnceBtn.addEventListener('click', () => {
    if (config.isConnected) {
        updateLoop();
    } else {
        addLog('먼저 ESP32에 연결해주세요', 'error');
    }
});

elements.clearLogBtn.addEventListener('click', clearLog);
elements.autoScroll.addEventListener('change', (e) => {
    config.autoScroll = e.target.checked;
});

// ============================================================
// 초기화
// ============================================================
function init() {
    addLog('디버깅 시스템 초기화 완료', 'info');
    addLog('ESP32 URL을 설정하고 연결 버튼을 클릭하세요', 'info');

    // URL 입력창에서 Enter 키로 연결
    elements.esp32Url.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectToESP32();
        }
    });
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', init);