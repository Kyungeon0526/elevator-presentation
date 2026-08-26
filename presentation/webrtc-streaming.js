// ============================================
// WebRTC 실시간 스트리밍 스크립트
// ============================================

// WebSocket 서버 주소
const SIGNAL_SERVER_URL = 'wss://elevator-signaling.onrender.com'; // Render 배포 후 업데이트 필요

// WebRTC 설정
const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// 연결 상태
const connectionState = {
    isConnected: false,
    roomId: null,
    isStreaming: false,
    clientId: 'viewer-' + Math.random().toString(36).substr(2, 9),
    isHost: false
};

// WebRTC 연결 변수
let localConnection = null;
let remoteConnection = null;
let dataChannel = null;

// WebSocket 연결
let wsConnection = null;

// DOM 요소
const roomIdInput = document.getElementById('roomIdInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const connectionStatus = document.getElementById('connectionStatus');
const remoteVideo = document.getElementById('remoteVideo');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const statusIndicator = document.querySelector('.status-indicator');
const statusText = document.querySelector('.status-text');

// ============================================
// WebSocket 서버 연결
// ============================================

function connectToSignalServer() {
    try {
        wsConnection = new WebSocket(SIGNAL_SERVER_URL);

        wsConnection.onopen = () => {
            console.log('✅ WebSocket 서버 연결됨');
        };

        wsConnection.onmessage = (event) => {
            const message = JSON.parse(event.data);
            handleServerMessage(message);
        };

        wsConnection.onerror = (error) => {
            console.error('WebSocket 연결 오류:', error);
            updateConnectionStatus('error', '연결 오류');
        };

        wsConnection.onclose = () => {
            console.log('❌ WebSocket 연결 종료');
            updateConnectionStatus('disconnected', '서버 연결 끊김 - 5초 후 재연결');
            setTimeout(connectToSignalServer, 5000);
        };

    } catch (error) {
        console.error('WebSocket 연결 실패:', error);
        updateConnectionStatus('error', '서버 연결 실패');
    }
}

// 서버 메시지 처리
function handleServerMessage(message) {
    console.log('📡 서버 메시지 수신:', message.type);

    switch (message.type) {
        case 'join-success':
            handleJoinSuccess(message);
            break;
        case 'offer':
            handleRemoteOffer(message);
            break;
        case 'answer':
            handleRemoteAnswer(message);
            break;
        case 'ice-candidate':
            handleRemoteIceCandidate(message);
            break;
        case 'new-viewer':
            handleNewViewer(message);
            break;
        case 'host-left':
            handleHostLeft(message);
            break;
        case 'viewer-left':
            handleViewerLeft(message);
            break;
        default:
            console.log('알 수 없는 메시지 타입:', message.type);
    }
}

// 입장 성공 처리
function handleJoinSuccess(message) {
    console.log('✅ 입장 성공:', message);
    connectionState.roomId = message.roomId;
    connectionState.clientId = message.clientId;
    connectionState.isHost = message.isHost;

    if (connectionState.isHost) {
        // 호스트는 Offer 생성 시작
        createOffer();
    }
}

// 원격 Offer 수신
function handleRemoteOffer(offer) {
    if (remoteConnection && offer) {
        handleOffer(offer);
    }
}

// 원격 Answer 수신
function handleRemoteAnswer(answer) {
    if (localConnection && answer) {
        handleAnswer(answer);
    }
}

// 원격 ICE Candidate 수신
function handleRemoteIceCandidate(message) {
    if (message.candidate) {
        handleRemoteIceCandidate(message.candidate);
    }
}

// 새 시청자 알림
function handleNewViewer(message) {
    console.log('👥 새 시청자 입장:', message.clientId);
    updateConnectionStatus('connected', `새 시청자 입장: ${message.clientId.substring(0, 8)}...`);
}

// 호스트 퇴장 알림
function handleHostLeft(message) {
    console.log('🚪 호스트 퇴장');
    updateConnectionStatus('host-left', '호스트가 연결을 종료했습니다');
    stopStreaming();
}

// 시청자 퇴장 알림
function handleViewerLeft(message) {
    console.log('👥 시청자 퇴장:', message.clientId);
    updateConnectionStatus('viewer-left', `시청자 퇴장: ${message.clientId.substring(0, 8)}`);
}

// ============================================
// WebRTC 연결 설정
// ============================================

async function startStreaming() {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
        alert('방 이름을 입력해주세요!');
        return;
    }

    try {
        updateConnectionStatus('connecting', '연결 설정 중...');

        // WebSocket 서버 연결
        if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
            connectToSignalServer();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 방 입장 요청
        wsConnection.send(JSON.stringify({
            type: 'join',
            roomId: roomId,
            clientId: connectionState.clientId
        }));

    } catch (error) {
        console.error('연결 설정 실패:', error);
        updateConnectionStatus('error', '연결 설정 실패');
    }
}

async function stopStreaming() {
    try {
        // 방 퇴장 요청
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send(JSON.stringify({
                type: 'leave',
                roomId: connectionState.roomId,
                clientId: connectionState.clientId
            }));
        }

        // WebRTC 연결 종료
        if (localConnection) {
            localConnection.close();
        }
        if (remoteConnection) {
            remoteConnection.close();
        }

        localConnection = null;
        remoteConnection = null;
        dataChannel = null;

        connectionState.isConnected = false;
        connectionState.roomId = null;
        connectionState.isStreaming = false;
        connectionState.isHost = false;

        updateConnectionStatus('offline', '연결 대기 중');

        startBtn.style.display = 'block';
        stopBtn.style.display = 'none';

        if (remoteVideo.srcObject) {
            remoteVideo.srcObject = null;
        }

        videoPlaceholder.style.display = 'flex';

    } catch (error) {
        console.error('연결 종료 실패:', error);
    }
}

