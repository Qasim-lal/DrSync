# DrSync Appointment System Testing Script
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3001/api"

# Initialize variables at script scope
$script:token = $null
$script:headers = $null

# Login
Write-Host "Logging in..." -ForegroundColor Green
$loginData = @{
    "email" = "admin@drsynctesthospital.com"
    "password" = "HospitalAdmin2024!"
}

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body (ConvertTo-Json $loginData) -ContentType "application/json"
    $loginResult = ($loginResponse.Content | ConvertFrom-Json)
    $script:token = $loginResult.data.tokens.accessToken
    $script:headers = @{'Authorization' = "Bearer $script:token"}
    Write-Host "Login successful" -ForegroundColor Green
    Write-Host "Token: $($script:token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test appointments list
Write-Host "Testing appointments list..." -ForegroundColor Yellow
try {
    $appointmentsResponse = Invoke-WebRequest -Uri "$baseUrl/appointments" -Method GET -Headers $script:headers
    $appointmentsData = ($appointmentsResponse.Content | ConvertFrom-Json)
    Write-Host "Appointments endpoint working. Count: $($appointmentsData.data.appointments.Count)" -ForegroundColor Green
} catch {
    Write-Host "Failed to get appointments: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Headers being used: $($script:headers | ConvertTo-Json)" -ForegroundColor Gray
}

# Test invalid appointment creation
Write-Host "Testing invalid appointment creation..." -ForegroundColor Yellow
$invalidAppointment = @{
    "patientId" = "invalid-patient-id"
    "providerId" = "invalid-provider-id"
    "scheduledAt" = "2025-09-01T10:00:00Z"
    "title" = "Test Appointment"
    "duration" = 30
}

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/appointments" -Method POST -Body (ConvertTo-Json $invalidAppointment) -ContentType "application/json" -Headers $script:headers
    Write-Host "Should have failed but didn't" -ForegroundColor Red
} catch {
    Write-Host "Correctly rejected invalid appointment data" -ForegroundColor Green
}

# Test authentication
Write-Host "Testing authentication..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/appointments" -Method GET
    Write-Host "Should have failed without authentication" -ForegroundColor Red
} catch {
    Write-Host "Correctly requires authentication" -ForegroundColor Green
}

Write-Host "Appointment system testing completed!" -ForegroundColor Green
