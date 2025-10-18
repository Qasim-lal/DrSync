# Update WhatsApp Access Token
# After generating a new token in Meta Developer Console

Write-Host "=== Update WhatsApp Access Token ===" -ForegroundColor Cyan
Write-Host ""

$organizationId = "test-org-dr-demo"

Write-Host "Paste your new access token from Meta Developer Console:" -ForegroundColor Yellow
Write-Host "(The token will be hidden for security)" -ForegroundColor Gray
$newToken = Read-Host -AsSecureString

# Convert SecureString to plain text (needed for database update)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($newToken)
$tokenPlainText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

if ([string]::IsNullOrWhiteSpace($tokenPlainText)) {
    Write-Host "[ERROR] Token cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Updating token in database..." -ForegroundColor Yellow

# Create SQL update script
$sqlScript = @"
UPDATE organizations 
SET "whatsappCredentials" = jsonb_set(
    "whatsappCredentials",
    '{accessToken}',
    to_jsonb('$tokenPlainText'::text)
)
WHERE id = '$organizationId';

SELECT 
    id, 
    name,
    "whatsappPhoneNumber",
    "whatsappCredentials"->>'phoneNumberId' as phone_number_id,
    CASE 
        WHEN LENGTH("whatsappCredentials"->>'accessToken') > 20 THEN 'Token Updated (length: ' || LENGTH("whatsappCredentials"->>'accessToken') || ')'
        ELSE 'Token Too Short'
    END as token_status
FROM organizations 
WHERE id = '$organizationId';
"@

$sqlScript | docker exec -i drsync_postgres_dev psql -U drsync_user -d drsync_dev

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] Access token updated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart backend: docker restart drsync_backend_dev" -ForegroundColor White
    Write-Host "  2. Wait 15 seconds for initialization" -ForegroundColor White
    Write-Host "  3. Run test: .\test-send-auto.ps1" -ForegroundColor White
} else {
    Write-Host "[ERROR] Failed to update token" -ForegroundColor Red
}

# Clear the token from memory
$tokenPlainText = $null
[System.GC]::Collect()
