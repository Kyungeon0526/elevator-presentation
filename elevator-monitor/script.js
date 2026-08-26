// ============================================================
// 기숙사 엘리베이터 모니터링 - JavaScript
// ESP32 연동 포인트가 포함된 뼈대 코드
// ============================================================

// ============================================================
// 설정 (ESP32 연동 시 수정 필요)
// ============================================================
const CONFIG = {
    TOTAL_FLOORS: 16,           // 기숙사 층수 (1F ~ 16F)
    UPDATE_INTERVAL: 2000,      // 업데이트 주기 (ms) - ESP32에서 받을 때는 조정 필요

    // ESP32 연동 설정 (나중에 활성화)
    ESP32_URL: 'http://192.168.1.100', // ESP32 IP 주소 (예시)
    USE_ESP32: false,                     // true로 변경하면 ESP32에서 데이터 수신

    // 측정 방법 설정
    USE_ULTRASONIC: false,      // HC-SR04 초음파 센서 사용 여부 (ToF 대체)
    MOVEMENT_THRESHOLD: 3,      // 연속 몇 번 동일 층수면 정차로 간주 (노이즈 방지)
};

// ============================================================
// 이용량 데이터
// ============================================================
let usageData = {
    totalStops: 0,
    downwardTrips: 0,
    totalUsage: 0,  // 총 이용 횟수 (정차 + 하행 이용)
    lastStopTime: null,
    hourlyUsage: {},
    stopsByFloor: {}
};

// ============================================================
// 전역 상태
// ============================================================
let state = {
    currentFloor: 1,
    previousFloor: 1,
    direction: 'stopped',  // 'up', 'down', 'stopped'
    status: 'disconnected',  // 'disconnected', 'connected', 'moving', 'stopped'
    isMoving: false,
    sameFloorCount: 0,
    lastMovementTime: null
};

// ============================================================
// ESP32 연동 함수 (나중에 친구가 구현)
// ============================================================

/**
 * ESP32에서 현재 층수 데이터 가져오기
 *
 * @returns {Promise<Object>} { floor: number, direction: string }
 *
 * 구현 예시 (친구가 ESP32 웹서버를 만들면):
 * - ESP32가 /api/status 엔드포인트 제공
 * - 응답: { "floor": 3, "direction": "up" }
 * - fetch() 또는 WebSocket으로 연결
 */
async function fetchFromESP32() {
    try {
        // TODO: ESP32 연동 시 이 부분 구현
        // 예시:
        // const response = await fetch(`${CONFIG.ESP32_URL}/api/status`);
        // const data = await response.json();
        // return {
        //     floor: data.floor,
        //     direction: data.direction
        // };

        // 임시: 아직 연동 안 됨
        console.log('ESP32 연동 대기 중...');
        return null;
    } catch (error) {
        console.error('ESP32 연동 오류:', error);
        return null;
    }
}

/**
 * WebSocket으로 ESP32와 실시간 연결 (선택 사항)
 *
 * ESP32가 WebSocket 서버를 제공하면 더 부드러운 실시간 업데이트 가능
 */
function connectWebSocket() {
    // TODO: ESP32 WebSocket 서버 준비되면 구현
    // const ws = new WebSocket('ws://192.168.1.100/ws');

    // ws.onmessage = (event) => {
    //     const data = JSON.parse(event.data);
    //     updateElevatorState(data.floor, data.direction);
    // };
}

// ============================================================
// 시뮬레이션 함수 (테스트용 - ESP32 연동 전까지 사용)
// ============================================================

/**
 * 시뮬레이션: 엘리베이터 이동 시뮬레이션 (ToF 없을 때)
 *
 * ESP32 연동 전까지 동작 확인용
 */
function simulateElevatorMovement() {
    // 층수가 변하는 시뮬레이션 (이동 중)
    if (!state.isMoving && Math.random() > 0.3) {
        // 이동 시작
        let nextFloor;
        do {
            nextFloor = Math.floor(Math.random() * CONFIG.TOTAL_FLOORS) + 1;
        } while (nextFloor === state.currentFloor);

        updateElevatorState(nextFloor);
    } else if (state.isMoving) {
        // 이동 중에는 같은 층수 유지 (정차 감지를 위해)
        updateElevatorState(state.currentFloor);
    }
}

/**
 * 시뮬레이션: 엘리베이터 이동 시뮬레이션 (ESP32 연동용)
 *
 * ESP32 연동 전까지 동작 확인용
 */
function simulateElevatorMovementWithDirection() {
    // 랜덤한 다음 층 선택 (현재 층 제외)
    let nextFloor;
    do {
        nextFloor = Math.floor(Math.random() * CONFIG.TOTAL_FLOORS) + 1;
    } while (nextFloor === state.currentFloor);

    // 방향 결정
    const direction = nextFloor > state.currentFloor ? 'up' : 'down';

    console.log(`시뮬레이션: ${state.currentFloor}F → ${nextFloor}F (${direction})`);

    // 업데이트
    updateElevatorStateWithDirection(nextFloor, direction);
}

