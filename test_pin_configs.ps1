# ESP32-S3OV3660 핀 설정 자동 테스트 스크립트

$ErrorActionPreference = "Stop"

# 설정
$ArduinoCLIPath = ".\arduino-cli_1.5.2-rc.1_Windows_64bit\arduino-cli.exe"
$SketchPath = "esp32_vision\elevator_camera_s3_optimized.ino"
$PinConfigHeader = "esp32_vision\pin_configurations.h"
$Port = "COM7"
$BoardModel = "esp32:esp32:esp32s3usbotg"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 ESP32-S3OV3660 핀 설정 자동 테스트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 현재 디렉토리 확인
if (!(Test-Path $SketchPath)) {
    Write-Host "❌ 스킷 파일을 찾을 수 없습니다: $SketchPath" -ForegroundColor Red
    exit 1
}

# Arduino CLI 존재 확인
if (!(Test-Path $ArduinoCLIPath)) {
    Write-Host "❌ Arduino CLI를 찾을 수 없습니다: $ArduinoCLIPath" -ForegroundColor Red
    exit 1
}

# 핀 설정 테스트 시작
$SuccessConfig = $null

for ($ConfigNum = 1; $ConfigNum -le 3; $ConfigNum++) {
    Write-Host "`n🔄 [$ConfigNum/3] 핀 설정 $ConfigNum 테스트 중..." -ForegroundColor Yellow

    # 핀 설정 파일 수정
    $PinConfigContent = Get-Content $PinConfigHeader -Raw
    $PinConfigContent = $PinConfigContent -replace "#define USE_PIN_CONFIG \d+", "#define USE_PIN_CONFIG $ConfigNum"
    Set-Content -Path $PinConfigHeader -Value $PinConfigContent -NoNewline

    Write-Host "  📝 핀 설정 $ConfigNum 적용 완료" -ForegroundColor Gray

    try {
        # 컴파일
        Write-Host "  📝 컴파일 중..." -ForegroundColor Gray
        $CompileResult = & $ArduinoCLIPath compile --fqbn $BoardModel $SketchPath 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ 컴파일 실패" -ForegroundColor Red
            continue
        }

        Write-Host "  ✅ 컴파일 성공" -ForegroundColor Green

        # 업로드
        Write-Host "  🚀 업로드 중..." -ForegroundColor Gray
        $UploadResult = & $ArduinoCLIPath upload -p $Port --fqbn $BoardModel $SketchPath 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅✅✅ 업로드 성공! 핀 설정 $ConfigNum 작동! ✅✅✅" -ForegroundColor Green
            $SuccessConfig = $ConfigNum

            # 시리얼 모니터로 카메라 초기화 확인
            Write-Host "  🔍 카메라 초기화 확인 중..." -ForegroundColor Gray
            Start-Sleep -Seconds 2

            # 시리얼 모니터에서 카메라 초기화 메시지 확인
            $MonitorCheck = & $ArduinoCLIPath monitor -p $Port -c baudrate=115200 --timeout 3 2>&1 |
                          Select-String "카메라 초기화 완료" -Context 0,2

            if ($MonitorCheck) {
                Write-Host "  🎉 카메라 초기화 성공!" -ForegroundColor Green
                break
            } else {
                Write-Host "  ⚠️ 업로드는 성공했으나 카메라 초기화 실패" -ForegroundColor Yellow
            }

        } else {
            Write-Host "  ❌ 업로드 실패" -ForegroundColor Red
        }

    } catch {
        Write-Host "  ❌ 오류 발생: $_" -ForegroundColor Red
    }
}

# 결과 요약
Write-Host "`n========================================" -ForegroundColor Cyan
if ($SuccessConfig) {
    Write-Host "🎉 성공! 작동하는 핀 설정: $SuccessConfig" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`n📱 다음 단계:" -ForegroundColor Yellow
    Write-Host "1. USB 케이블 재연결" -ForegroundColor White
    Write-Host "2. 시리얼 모니터 확인:" -ForegroundColor White
    Write-Host "   .\$ArduinoCLIPath monitor -p $Port -c baudrate=115200" -ForegroundColor Cyan
    Write-Host "3. WiFi 연결: ESP32-Sense (비밀번호: 12345678)" -ForegroundColor White
    Write-Host "4. 웹페이지 접속: http://192.168.4.1" -ForegroundColor White

    # 자동으로 시리얼 모니터 시작 확인 질문
    $StartMonitor = Read-Host "`n시리얼 모니터를 바로 시작하시겠습니까? (Y/N)"
    if ($StartMonitor -eq "Y" -or $StartMonitor -eq "y") {
        Write-Host "`n🔍 시리얼 모니터 시작 (종료하려면 CTRL+C)..." -ForegroundColor Yellow
        & $ArduinoCLIPath monitor -p $Port -c baudrate=115200
    }
} else {
    Write-Host "❌ 모든 핀 설정 테스트 실패" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`n🛠️ 다음 단계:" -ForegroundColor Yellow
    Write-Host "1. 다른 보드 모델 테스트:" -ForegroundColor White
    Write-Host "   .\test_esp32_s3_boards.ps1" -ForegroundColor Cyan
    Write-Host "2. 하드웨어 연결 확인:" -ForegroundColor White
    Write-Host "   - 카메라 모듈 연결 상태" -ForegroundColor White
    Write-Host "   - 전력 공급 (안정적인 5V)" -ForegroundColor White
    Write-Host "   - USB 케이블 상태" -ForegroundColor White
}
