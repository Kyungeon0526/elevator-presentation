# ESP32-S3OV3660 다양한 보드 모델 자동 테스트 스크립트

$ErrorActionPreference = "Stop"

# 설정
$ArduinoCLIPath = ".\arduino-cli_1.5.2-rc.1_Windows_64bit\arduino-cli.exe"
$SketchPath = "esp32_vision\elevator_camera_s3_optimized.ino"
$Port = "COM7"

# 테스트할 보드 모델들 (ESP32-S3OV3660에 가까운 순서)
$BoardModels = @(
    "esp32:esp32:esp32s3usbotg",          # ESP32-S3-USB-OTG (가장 유력)
    "esp32:esp32:esp32s3box",            # ESP32-S3-Box
    "esp32:esp32:esp32s3-devkitlipo",    # OLIMEX ESP32-S3-DevKit-Lipo
    "esp32:esp32:esp32s3",               # 기본 ESP32-S3
    "esp32:esp32:esp32s3_powerfeather",  # ESP32-S3 PowerFeather
    "esp32:esp32:sparkfun_esp32s3_thing_plus" # SparkFun ESP32-S3 Thing Plus
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 ESP32-S3OV3660 보드 모델 자동 테스트" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 현재 디렉토리 확인
if (!(Test-Path "esp32_vision\elevator_camera_s3_optimized.ino")) {
    Write-Host "❌ 스킷 파일을 찾을 수 없습니다: $SketchPath" -ForegroundColor Red
    Write-Host "현재 디렉토리: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Arduino CLI 존재 확인
if (!(Test-Path $ArduinoCLIPath)) {
    Write-Host "❌ Arduino CLI를 찾을 수 없습니다: $ArduinoCLIPath" -ForegroundColor Red
    exit 1
}

# 보드 모델 테스트 시작
$SuccessModel = $null

foreach ($BoardModel in $BoardModels) {
    Write-Host "`n🔄 [$($BoardModels.IndexOf($BoardModel) + 1)/$($BoardModels.Count)] 테스트 중: $BoardModel" -ForegroundColor Yellow

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
            Write-Host "  ✅✅✅ 업로드 성공! ✅✅✅" -ForegroundColor Green
            $SuccessModel = $BoardModel
            break
        } else {
            Write-Host "  ❌ 업로드 실패" -ForegroundColor Red
        }

    } catch {
        Write-Host "  ❌ 오류 발생: $_" -ForegroundColor Red
    }
}

# 결과 요약
Write-Host "`n========================================" -ForegroundColor Cyan
if ($SuccessModel) {
    Write-Host "🎉 성공! 작동하는 보드 모델: $SuccessModel" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`n📱 다음 단계:" -ForegroundColor Yellow
    Write-Host "1. USB 케이블 재연결" -ForegroundColor White
    Write-Host "2. 시리얼 모니터 확인:" -ForegroundColor White
    Write-Host "   .\$ArduinoCLIPath monitor -p $Port -c baudrate=115200" -ForegroundColor Cyan

    # 자동으로 시리얼 모니터 시작 확인 질문
    $StartMonitor = Read-Host "`n시리얼 모니터를 바로 시작하시겠습니까? (Y/N)"
    if ($StartMonitor -eq "Y" -or $StartMonitor -eq "y") {
        Write-Host "`n🔍 시리얼 모니터 시작 (종료하려면 CTRL+C)..." -ForegroundColor Yellow
        & $ArduinoCLIPath monitor -p $Port -c baudrate=115200
    }
} else {
    Write-Host "❌ 모든 보드 모델 테스트 실패" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`n🛠️ 문제 해결 방법:" -ForegroundColor Yellow
    Write-Host "1. ESP32 USB 연결 확인" -ForegroundColor White
    Write-Host "2. 다른 USB 포트 시도" -ForegroundColor White
    Write-Host "3. USB 케이블 교체" -ForegroundColor White
    Write-Host "4. ESP32 리셋 버튼 클릭" -ForegroundColor White
    Write-Host "5. 전원 공급 확인 (안정적인 5V)" -ForegroundColor White
}