// ============================================================
// 업데이트 함수
// ============================================================

/**
 * 엘리베이터 상태 업데이트 (ToF 없을 때)
 *
 * @param {number} floor - 현재 층 (1 ~ 16)
 */
function updateElevatorState(floor) {
    const newFloor = floor;
    const now = new Date();

    // 층수가 변했음 = 이동 중
    if (newFloor !== state.currentFloor) {
        state.isMoving = true;
        state.sameFloorCount = 0;
        state.previousFloor = state.currentFloor;
        state.currentFloor = newFloor;

        // 방향 결정
        state.direction = newFloor > state.previousFloor ? 'up' : 'down';

        // 하행 이용량 체크 (1층 아닌 곳 → 1층)
        if (state.currentFloor === 1 && state.previousFloor !== 1) {
            usageData.downwardTrips++;
            usageData.totalUsage++;  // 하행 이용도 총 이용 횟수에 포함
            console.log(`👇 하행 이용: ${state.previousFloor}F → 1F`);
            console.log(`📊 총 하행 이용량: ${usageData.downwardTrips}`);
        }

        console.log(`🚀 이동: ${state.previousFloor}F → ${state.currentFloor}F (${state.direction})`);
    }
    // 층수가 동일하고 이동 중이었음 = 정차 감지
    else if (newFloor === state.currentFloor && state.isMoving) {
        state.sameFloorCount++;

        // 연속 몇 번 동일 층수면 정차로 간주 (노이즈 방지)
        if (state.sameFloorCount >= CONFIG.MOVEMENT_THRESHOLD) {
            state.isMoving = false;
            state.status = 'stopped';
            state.direction = 'stopped';

            // 정차 기록
            usageData.totalStops++;
            usageData.totalUsage++;  // 정차도 이용 횟수에 포함
            usageData.lastStopTime = now;

            // 층별 정차 횟수 기록
            const floorKey = `${state.currentFloor}F`;
            usageData.stopsByFloor[floorKey] = (usageData.stopsByFloor[floorKey] || 0) + 1;

            // 시간대별 이용량 기록
            const hourKey = `${now.getHours()}시`;
            usageData.hourlyUsage[hourKey] = (usageData.hourlyUsage[hourKey] || 0) + 1;

            console.log(`🚪 정차: ${state.currentFloor}F`);
            console.log(`📊 총 정차 횟수: ${usageData.totalStops}`);

            state.sameFloorCount = 0;
        }
    } else {
        state.sameFloorCount = 0;
    }

    // UI 업데이트
    updateUI();
    updateDashboard();
}

/**
 * 엘리베이터 상태 업데이트 (ESP32 연동용)
 *
 * @param {number} floor - 현재 층 (1 ~ 16)
 * @param {string} direction - 방향 ('up', 'down', 'stopped')
 */
function updateElevatorStateWithDirection(floor, direction) {
    // 이전 상태 저장
    state.previousFloor = state.currentFloor;
    state.currentFloor = floor;
    state.direction = direction;

    // 상태 결정
    if (state.previousFloor === state.currentFloor) {
        state.status = 'stopped';
    } else {
        state.status = 'moving';
    }

    // UI 업데이트
    updateUI();
}

/**
 * UI 업데이트
 */
function updateUI() {
    // 현재 층 표시
    document.getElementById('current-floor').textContent = `${state.currentFloor}F`;

    // 방향 표시
    const directionElement = document.getElementById('direction');
    directionElement.className = 'value'; // 클래스 초기화
    switch (state.direction) {
        case 'up':
            directionElement.textContent = '▲';
            directionElement.classList.add('direction-up');
            break;
        case 'down':
            directionElement.textContent = '▼';
            directionElement.classList.add('direction-down');
            break;
        case 'stopped':
            directionElement.textContent = '■';
            directionElement.classList.add('direction-stopped');
            break;
        default:
            directionElement.textContent = '-';
    }

    // 상태 텍스트
    const statusElement = document.getElementById('status');
    statusElement.className = 'value'; // 클래스 초기화
    if (CONFIG.USE_ESP32) {
        statusElement.textContent = state.status === 'moving' ? '운행 중' : '정지';
        statusElement.classList.add(state.status);
    } else {
        statusElement.textContent = '시뮬레이션 모드';
        statusElement.classList.add('connected');
    }

    // 엘리베이터 위치 표시
    renderElevatorPosition();

    // 마지막 업데이트 시간
    const now = new Date();
    document.getElementById('last-update').textContent =
        `마지막 업데이트: ${now.toLocaleTimeString('ko-KR')}`;
}

/**
 * 대시보드 업데이트
 */
function updateDashboard() {
    // 총 정차 횟수
    document.getElementById('total-stops').textContent = `${usageData.totalStops}회`;

    // 총 이용 횟수
    document.getElementById('total-usage').textContent = `${usageData.totalUsage}회`;

    // 마지막 정차 시간
    if (usageData.lastStopTime) {
        const timeString = usageData.lastStopTime.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('last-stop').textContent = timeString;
    }

    // 시간대별 이용량 차트 업데이트
    updateHourlyChart();
}

