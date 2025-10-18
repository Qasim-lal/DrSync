# Verify WhatsApp Webhook Delivery
Write-Host "=== WhatsApp Webhook Delivery Verification ===" -ForegroundColor Cyan
Write-Host ""

# Get environment variables
Write-Host "[1/4] Checking configuration..." -ForegroundColor Yellow
$verifyToken = docker exec drsync_backend_dev node -e "console.log(process.env.WEBHOOK_VERIFY_TOKEN)" 2>&1
$appSecret = docker exec drsync_backend_dev node -e "console.log(process.env.WHATSAPP_APP_SECRET)" 2>&1

Write-Host "  Verify Token: $verifyToken" -ForegroundColor Gray
Write-Host "  App Secret: $($appSecret.Substring(0,10))..." -ForegroundColor Gray
Write-Host ""

# Check what URL is accessible
Write-Host "[2/4] Testing webhook endpoint locally..." -ForegroundColor Yellow
try {
    $challenge = "test123"
    $url = "http://localhost:3001/webhooks/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=$challenge"
    $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 5
    
    if ($response -eq $challenge) {
        Write-Host "  [OK] Local webhook responds correctly" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Local webhook response incorrect" -ForegroundColor Red
        Write-Host "  Expected: $challenge" -ForegroundColor Gray
        Write-Host "  Got: $response" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [ERROR] $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Check recent messages
Write-Host "[3/4] Checking recent message status..." -ForegroundColor Yellow
$recentMsg = docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -t -c 'SELECT LEFT("whatsappMessageId", 40), status, "deliveredAt" IS NOT NULL as delivered FROM whatsapp_messages ORDER BY "createdAt" DESC LIMIT 1;' 2>&1
Write-Host "  $recentMsg" -ForegroundColor Gray
Write-Host ""

# Monitor webhook for 15 seconds
Write-Host "[4/4] Monitoring for webhook callbacks (15 seconds)..." -ForegroundColor Yellow
Write-Host "  Watching logs for: 'Incoming WhatsApp webhook', 'status update', 'statuses'" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date
$endTime = $startTime.AddSeconds(15)
$webhookReceived = $false

while ((Get-Date) -lt $endTime) {
    $logs = docker logs drsync_backend_dev --since 30s 2>&1 | Select-String -Pattern "Incoming WhatsApp webhook|Message status update|statuses"
    
    if ($logs) {
        Write-Host "  [✓] Webhook callback received!" -ForegroundColor Green
        $logs | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        $webhookReceived = $true
        break
    }
    
    Start-Sleep -Seconds 2
    Write-Host "  ." -NoNewline -ForegroundColor Gray
}

Write-Host ""
Write-Host ""

# Results
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host ""

if ($webhookReceived) {
    Write-Host "✓ Webhook is receiving callbacks from WhatsApp!" -ForegroundColor Green
    Write-Host "✓ Your webhook URL is configured correctly in Facebook" -ForegroundColor Green
    Write-Host ""
    Write-Host "If messages still not delivering, check:" -ForegroundColor Yellow
    Write-Host "  1. Is your phone number the same as WhatsApp Business number?" -ForegroundColor White
    Write-Host "  2. Check Facebook Developer Console for any errors" -ForegroundColor White
    Write-Host "  3. Verify phone number format: +923217765555" -ForegroundColor White
} else {
    Write-Host "✗ No webhook callbacks received!" -ForegroundColor Red
    Write-Host ""
    Write-Host "This means:" -ForegroundColor Yellow
    Write-Host "  • Facebook cannot reach your webhook URL" -ForegroundColor White
    Write-Host "  • OR webhook URL in Facebook is incorrect" -ForegroundColor White
    Write-Host ""
    Write-Host "What webhook URL did you configure in Facebook?" -ForegroundColor Cyan
    Write-Host "It should be one of:" -ForegroundColor White
    Write-Host "  • https://YOUR-NGROK-URL/webhooks/whatsapp/webhook" -ForegroundColor Gray
    Write-Host "  • https://YOUR-CLOUDFLARE-URL/webhooks/whatsapp/webhook" -ForegroundColor Gray
    Write-Host "  • https://YOUR-DOMAIN/webhooks/whatsapp/webhook" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Current accessible URL (LOCAL ONLY):" -ForegroundColor Yellow
    Write-Host "  http://localhost:3001/webhooks/whatsapp/webhook" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Steps to fix:" -ForegroundColor Cyan
    Write-Host "  1. Expose your webhook using ngrok or cloudflare tunnel" -ForegroundColor White
    Write-Host "  2. Update webhook URL in Facebook Developer Console" -ForegroundColor White
    Write-Host "  3. Make sure to use the FULL path: /webhooks/whatsapp/webhook" -ForegroundColor White
    Write-Host "  4. Subscribe to messages field" -ForegroundColor White
}

Write-Host ""
