# Test script for JWT Authentication
Write-Host "🧪 Testing DrSync JWT Authentication System" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

$baseUrl = "http://localhost:3001"

# Test 1: Register a new user (since we don't have any organizations, let's create one first)
Write-Host "`n1. Testing user registration..." -ForegroundColor Yellow

# First, let's create an organization directly in the database
Write-Host "Creating test organization in database..." -ForegroundColor Cyan
docker exec drsync_postgres_dev psql -U drsync_user -d drsync_dev -c "INSERT INTO organizations (id, name, slug, email, website, \"isActive\") VALUES ('cm0b1test1234567890123456', 'Test Clinic', 'test-clinic', 'admin@test-clinic.com', 'https://test-clinic.com', true) ON CONFLICT DO NOTHING;"

# Now test user registration
$registerBody = @{
    email = "admin@test-clinic.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "Admin"
    organizationId = "cm0b1test1234567890123456"
    role = "ORG_ADMIN"
    phone = "+1234567890"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.data.user.id)"
    Write-Host "Access Token (first 50 chars): $($registerResponse.data.tokens.accessToken.Substring(0,50))..."
    
    $accessToken = $registerResponse.data.tokens.accessToken
    
    # Test 2: Login with the created user
    Write-Host "`n2. Testing user login..." -ForegroundColor Yellow
    
    $loginBody = @{
        email = "admin@test-clinic.com"
        password = "TestPassword123!"
        remember = $true
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "User: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)"
    Write-Host "Role: $($loginResponse.data.user.role)"
    
    $accessToken = $loginResponse.data.tokens.accessToken
    
    # Test 3: Get user profile (authenticated endpoint)
    Write-Host "`n3. Testing authenticated endpoint (GET /api/auth/me)..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "application/json"
    }
    
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Profile retrieval successful!" -ForegroundColor Green
    Write-Host "User Email: $($profileResponse.data.user.email)"
    Write-Host "Organization: $($profileResponse.data.user.organization.name)"
    Write-Host "Last Login: $($profileResponse.data.user.lastLoginAt)"
    
    # Test 4: Token verification
    Write-Host "`n4. Testing token verification..." -ForegroundColor Yellow
    
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-token" -Method GET -Headers $headers
    Write-Host "✅ Token verification successful!" -ForegroundColor Green
    Write-Host "Token is valid: $($verifyResponse.data.valid)"
    
    # Test 5: Update profile
    Write-Host "`n5. Testing profile update..." -ForegroundColor Yellow
    
    $updateBody = @{
        firstName = "Updated"
        lastName = "Admin"
        phone = "+9876543210"
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/profile" -Method PUT -Body $updateBody -Headers $headers
    Write-Host "✅ Profile update successful!" -ForegroundColor Green
    Write-Host "Updated name: $($updateResponse.data.user.firstName) $($updateResponse.data.user.lastName)"
    Write-Host "Updated phone: $($updateResponse.data.user.phone)"
    
    # Test 6: Logout
    Write-Host "`n6. Testing logout..." -ForegroundColor Yellow
    
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method POST -Headers $headers
    Write-Host "✅ Logout successful!" -ForegroundColor Green
    Write-Host "Message: $($logoutResponse.message)"
    
    Write-Host "`n🎉 All JWT authentication tests passed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        if ($errorContent) {
            $reader = New-Object System.IO.StreamReader($errorContent)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error details: $errorBody" -ForegroundColor Red
        }
    }
}

Write-Host "`n🏁 Test completed!" -ForegroundColor Blue
