# DrSync Mobile PWA Testing Helper
# This script helps you access DrSync PWA on mobile devices

Write-Host "🚀 DrSync Mobile PWA Testing Helper" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""

# Check if Docker containers are running
Write-Host "Checking DrSync containers..." -ForegroundColor Yellow
$containers = docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "drsync"

if ($containers) {
    Write-Host "✅ DrSync containers found:" -ForegroundColor Green
    Write-Host $containers
    Write-Host ""
} else {
    Write-Host "❌ DrSync containers not running!" -ForegroundColor Red
    Write-Host "Please start them with:" -ForegroundColor Yellow
    Write-Host "  docker-compose -f docker-compose.dev.yml up" -ForegroundColor White
    exit 1
}

# Get WiFi IP address
Write-Host "Finding your WiFi IP address..." -ForegroundColor Yellow
$wifiAdapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up" -and $_.InterfaceDescription -like "*Wi-Fi*"}
$wifiIP = ""

if ($wifiAdapter) {
    $ipConfig = Get-NetIPAddress -InterfaceIndex $wifiAdapter.InterfaceIndex -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike "169.254*"}
    if ($ipConfig) {
        $wifiIP = $ipConfig.IPAddress
        Write-Host "✅ WiFi IP found: $wifiIP" -ForegroundColor Green
    }
}

if (-not $wifiIP) {
    Write-Host "⚠️ Could not automatically detect WiFi IP. Please find it manually:" -ForegroundColor Yellow
    Write-Host "  ipconfig | findstr IPv4" -ForegroundColor White
    Write-Host ""
    Write-Host "Look for your WiFi adapter's IPv4 address (usually starts with 192.168 or 10.)" -ForegroundColor White
    $wifiIP = Read-Host "Please enter your WiFi IP address"
}

Write-Host ""
Write-Host "🔧 Testing local access..." -ForegroundColor Yellow

# Test local access
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/manifest.json" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ DrSync frontend is accessible locally" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cannot access DrSync locally. Please check if containers are running." -ForegroundColor Red
    Write-Host "Try: http://localhost:3000" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "📱 MOBILE PWA INSTALLATION INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🔗 Access URLs:" -ForegroundColor Yellow
Write-Host "  Desktop: http://localhost:3000" -ForegroundColor White
Write-Host "  Mobile:  http://$wifiIP:3000" -ForegroundColor White
Write-Host ""

Write-Host "📲 For Mobile PWA Installation:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣ Connect your phone to the same WiFi network" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣ Open Chrome/Safari on your mobile device" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣ Navigate to: http://$wifiIP:3000" -ForegroundColor Green
Write-Host ""
Write-Host "4️⃣ IMPORTANT: Current limitations over HTTP:" -ForegroundColor Red
Write-Host "   • ✅ 'Add to Home Screen' will work" -ForegroundColor Green
Write-Host "   • ❌ Full PWA installation requires HTTPS" -ForegroundColor Red
Write-Host "   • ❌ Some PWA features may be limited" -ForegroundColor Red
Write-Host ""

Write-Host "🔐 For FULL PWA Installation (HTTPS required):" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option 1: Sign up for free ngrok account" -ForegroundColor White
Write-Host "   • Visit: https://dashboard.ngrok.com/signup" -ForegroundColor Cyan
Write-Host "   • Get auth token and run: ngrok http 3000" -ForegroundColor White
Write-Host ""
Write-Host "   Option 2: Deploy to production with SSL certificate" -ForegroundColor White
Write-Host ""

Write-Host "🧪 Test PWA Features:" -ForegroundColor Yellow
Write-Host "  • Main page: http://$wifiIP:3000" -ForegroundColor White
Write-Host "  • PWA test: http://$wifiIP:3000/pwa-test" -ForegroundColor White
Write-Host "  • Offline:  http://$wifiIP:3000/offline" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Expected Mobile Experience (HTTP):" -ForegroundColor Yellow
Write-Host "  ✅ App loads and works" -ForegroundColor Green
Write-Host "  ✅ Add to Home Screen available" -ForegroundColor Green  
Write-Host "  ✅ Basic offline functionality" -ForegroundColor Green
Write-Host "  ❌ True standalone app installation" -ForegroundColor Red
Write-Host "  ❌ Full push notification support" -ForegroundColor Red
Write-Host ""

# Test network accessibility
Write-Host "🌐 Testing network accessibility..." -ForegroundColor Yellow
$networkTest = Test-NetConnection -ComputerName $wifiIP -Port 3000 -WarningAction SilentlyContinue

if ($networkTest.TcpTestSucceeded) {
    Write-Host "✅ Network connection to $wifiIP:3000 is working!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Network test inconclusive. Try the mobile URL anyway." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Ready for mobile testing!" -ForegroundColor Green
Write-Host "Open your mobile browser and navigate to: http://$wifiIP:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host 'Press any key to exit...' -ForegroundColor Gray
Read-Host 'Press Enter to continue'