/**
 * 시간대별 이용량 차트 업데이트
 */
function updateHourlyChart() {
    const container = document.getElementById('hourly-usage');
    container.innerHTML = '';

    // 시간대 정렬 (00시 ~ 23시)
    const hours = Object.keys(usageData.hourlyUsage).sort();

    if (hours.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">데이터가 없습니다</p>';
        return;
    }

    // 최대값 찾기 (피크 시간대 표시용)
    const maxCount = Math.max(...Object.values(usageData.hourlyUsage));

    hours.forEach(hour => {
        const count = usageData.hourlyUsage[hour];
        const percentage = (count / maxCount) * 100;

        const isPeak = count === maxCount;

        const barHTML = `
            <div class="usage-bar">
                <div class="usage-label">${hour}</div>
                <div class="usage-bar-container">
                    <div class="usage-bar-fill ${isPeak ? 'peak-hour' : ''}" style="width: ${percentage}%">
                        <span class="usage-count">${count}회</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML += barHTML;
    });
}

/**
 * 층수 컨테이너 렌더링 (초기 1회만 실행)
 */
function renderFloors() {
    const container = document.getElementById('floors-container');
    container.innerHTML = '';

    // 16F ~ 1F 순서로 생성 (위에서 아래로)
    for (let floor = CONFIG.TOTAL_FLOORS; floor >= 1; floor--) {
        const floorElement = document.createElement('div');
        floorElement.className = 'floor';
        floorElement.id = `floor-${floor}`;

        floorElement.innerHTML = `
            <span class="floor-label">${floor}F</span>
            <div class="floor-marker"></div>
        `;

        container.appendChild(floorElement);
    }
}

/**
 * 엘리베이터 위치 렌더링 (현재 층에 표시)
 */
function renderElevatorPosition() {
    // 모든 층의 마커 제거
    document.querySelectorAll('.floor-marker').forEach(marker => {
        marker.innerHTML = '';
    });

    // 현재 층에 엘리베이터 표시
    const currentFloorElement = document.getElementById(`floor-${state.currentFloor}`);
    if (currentFloorElement) {
        const marker = currentFloorElement.querySelector('.floor-marker');
        const isMoving = state.status === 'moving';

        marker.innerHTML = `
            <div class="elevator-indicator ${isMoving ? 'moving' : ''}">
            </div>
        `;
    }
}

// ============================================================
// 메인 루프
// ============================================================

/**
 * 데이터 업데이트 메인 루프
 */
async function updateLoop() {
    if (CONFIG.USE_ESP32) {
        // ESP32에서 데이터 가져오기
        const data = await fetchFromESP32();
        if (data) {
            updateElevatorState(data.floor, data.direction);
        }
    } else {
        // 시뮬레이션 모드
        simulateElevatorMovement();
    }
}

// ============================================================
// 초기화
// ============================================================

/**
 * 앱 초기화
 */
function init() {
    console.log('엘리베이터 모니터링 시스템 시작...');

    // 층수 렌더링
    renderFloors();

    // 초기 상태 설정
    state.currentFloor = 1;
    state.previousFloor = 1;
    state.direction = 'stopped';
    state.status = CONFIG.USE_ESP32 ? 'connected' : 'disconnected';
    state.isMoving = false;
    state.sameFloorCount = 0;

    // 이용량 데이터 초기화
    usageData = {
        totalStops: 0,
        downwardTrips: 0,
        totalUsage: 0,
        lastStopTime: null,
        hourlyUsage: {},
        stopsByFloor: {}
    };

    // 초기 UI 업데이트
    updateUI();
    updateDashboard();

    // 업데이트 루프 시작
    setInterval(updateLoop, CONFIG.UPDATE_INTERVAL);

    console.log('초기화 완료');
    console.log(`총 층수: ${CONFIG.TOTAL_FLOORS}F`);
    console.log(`ESP32 연동: ${CONFIG.USE_ESP32 ? '활성' : '비활성 (시뮬레이션 모드)'}`);
}

// 페이지 로드 시 초기화
window.addEventListener('DOMContentLoaded', init);

// ============================================================
// 디버깅용: 브라우저 콘솔에서 직접 호출 가능한 함수
// ============================================================

/**
 * 수동으로 층수 변경 (테스트용)
 *
 * 사용법: 콘솔에서 changeFloor(5, 'up')
 */
window.changeFloor = (floor, direction) => {
    if (floor < 1 || floor > CONFIG.TOTAL_FLOORS) {
        console.error(`유효하지 않은 층수: ${floor} (1~${CONFIG.TOTAL_FLOORS}만 가능)`);
        return;
    }
    updateElevatorState(floor, direction);
};

/**
 * ESP32 연동 모드 토글 (테스트용)
 *
 * 사용법: 콘솔에서 toggleESP32Mode()
 */
window.toggleESP32Mode = () => {
    CONFIG.USE_ESP32 = !CONFIG.USE_ESP32;
    console.log(`ESP32 모드: ${CONFIG.USE_ESP32 ? '활성' : '비활성'}`);
    updateUI();
};