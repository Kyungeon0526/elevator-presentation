// ============================================================
// 연결 진단 도구
// 브라우저 콘솔에서 실행하세요
// ============================================================

async function diagnoseConnection() {
    console.log('🔍 ESP32 연결 진단 시작...\n');

    // 1. 기본 설정 확인
    const esp32Url = prompt('ESP32 URL을 입력하세요 (예: http://192.168.1.100):', 'http://192.168.1.100');

    if (!esp32Url) {
        console.log('❌ 진단 취소됨');
        return;
    }

    console.log(`📡 대상 URL: ${esp32Url}\n`);

    // 2. 루트 엔드포인트 테스트
    try {
        console.log('🔵 1. 루트 엔드포인트 테스트 (/)...');
        const rootResponse = await fetch(esp32Url);
        console.log(`✅ 상태 코드: ${rootResponse.status}`);
        const rootText = await rootResponse.text();
        console.log(`📄 응답 내용 (100자): ${rootText.substring(0, 100)}...\n`);
    } catch (error) {
        console.log(`❌ 루트 엔드포인트 실패: ${error.message}\n`);
        console.log('💡 해결 방법:');
        console.log('   1. ESP32 전원 확인');
        console.log('   2. IP 주소 확인');
        console.log('   3. 같은 네트워크에 있는지 확인\n');
        return;
    }

    // 3. API 상태 테스트
    try {
        console.log('🔵 2. API 상태 테스트 (/api/status)...');
        const statusResponse = await fetch(`${esp32Url}/api/status`);
        const statusData = await statusResponse.json();
        console.log(`✅ API 상태:`);
        console.log(`   층수: ${statusData.floor}`);
        console.log(`   방향: ${statusData.direction}`);
        console.log(`   처리 시간: ${statusData.processingTime}ms\n`);
    } catch (error) {
        console.log(`❌ API 상태 실패: ${error.message}\n`);
    }

    // 4. 세그먼트 API 테스트
    try {
        console.log('🔵 3. 세그먼트 API 테스트 (/api/segments)...');
        const segmentsResponse = await fetch(`${esp32Url}/api/segments`);
        const segmentsData = await segmentsResponse.json();
        console.log(`✅ 세그먼트 상태:`);
        console.log(`   세그먼트: [${segmentsData.segments.join(', ')}]`);
        console.log(`   인식 층수: ${segmentsData.floor}\n`);
    } catch (error) {
        console.log(`❌ 세그먼트 API 실패: ${error.message}`);
        console.log('💡 ESP32 코드 업데이트 필요 (최신 버전 확인)\n');
    }

    // 5. 카메라 캡처 테스트
    try {
        console.log('🔵 4. 카메라 캡처 테스트 (/capture)...');
        const captureResponse = await fetch(`${esp32Url}/capture`);
        console.log(`✅ 상태 코드: ${captureResponse.status}`);
        console.log(`   Content-Type: ${captureResponse.headers.get('Content-Type')}`);
        console.log(`   Content-Length: ${captureResponse.headers.get('Content-Length')} bytes\n`);
    } catch (error) {
        console.log(`❌ 카메라 캡처 실패: ${error.message}\n`);
    }

    console.log('🎉 진단 완료!');
    console.log('\n💡 다음 단계:');
    console.log('   1. 모든 테스트가 성공했다면 debug.html에서 사용하세요');
    console.log('   2. 일부 실패했다면 위의 해결 방법을 참조하세요');
}

// 진단 실행
diagnoseConnection();