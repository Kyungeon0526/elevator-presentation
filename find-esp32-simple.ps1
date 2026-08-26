# ============================================================
# ESP32 IP 빠른 찾기 (간단 버전)
# ============================================================

Write-Host "🔍 ESP32 IP 빠른 찾기..." -ForegroundColor Cyan

# 현재 네트워크 대역 확인
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" }).IPAddress
$parts = $ip.Split('.')
$base = "$($parts[0]).$($parts[1]).$($parts[2])"

Write-Host "📡 네트워크: $base.0/24" -ForegroundColor Green
Write-Host ""

# ESP32 가능성 있는 IP 스캔 (빠른 버전)
Write-Host "🔎 스캔 중..." -ForegroundColor Yellow

$foundESP32 = @()

# 흔히 사용되는 IP 범위
$range = 100..150

foreach ($i in $range) {
    $target = "$base.$i"

    # 빠른 핑 테스트
    if (Test-Connection -ComputerName $target -Count 1 -Quiet -ErrorAction SilentlyContinue) {
        Write-Host "   📱 $target - 기기 발견" -ForegroundColor Cyan

        # MAC 주소 확인
        try {
            $arp = arp -a $target
            if ($arp -match "([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})") {
                $mac = $matches[0]

                # ESP32 확인
                if ($mac -match "(24:0A:C4|30:AE:A4|84:CC:A8|AC:67:B2|DC:4F:22)") {
                    $foundESP32 += $target
                    Write-Host "   🎯 ESP32 발견! $target" -ForegroundColor Green
                }
            }
        } catch {}
    }
}

Write-Host ""

# 결과
if ($foundESP32.Count -gt 0) {
    Write-Host "✅ ESP32 IP: $($foundESP32 -join ', ')" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 브라우저에서 확인: http://$($foundESP32[0])" -ForegroundColor Yellow

    # 브라우저 열기
    Start-Process "http://$($foundESP32[0])"
} else {
    Write-Host "❌ ESP32를 찾을 수 없음" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 수동으로 확인:" -ForegroundColor Yellow
    Write-Host "   1. 라우터 관리 페이지 접속 (http://192.168.1.1)" -ForegroundColor White
    Write-Host "   2. 연결된 기기 목록 확인" -ForegroundColor White
    Write-Host "   3. ESP32 또는 ESPRESSIF 이름 찾기" -ForegroundColor White
}