// Offer 생성 (호스트)
async function createOffer() {
    try {
        // 로컬 스트림 설정 (휴대폰은 송출자)
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
            },
            audio: true
        });

        // 로컬 비디오 요소 생성
        const localVideo = document.createElement('video');
        localVideo.srcObject = stream;
        localVideo.muted = true; // 자신 음소 처리
        localVideo.autoplay = true;
        localVideo.style.display = 'none'; // 숨김
        document.body.appendChild(localVideo);

        // 스트림 트랙 추가
        stream.getTracks().forEach(track => {
            localConnection.addTrack(track, stream);
        });

        // Offer 생성
        const offer = await localConnection.createOffer();
        await localConnection.setLocalDescription(offer);

        // Offer 전송
        wsConnection.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            roomId: connectionState.roomId,
            clientId: connectionState.clientId
        }));

        console.log('📤 Offer 전송 완료');
        updateConnectionStatus('waiting', '상대방 기다림 중...');

    } catch (error) {
        console.error('Offer 생성 실패:', error);
        updateConnectionStatus('error', '카메라 접근 실패');
    }
}

// 원격 Offer 수신
async function handleRemoteOffer(offer) {
    try {
        updateConnectionStatus('answering', '상대방 연결 설정 중...');

        // 원격 연결 생성
        remoteConnection = new RTCPeerConnection(config);
        connectionState.remoteConnection = remoteConnection;

        // ICE candidate 처리
        remoteConnection.onicecandidate = (event) => {
            if (event.candidate && wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                wsConnection.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    roomId: connectionState.roomId,
                    clientId: connectionState.clientId,
                    targetClientId: connectionState.clientId // 전체에게 전송
                }));
            }
        };

        // 연결 상태 처리
        remoteConnection.onconnectionstatechange = handleConnectionStateChange;

        // 원격 스트림 수신
        remoteConnection.ontrack = (event) => {
            handleRemoteTrack(event);
        };

        // Offer 설정
        await remoteConnection.setRemoteDescription(offer);

        // Answer 생성
        const answer = await remoteConnection.createAnswer();
        await remoteConnection.setLocalDescription(answer);

        // Answer 전송
        wsConnection.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            roomId: connectionState.roomId,
            clientId: connectionState.clientId
        }));

        console.log('📤 Answer 전송 완료');
        updateConnectionStatus('connected', '연결 완료 - 스트리밍 준비 중');

    } catch (error) {
        console.error('Answer 생성 실패:', error);
        updateConnectionStatus('error', '연결 설정 실패');
    }
}

// Answer 수신 (호스트)
async function handleAnswer(answer) {
    try {
        updateConnectionStatus('connecting', '상대방 연결 완료...');

        // Answer 설정
        await localConnection.setRemoteDescription(answer);

        connectionState.isConnected = true;
        updateConnectionStatus('streaming', '🎥 실시간 스트리밍 중');

    } catch (error) {
        console.error('Answer 설정 실패:', error);
        updateConnectionStatus('error', '연결 설정 실패');
    }
}

// 원격 ICE Candidate 수신
async function handleRemoteIceCandidate(candidate) {
    try {
        if (localConnection && candidate) {
            await localConnection.addIceCandidate(candidate);
        }
    } catch (error) {
        console.error('ICE Candidate 추가 실패:', error);
    }
}

// ============================================
// 연결 상태 처리
// ============================================

function handleConnectionStateChange() {
    const connection = localConnection || remoteConnection;
    if (!connection) return;

    if (connection.connectionState === 'connected') {
        updateConnectionStatus('connected', '✅ 연결 완료');
        connectionState.isConnected = true;
    } else if (connection.connectionState === 'disconnected') {
        updateConnectionStatus('disconnected', '연결 끊김 - 재연결 시도 중...');
        // 5초 후 재연결 시도
        setTimeout(() => {
            if (!connectionState.isConnected) {
                stopStreaming();
                // 재시작
                if (connectionState.isHost) {
                    setTimeout(() => {
                        startStreaming();
                    }, 3000);
                }
            }
        }, 5000);
    } else if (connection.connectionState === 'failed') {
        updateConnectionStatus('failed', '연결 실패');
        stopStreaming();
    }
}

// ============================================
// 원격 스트림 수신
// ============================================

function handleRemoteTrack(event) {
    if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        videoPlaceholder.style.display = 'none';
        updateConnectionStatus('streaming', '🎥 실시간 스트리밍 중');

        // 비디오 재생 시작
        remoteVideo.play().catch(error => {
            console.error('비디오 재생 실패:', error);
        });
    }
}

// ============================================
// UI 상태 업데이트
// ============================================

function updateConnectionStatus(status, message) {
    if (statusIndicator && statusText) {
        statusIndicator.className = `status-indicator status-${status}`;
        statusText.textContent = message;
    }
}

// ============================================
// 이벤트 리스너
// ============================================

startBtn.addEventListener('click', startStreaming);
stopBtn.addEventListener('click', stopStreaming);
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startStreaming();
});

// ============================================
// 초기화
// ============================================

// 페이지 로드 시 WebSocket 서버 연결
document.addEventListener('DOMContentLoaded', () => {
    connectToSignalServer();
    console.log('🚀 엘리베이터 스트리밍 시스템이 초기화되었습니다.');
    console.log('📹 WebSocket 서버에 연결되었습니다.');
    console.log('방 이름을 입력하고 "송출 시작"을 클릭하세요.');
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    stopStreaming();
    if (wsConnection) {
        wsConnection.close();
    }
});

console.log('📱 클라이언트 코드가 로드되었습니다.');
console.log('휴대폰과 발표용 노트북이 같은 방 이름으로 연결됩니다.');