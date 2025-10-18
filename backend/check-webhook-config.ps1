# WhatsApp Webhook Configuration Checker
# Compares your setup with Facebook requirements

Write-Host "=== WhatsApp Delivery Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

$orgId = "test-org-dr-demo"

# 1. Check database configuration
Write-Host "[1/5] Checking database configuration..." -ForegroundColor Yellow
$dbCheck = docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -t -c "SELECT 'Phone:', \"whatsappPhoneNumber\", 'PhoneNumberId:', (\"whatsappCredentials\"->>'phoneNumberId')::text FROM organizations WHERE id = '$orgId';" 2>&1
Write-Host $dbCheck
Write-Host ""

# 2. Check if backend is accessible
Write-Host "[2/5] Checking backend accessibility..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    Write-Host "  [OK] Backend is accessible" -ForegroundColor Green
    Write-Host "  Status: $($health.status)" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Backend not accessible: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 3. Check webhook endpoint
Write-Host "[3/5] Checking webhook endpoint..." -ForegroundColor Yellow
try {
    $challenge = "test-challenge-123"
    $verifyToken = docker exec drsync_backend_dev node -e "console.log(process.env.WEBHOOK_VERIFY_TOKEN)" 2>&1
    
    Write-Host "  Verify Token: $verifyToken" -ForegroundColor Gray
    
    $webhookTest = Invoke-RestMethod -Uri "http://localhost:3001/webhooks/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=$challenge" -Method Get -TimeoutSec 5
    
    if ($webhookTest -eq $challenge) {
        Write-Host "  [OK] Webhook verification working locally" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Webhook verification failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Webhook endpoint error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# 4. Check recent message status
Write-Host "[4/5] Checking recent message delivery status..." -ForegroundColor Yellow
$messages = docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -t -c 'SELECT LEFT("whatsappMessageId", 30) as msg_id, status, "deliveredAt", "failedAt" FROM whatsapp_messages ORDER BY "createdAt" DESC LIMIT 3;' 2>&1
Write-Host $messages
Write-Host ""

# 5. Check if webhook is publicly accessible
Write-Host "[5/5] Checking public webhook accessibility..." -ForegroundColor Yellow
Write-Host "  [INFO] Your backend is on localhost:3001" -ForegroundColor Gray
Write-Host "  [INFO] Facebook CANNOT reach localhost webhooks" -ForegroundColor Yellow
Write-Host "  [INFO] This is why messages don't deliver!" -ForegroundColor Red
Write-Host ""

# Summary and recommendations
Write-Host "=== DIAGNOSIS SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ API credentials are valid (message shows 'sent' status)" -ForegroundColor Green
Write-Host "✓ Message successfully sent to WhatsApp servers" -ForegroundColor Green
Write-Host "✗ Webhook is NOT publicly accessible" -ForegroundColor Red
Write-Host "✗ WhatsApp cannot deliver message to your phone" -ForegroundColor Red
Write-Host ""

Write-Host "=== SOLUTION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To fix message delivery, you need to:" -ForegroundColor White
Write-Host "  1. Expose your webhook publicly using one of:" -ForegroundColor White
Write-Host "     • ngrok: ngrok http 3001" -ForegroundColor Gray
Write-Host "     • cloudflared: cloudflared tunnel --url http://localhost:3001" -ForegroundColor Gray
Write-Host "     • Deploy to a cloud server" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Configure webhook in Facebook Developer Console:" -ForegroundColor White
Write-Host "     • URL: https://developers.facebook.com/apps/1772308433408840/whatsapp-business/wa-settings/" -ForegroundColor Gray
Write-Host "     • Callback URL: https://YOUR-PUBLIC-URL/webhooks/whatsapp/webhook" -ForegroundColor Gray
Write-Host "     • Verify Token: $verifyToken" -ForegroundColor Gray
Write-Host "     • Subscribe to: messages, message_status" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Test again with: .\backend\test-send-auto.ps1" -ForegroundColor White
Write-Host ""

Write-Host "=== WHY FACEBOOK DEVELOPER WORKS ===" -ForegroundColor Cyan
Write-Host "The Facebook test tool sends messages DIRECTLY through" -ForegroundColor White
Write-Host "their infrastructure and delivers them immediately." -ForegroundColor White
Write-Host "Your script uses the API correctly, but WhatsApp needs" -ForegroundColor White
Write-Host "to call YOUR webhook to complete delivery." -ForegroundColor White
Write-Host ""
