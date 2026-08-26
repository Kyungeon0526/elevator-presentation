$ErrorActionPreference = "Stop"

# ========================================
# ESP32-S3 Camera Auto Test
# ========================================

$Root = "C:\Users\LG\Desktop\phsical_AI"

$ArduinoCLIPath = "C:\Users\LG\Desktop\arduino-cli_1.5.2-rc.1_Windows_64bit\arduino-cli.exe"
$SketchDir = Join-Path $Root "esp32_vision"
$SketchFile = Join-Path $SketchDir "elevator_camera_s3_optimized.ino"
$PinConfigHeader = Join-Path $SketchDir "pin_configurations.h"

$Port = "COM7"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ESP32-S3 Camera Auto Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ----------------------------------------
# Check files
# ----------------------------------------

if (!(Test-Path $ArduinoCLIPath)) {
    Write-Host "Arduino CLI not found:" -ForegroundColor Red
    Write-Host $ArduinoCLIPath
    exit 1
}

if (!(Test-Path $SketchFile)) {
    Write-Host "Sketch file not found:" -ForegroundColor Red
    Write-Host $SketchFile
    exit 1
}

if (!(Test-Path $PinConfigHeader)) {
    Write-Host "Pin configuration file not found:" -ForegroundColor Red
    Write-Host $PinConfigHeader
    exit 1
}

Write-Host "Arduino CLI: OK" -ForegroundColor Green
Write-Host "Sketch: OK" -ForegroundColor Green
Write-Host "Pin config: OK" -ForegroundColor Green
Write-Host "Port: $Port" -ForegroundColor Green

# ----------------------------------------
# Test combinations
# ----------------------------------------

$TestCombinations = @(
    @{ Board = "esp32:esp32:esp32s3usbotg"; PinConfig = 1 },
    @{ Board = "esp32:esp32:esp32s3usbotg"; PinConfig = 2 },
    @{ Board = "esp32:esp32:esp32s3usbotg"; PinConfig = 3 },
    @{ Board = "esp32:esp32:esp32s3box"; PinConfig = 1 },
    @{ Board = "esp32:esp32:esp32s3box"; PinConfig = 2 },
    @{ Board = "esp32:esp32:esp32s3-devkitlipo"; PinConfig = 1 },
    @{ Board = "esp32:esp32:esp32s3"; PinConfig = 1 },
    @{ Board = "esp32:esp32:esp32s3_powerfeather"; PinConfig = 1 }
)

$SuccessCombination = $null

# ----------------------------------------
# Test
# ----------------------------------------

for ($i = 0; $i -lt $TestCombinations.Count; $i++) {

    $Combo = $TestCombinations[$i]

    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "TEST $($i + 1) / $($TestCombinations.Count)" -ForegroundColor Yellow
    Write-Host "Board     : $($Combo.Board)" -ForegroundColor White
    Write-Host "Pin config: $($Combo.PinConfig)" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor DarkGray

    # ------------------------------------
    # Modify pin configuration
    # ------------------------------------

    try {

        $PinConfigContent = Get-Content $PinConfigHeader -Raw

        $PinConfigContent = $PinConfigContent -replace `
            '#define USE_PIN_CONFIG\s+\d+', `
            "#define USE_PIN_CONFIG $($Combo.PinConfig)"

        Set-Content `
            -Path $PinConfigHeader `
            -Value $PinConfigContent `
            -Encoding UTF8

        Write-Host "Pin configuration applied." -ForegroundColor Green

    }
    catch {

        Write-Host "Failed to modify pin configuration." -ForegroundColor Red
        Write-Host $_
        continue
    }

    # ------------------------------------
    # Compile
    # ------------------------------------

    Write-Host "Compiling..." -ForegroundColor Cyan

    & $ArduinoCLIPath compile `
        --fqbn $Combo.Board `
        $SketchFile

    $CompileExitCode = $LASTEXITCODE

    if ($CompileExitCode -ne 0) {

        Write-Host "Compile FAILED." -ForegroundColor Red
        Write-Host "Exit code: $CompileExitCode" -ForegroundColor Red

        continue
    }

    Write-Host "Compile SUCCESS." -ForegroundColor Green

    # ------------------------------------
    # Upload
    # ------------------------------------

    Write-Host "Uploading to $Port..." -ForegroundColor Cyan

    & $ArduinoCLIPath upload `
        -p $Port `
        --fqbn $Combo.Board `
        $SketchFile

    $UploadExitCode = $LASTEXITCODE

    if ($UploadExitCode -ne 0) {

        Write-Host "Upload FAILED." -ForegroundColor Red
        Write-Host "Exit code: $UploadExitCode" -ForegroundColor Red

        continue
    }

    Write-Host "Upload SUCCESS." -ForegroundColor Green

    # ------------------------------------
    # Wait for ESP32 boot
    # ------------------------------------

    Write-Host "Waiting for ESP32..." -ForegroundColor Cyan

    Start-Sleep -Seconds 5

    Write-Host "Test completed for this combination." -ForegroundColor Green

    $SuccessCombination = $Combo

    break
}

# ----------------------------------------
# Result
# ----------------------------------------

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($null -ne $SuccessCombination) {

    Write-Host "TEST SUCCESS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "Board:" -ForegroundColor White
    Write-Host $SuccessCombination.Board -ForegroundColor Green

    Write-Host "Pin configuration:" -ForegroundColor White
    Write-Host $SuccessCombination.PinConfig -ForegroundColor Green

    $SuccessConfig = @{
        Board = $SuccessCombination.Board
        PinConfig = $SuccessCombination.PinConfig
        SuccessTime = Get-Date
    }

    $SuccessConfig |
        ConvertTo-Json |
        Out-File `
            (Join-Path $Root "esp32_s3_success_config.json") `
            -Encoding UTF8

    Write-Host ""
    Write-Host "Configuration saved." -ForegroundColor Green

}
else {

    Write-Host "ALL TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan

}

Write-Host ""
Write-Host "Done."