# Step 7: Store WhatsApp Credentials
# This script encrypts and stores WhatsApp credentials in the database

Write-Host "=== Step 7: Store WhatsApp Credentials ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please provide your WhatsApp Business API credentials:" -ForegroundColor Yellow
Write-Host "(You got these from Meta Developer Console in Steps 4-6)" -ForegroundColor Gray
Write-Host ""

# === COLLECT CREDENTIALS ===
$organizationId = Read-Host "Organization ID (e.g., test-org-dr-demo)"
$appId = Read-Host "App ID (from Meta Developer > Settings > Basic)"
$appSecret = Read-Host "App Secret (from Meta Developer > Settings > Basic)" -AsSecureString
$accessToken = Read-Host "Access Token (System User Token from Step 6.1)" -AsSecureString
$phoneNumberId = Read-Host "Phone Number ID (from WhatsApp > API Setup)"
$businessAccountId = Read-Host "Business Account ID / WABA ID (from WhatsApp > API Setup)"
$webhookVerifyToken = Read-Host "Webhook Verify Token (from Step 1.2 / your .env file)" -AsSecureString
$displayPhoneNumber = Read-Host "Display Phone Number (e.g., +923001234567)"

# Convert secure strings to plain text for processing
$appSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($appSecret))
$accessTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($accessToken))
$webhookVerifyTokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($webhookVerifyToken))

Write-Host ""
Write-Host "Creating credential storage script..." -ForegroundColor Yellow

# Create Node.js script to store credentials
$storeScript = @"
// Register ts-node first before any imports
const tsNode = require('ts-node');
tsNode.register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs' }
});

const { encryptData } = require('./src/utils/encryption');
const getPrismaClient = require('./src/services/prisma').default;

async function storeCredentials() {
    try {
        console.log('Step 1: Initializing...');
        const prisma = getPrismaClient();
        
        console.log('Step 2: Encrypting credentials...');
        
        // Encrypt sensitive fields
        const encryptedAppSecret = encryptData('$appSecretPlain');
        const encryptedAccessToken = encryptData('$accessTokenPlain');
        const encryptedWebhookToken = encryptData('$webhookVerifyTokenPlain');
        
        console.log('  [OK] Credentials encrypted');
        
        console.log('Step 3: Storing in database...');
        
        // Create credentials object
        const credentials = {
            appId: '$appId',
            appSecret: encryptedAppSecret,
            accessToken: encryptedAccessToken,
            phoneNumberId: '$phoneNumberId',
            businessAccountId: '$businessAccountId',
            webhookVerifyToken: encryptedWebhookToken
        };
        
        // Update organization
        const updated = await prisma.organization.update({
            where: { id: '$organizationId' },
            data: {
                whatsappPhoneNumber: '$displayPhoneNumber',
                whatsappCredentials: credentials,
                whatsappConfigured: true,
                whatsappPhoneVerified: true
            }
        });
        
        console.log('  [OK] Credentials stored successfully');
        console.log('');
        console.log('Organization updated:');
        console.log('  ID:', updated.id);
        console.log('  Name:', updated.name);
        console.log('  Phone:', updated.whatsappPhoneNumber);
        console.log('  Configured:', updated.whatsappConfigured);
        console.log('');
        console.log('[SUCCESS] WhatsApp credentials stored!');
        console.log('');
        console.log('Next Steps:');
        console.log('  1. Restart backend to initialize WhatsApp client');
        console.log('  2. docker-compose restart backend');
        console.log('  3. Test the integration (Step 8)');
        
        process.exit(0);
    } catch (error) {
        console.error('[ERROR]', error.message);
        if (error.code === 'P2025') {
            console.error('Organization not found. Please check the Organization ID.');
        } else if (error.message.includes('ENCRYPTION_KEY')) {
            console.error('ENCRYPTION_KEY not configured in environment variables.');
        }
        process.exit(1);
    }
}

storeCredentials();
"@

# Save the script
$scriptPath = "temp-store-credentials.js"
$storeScript | Out-File -FilePath $scriptPath -Encoding UTF8

Write-Host "Storing credentials..." -ForegroundColor Yellow
Write-Host ""

try {
    # Copy script to container
    docker cp $scriptPath drsync_backend_dev:/app/$scriptPath
    
    # Execute the script
    $output = docker exec drsync_backend_dev node /app/$scriptPath 2>&1
    
    # Display output
    $output | ForEach-Object { Write-Host "  $_" }
    
    Write-Host ""
    
    # Check if successful
    if ($output -match '\[SUCCESS\]') {
        Write-Host "=== CREDENTIALS STORED SUCCESSFULLY ===" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Restart the backend:" -ForegroundColor White
        Write-Host "     docker-compose restart backend" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Verify client initialized:" -ForegroundColor White
        Write-Host "     curl http://localhost:3001/api/whatsapp/health" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Run Test 2 again:" -ForegroundColor White
        Write-Host "     .\test-send-auto.ps1" -ForegroundColor Gray
    } else {
        Write-Host "=== FAILED TO STORE CREDENTIALS ===" -ForegroundColor Red
        Write-Host "Please check the error messages above." -ForegroundColor Red
    }
    
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    if (Test-Path $scriptPath) {
        Remove-Item $scriptPath -Force
    }
    docker exec drsync_backend_dev rm -f /app/$scriptPath 2>$null
    
    # Clear sensitive data from memory
    $appSecretPlain = $null
    $accessTokenPlain = $null
    $webhookVerifyTokenPlain = $null
}

Write-Host ""
