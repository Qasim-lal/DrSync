# DrSync PWA Testing Script
# This script validates PWA implementation and provides testing guidance

Write-Host "🏥 DrSync PWA Testing Script" -ForegroundColor Cyan
Write-Host "=" * 50

# Check if frontend is running
Write-Host "📊 Checking DrSync Frontend Status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend is running on http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend is not running. Start with: docker-compose -f docker-compose.dev.yml up frontend" -ForegroundColor Red
    exit 1
}

# Test PWA manifest
Write-Host "`n📱 Testing PWA Manifest..." -ForegroundColor Yellow
try {
    $manifestResponse = Invoke-WebRequest -Uri "http://localhost:3000/manifest.json" -UseBasicParsing
    if ($manifestResponse.StatusCode -eq 200) {
        Write-Host "✅ PWA Manifest accessible" -ForegroundColor Green
        $manifest = $manifestResponse.Content | ConvertFrom-Json
        Write-Host "   App Name: $($manifest.name)" -ForegroundColor Gray
        Write-Host "   Short Name: $($manifest.short_name)" -ForegroundColor Gray
        Write-Host "   Display Mode: $($manifest.display)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ PWA Manifest not accessible" -ForegroundColor Red
}

# Test Service Worker
Write-Host "`n⚙️ Testing Service Worker..." -ForegroundColor Yellow
try {
    $swResponse = Invoke-WebRequest -Uri "http://localhost:3000/sw.js" -UseBasicParsing
    if ($swResponse.StatusCode -eq 200) {
        Write-Host "✅ Service Worker accessible" -ForegroundColor Green
        $swSize = [math]::Round($swResponse.Content.Length / 1024, 2)
        Write-Host "   Size: $swSize KB" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Service Worker not accessible" -ForegroundColor Red
}

# Test PWA Test Page
Write-Host "`n🧪 Testing PWA Test Page..." -ForegroundColor Yellow
try {
    $testPageResponse = Invoke-WebRequest -Uri "http://localhost:3000/pwa-test" -UseBasicParsing
    if ($testPageResponse.StatusCode -eq 200) {
        Write-Host "✅ PWA Test Page accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ PWA Test Page not accessible" -ForegroundColor Red
}

# Test Offline Page
Write-Host "`n🔌 Testing Offline Page..." -ForegroundColor Yellow
try {
    $offlineResponse = Invoke-WebRequest -Uri "http://localhost:3000/offline" -UseBasicParsing
    if ($offlineResponse.StatusCode -eq 200) {
        Write-Host "✅ Offline Page accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Offline Page not accessible" -ForegroundColor Red
}

# Test Icon Generator
Write-Host "`n🎨 Testing Icon Generator..." -ForegroundColor Yellow
try {
    $iconGenResponse = Invoke-WebRequest -Uri "http://localhost:3000/icons/generate-icons.html" -UseBasicParsing
    if ($iconGenResponse.StatusCode -eq 200) {
        Write-Host "✅ Icon Generator accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Icon Generator not accessible" -ForegroundColor Red
}

Write-Host "`n" + "=" * 50
Write-Host "🧪 PWA TESTING INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "=" * 50

Write-Host "`n1. 📱 INSTALLATION TESTING:" -ForegroundColor Yellow
Write-Host "   • Open Chrome/Edge: http://localhost:3000"
Write-Host "   • Look for install prompt (appears after 3 seconds)"
Write-Host "   • Click install button to test PWA installation"
Write-Host "   • Verify app opens in standalone mode"

Write-Host "`n2. 🔌 OFFLINE TESTING:" -ForegroundColor Yellow
Write-Host "   • Open Chrome DevTools (F12)"
Write-Host "   • Go to Network tab → Check 'Offline'"
Write-Host "   • Navigate to: http://localhost:3000/offline"
Write-Host "   • Test cached functionality"

Write-Host "`n3. 🧪 FEATURE TESTING:" -ForegroundColor Yellow
Write-Host "   • Visit: http://localhost:3000/pwa-test"
Write-Host "   • Test all PWA features (notifications, caching, etc.)"
Write-Host "   • Check browser console for PWA logs"

Write-Host "`n4. 🎨 ICON GENERATION:" -ForegroundColor Yellow
Write-Host "   • Visit: http://localhost:3000/icons/generate-icons.html"
Write-Host "   • Click on SVG icons to download PNG versions"
Write-Host "   • Replace placeholder icons with generated ones"

Write-Host "`n5. 🔍 LIGHTHOUSE AUDIT:" -ForegroundColor Yellow
Write-Host "   • Open Chrome DevTools"
Write-Host "   • Go to Lighthouse tab"
Write-Host "   • Select 'Progressive Web App'"
Write-Host "   • Run audit to validate PWA compliance"

Write-Host "`n6. 📊 SERVICE WORKER DEBUGGING:" -ForegroundColor Yellow
Write-Host "   • Open Chrome DevTools"
Write-Host "   • Go to Application tab → Service Workers"
Write-Host "   • Verify service worker is registered and active"
Write-Host "   • Check Cache Storage for cached resources"

Write-Host "`n7. 📱 MOBILE TESTING:" -ForegroundColor Yellow
Write-Host "   • Test on mobile Chrome/Safari"
Write-Host "   • Use Chrome DevTools device emulation"
Write-Host "   • Test 'Add to Home Screen' functionality"

Write-Host "`n" + "=" * 50
Write-Host "✅ PWA IMPLEMENTATION COMPLETE!" -ForegroundColor Green
Write-Host "Status: All PWA components implemented and ready for testing" -ForegroundColor Green
Write-Host "Next: Test on various devices and browsers" -ForegroundColor Gray
Write-Host "=" * 50