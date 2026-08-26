# ============================================================
# ESP32 IP 자동 찾기 스크립트
# PowerShell에서 실행하세요
# ============================================================

Write-Host "🔍 ESP32 IP 자동 찾기 시작..." -ForegroundColor Cyan
Write-Host ""

# 1. 네트워크 대역 찾기
Write-Host "📡 네트워크 대역 확인 중..." -ForegroundColor Yellow

$ipConfig = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" }

if ($ipConfig.Count -eq 0) {
    Write-Host "❌ 네트워크 연결을 찾을 수 없습니다" -ForegroundColor Red
    exit
}

$networkInfo = $ipConfig[0]
$ipParts = $networkInfo.IPAddress.Split('.')
$networkBase = "$($ipParts[0]).$($ipParts[1]).$($ipParts[2])"

Write-Host "✅ 네트워크 대역: $networkBase.0/24" -ForegroundColor Green
Write-Host ""

# 2. ESP32 후보 IP 스캔
Write-Host "🔎 ESP32 IP 스캔 중..." -ForegroundColor Yellow
Write-Host "   (이 과정은 약 1-2분 정도 소요됩니다)" -ForegroundColor Gray

$esp32Candidates = @()

# 가능한 IP 범위 스캔 (100-199 범위만 먼저)
$ipRange = 100..199

foreach ($lastOctet in $ipRange) {
    $targetIP = "$networkBase.$lastOctet"

    # 핑 테스트
    $ping = Test-Connection -ComputerName $targetIP -Count 1 -Quiet -ErrorAction SilentlyContinue

    if ($ping) {
        # MAC 주소 확인
        try {
            $arpResult = arp -a $targetIP
            if ($arpResult -match "([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})") {
                $macAddress = $matches[0]

                # ESP32 제조사 확인 (Espressif)
                $esp32Vendors = @("ESPRESSIF", "24:0A:C4", "30:AE:A4", "84:CC:A8", "AC:67:B2", "DC:4F:22")

                $isESP32 = $false
                foreach ($vendor in $esp32Vendors) {
                    if ($macAddress -like "*$vendor*") {
                        $isESP32 = $true
                        break
                    }
                }

                if ($isESP32) {
                    $esp32Candidates += @{
                        IP = $targetIP
                        MAC = $macAddress
                        Vendor = "ESP32 (Espressif)"
                    }
                    Write-Host "   🎯 ESP32 발견! $targetIP (MAC: $macAddress)" -ForegroundColor Green
                } else {
                    Write-Host "   📱 기기 발견: $targetIP (MAC: $macAddress)" -ForegroundColor Cyan
                }
            }
        } catch {
            # ARP 정보를 가져올 수 없으면 그냥 IP만 저장
            $esp32Candidates += @{
                IP = $targetIP
                MAC = "알 수 없음"
                Vendor = "알 수 없음"
            }
        }
    }

    # 진행률 표시
    if ($lastOctet % 10 -eq 0) {
        $progress = [math]::Round(($lastOctet - 100) / 100 * 100)
        Write-Host "   진행률: $progress%" -ForegroundColor Gray
    }
}

Write-Host ""

# 3. 결과 표시
if ($esp32Candidates.Count -gt 0) {
    Write-Host "✅ ESP32 후보 발견!" -ForegroundColor Green
    Write-Host ""

    $esp32Candidates | ForEach-Object {
        Write-Host "📡 IP 주소: $($_.IP)" -ForegroundColor White
        Write-Host "   MAC 주소: $($_.MAC)" -ForegroundColor Gray
        Write-Host "   제조사: $($_.Vendor)" -ForegroundColor Gray
        Write-Host ""
    }

    # 웹 브라우저로 테스트
    $firstESP32 = $esp32Candidates[0].IP
    Write-Host "🌐 브라우저에서 테스트: http://$firstESP32" -ForegroundColor Yellow

    # 자동으로 브라우저 열기
    Start-Process "http://$firstESP32"

    # 연결 테스트
    Write-Host ""
    Write-Host "🔗 연결 테스트 중..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://$firstESP32" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ 웹서버 응답 성공!" -ForegroundColor Green
        Write-Host "   상태 코드: $($response.StatusCode)" -ForegroundColor Gray

        # API 테스트
        Write-Host ""
        Write-Host "📊 API 테스트 중..." -ForegroundColor Yellow

        $statusResponse = Invoke-WebRequest -Uri "http://$firstESP32/api/status" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($statusResponse) {
            $statusData = $statusResponse.Content | ConvertFrom-Json
            Write-Host "✅ API 상태:" -ForegroundColor Green
            Write-Host "   층수: $($statusData.floor)" -ForegroundColor White
            Write-Host "   방향: $($statusData.direction)" -ForegroundColor White
        }

    } catch {
        Write-Host "❌ 연결 실패: $($_.Exception.Message)" -ForegroundColor Red
    }

} else {
    Write-Host "❌ ESP32를 찾을 수 없습니다" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 가능한 원인:" -ForegroundColor Yellow
    Write-Host "   1. ESP32가 켜져 있지 않음" -ForegroundColor White
    Write-Host "   2. WiFi 연결 실패" -ForegroundColor White
    Write-Host "   3. 다른 네트워크 대역에 있음" -ForegroundColor White
    Write-Host "   4. 방화벽이 차단하고 있음" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 스캔 완료!" -ForegroundColor Cyan