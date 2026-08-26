const WebSocket = require('ws');
const http = require('http');

// HTTP 서버 생성 (Render 배포용)
const server = http.createServer();

const wss = new WebSocket.Server({ port: 3001 }, server);

// 방 관리
const rooms = new Map();

// 연결 관리
const clients = new Map();

console.log('🚀 엘리베이터 스트리밍 시그널링 서버 시작');
console.log('📡 WebSocket 서버: ws://localhost:3001');

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`📱 새 연결: ${clientIp}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            console.error('메시지 파싱 오류:', error);
        }
    });

    ws.on('close', () => {
        console.log(`❌ 연결 종료: ${clientIp}`);
        cleanupClient(ws);
    });

    ws.on('error', (error) => {
        console.error('연결 오류:', error);
    });
});

// WebSocket 메시지 처리
function handleWebSocketMessage(ws, data) {
    switch (data.type) {
        case 'join':
            handleJoin(ws, data);
            break;
        case 'offer':
            handleOffer(ws, data);
            break;
        case 'answer':
            handleAnswer(ws, data);
            break;
        case 'ice-candidate':
            handleIceCandidate(ws, data);
            break;
        case 'leave':
            handleLeave(ws, data);
            break;
        default:
            console.log('알 수 없는 메시지 타입:', data.type);
    }
}

// 방 입장 처리
function handleJoin(ws, data) {
    const { roomId, clientId } = data;

    console.log(`🏠 방 입장 시도: ${roomId} (클라이언트: ${clientId})`);

    if (!rooms.has(roomId)) {
        // 새 방 생성
        rooms.set(roomId, {
            host: ws,
            viewers: [],
            createdAt: Date.now()
        });
        console.log(`✅ 새 방 생성: ${roomId}`);
    }

    const room = rooms.get(roomId);

    // 클라이언트 저장
    clients.set(ws, { clientId, roomId });

    // 호스트인지 확인
    if (room.host && room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify({
            type: 'join-success',
            roomId,
            clientId,
            isHost: ws === room.host
        }));
    } else {
        // 방 참여 가능
        ws.send(JSON.stringify({
            type: 'join-success',
            roomId,
            clientId,
            isHost: false
        }));

        // 호스트에게 새 시청자 알림
        if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({
                type: 'new-viewer',
                clientId,
                roomId
            }));
        }
    }

    console.log(`✅ 방 입장 성공: ${roomId}`);
}

// Offer 처리 (휴대폰 → 서버 → 발표 노트북)
function handleOffer(ws, data) {
    const { roomId, offer, clientId } = data;

    console.log(`📤 Offer 수신: ${roomId} (클라이언트: ${clientId})`);

    if (!rooms.has(roomId)) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '방을 찾을 수 없습니다.'
        }));
        return;
    }

    const room = rooms.get(roomId);

    // 호스트에게 Offer 전달
    if (room.host && room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify({
            type: 'offer',
            offer,
            clientId,
            roomId
        }));

        // Offer 전송자 저장 (나중에 ICE Candidate 전달용)
        clients.set(ws, { ...clients.get(ws), offerSender: ws });
    }
}

// Answer 처리 (발표 노트북 → 서버 → 휴대폰)
function handleAnswer(ws, data) {
    const { roomId, answer, clientId } = data;

    console.log(`📤 Answer 수신: ${roomId} (클라이언트: ${clientId})`);

    if (!rooms.has(roomId)) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '방을 찾을 수 없습니다.'
        }));
        return;
    }

    const room = rooms.get(roomId);
    const offerSender = clients.get(ws);

    // Offer 전송자에게 Answer 전달
    if (offerSender && offerSender.offerSender && offerSender.offerSender.readyState === WebSocket.OPEN) {
        offerSender.offerSender.send(JSON.stringify({
            type: 'answer',
            answer,
            roomId,
            targetClientId: clientId
        }));
    }
}

// ICE Candidate 처리
function handleIceCandidate(ws, data) {
    const { roomId, candidate, clientId, targetClientId } = data;

    console.log(`❄️ ICE Candidate 수신: ${roomId}`);

    if (!rooms.has(roomId)) {
        return;
    }

    const room = rooms.get(roomId);

    // 대상 클라이언트 찾기
    let targetWs = null;

    if (targetClientId) {
        // 특정 대상에게 전달
        for (const [clientWs, clientData] of clients) {
            if (clientData.clientId === targetClientId) {
                targetWs = clientWs;
                break;
            }
        }
    } else {
        // Offer 전송자에게 전달
        for (const [clientWs, clientData] of clients) {
            if (clientData.offerSender === ws || clientWs === ws) {
                targetWs = clientWs;
                break;
            }
        }
    }

    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'ice-candidate',
            candidate,
            roomId,
            clientId,
            targetClientId
        }));
    }
}

// 방 퇴장 처리
function handleLeave(ws, data) {
    const { roomId, clientId } = data;

    console.log(`🚪 방 퇴장: ${roomId} (클라이언트: ${clientId})`);

    if (!rooms.has(roomId)) {
        return;
    }

    const room = rooms.get(roomId);

    // 호스트가 나갈 경우 방 삭제
    if (ws === room.host) {
        // 시청자들에게 호스트 나갔음 알림
        room.viewers.forEach(viewer => {
            if (viewer.readyState === WebSocket.OPEN) {
                viewer.send(JSON.stringify({
                    type: 'host-left',
                    roomId
                }));
            }
        });

        rooms.delete(roomId);
        console.log(`🗑️ 방 삭제: ${roomId}`);
    } else {
        // 시청자 퇴장
        room.viewers = room.viewers.filter(viewer => viewer !== ws);

        // 호스트에게 시청자 나감 알림
        if (room.host && room.host.readyState === WebSocket.OPEN) {
            room.host.send(JSON.stringify({
                type: 'viewer-left',
                clientId,
                roomId
            }));
        }
    }

    cleanupClient(ws);
}

// 클라이언트 정리
function cleanupClient(ws) {
    const clientData = clients.get(ws);
    if (clientData && clientData.roomId && rooms.has(clientData.roomId)) {
        const room = rooms.get(clientData.roomId);

        if (ws !== room.host) {
            room.viewers = room.viewers.filter(viewer => viewer !== ws);
        }
    }

    clients.delete(ws);
}

// HTTP 요청 처리 (Render 배포용)
server.on('request', (req, res) => {
    // CORS 허용
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 헬스체크
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            activeRooms: rooms.size,
            connectedClients: clients.size
        }));
        return;
    }

    // 방 정보 API
    if (req.url.startsWith('/room/')) {
        const roomId = req.url.split('/room/')[1];

        if (req.method === 'GET') {
            if (rooms.has(roomId)) {
                const room = rooms.get(roomId);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    roomId,
                    exists: true,
                    hasHost: room.host && room.host.readyState === WebSocket.OPEN,
                    viewerCount: room.viewers.length,
                    createdAt: room.createdAt
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Room not found' }));
            }
        }
        return;
    }

    // 기타 요청
    res.writeHead(404);
    res.end('Not Found');
});

// 주기적 연결 정리
setInterval(() => {
    // 1시간 이상 비활성 방 정리
    const now = Date.now();
    for (const [roomId, room] of rooms) {
        if (now - room.createdAt > 3600000 && (!room.host || room.host.readyState !== WebSocket.OPEN)) {
            rooms.delete(roomId);
            console.log(`🗑️ 비활성 방 정리: ${roomId}`);
        }
    }
}, 600000); // 10분마다 체크

// 서버 시작 알림
console.log('✅ WebSocket 서버 실행 중');
console.log('📡 포트: 3000 (WebSockets)');
console.log('🌐 HTTP 포트: 3001 (HTTP)');

// Graceful shutdown
process.on('SIGTERM', () => {
    wss.clients.forEach((client) => {
        client.terminate();
    });
    server.close(() => {
        console.log('🛑 서버 종료 완료');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 사용자 중단');
    process.exit(0);
});