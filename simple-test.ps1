# Simple JWT Authentication Test
Write-Host "🧪 Testing JWT Authentication" -ForegroundColor Green

# Test user registration
Write-Host "Testing registration..." -ForegroundColor Yellow
$registerBody = @{
    email = "admin@test-clinic.com"
    password = "TestPassword123!"
    firstName = "Test"
    lastName = "Admin"
    organizationId = "cm0test1234567890123456"
    role = "ORG_ADMIN"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "User: $($response.data.user.firstName) $($response.data.user.lastName)"
    Write-Host "Token: $($response.data.tokens.accessToken.Substring(0,50))..."
    
    # Test login
    Write-Host "`nTesting login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "admin@test-clinic.com"
        password = "TestPassword123!"
    } | ConvertTo-Json
    
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Welcome: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)"
    
    # Test authenticated endpoint
    Write-Host "`nTesting authenticated endpoint..." -ForegroundColor Yellow
    $headers = @{ "Authorization" = "Bearer $($loginResponse.data.tokens.accessToken)" }
    $profile = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host "Email: $($profile.data.user.email)"
    Write-Host "Organization: $($profile.data.user.organization.name)"
    
    Write-Host "`n🎉 JWT Authentication is working perfectly!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
