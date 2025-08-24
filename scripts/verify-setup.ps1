# DrSync Development Environment Verification Script
Write-Host "🔍 Verifying DrSync Development Environment Setup..." -ForegroundColor Green

$errorCount = 0

# Check project structure
Write-Host "`n📁 Checking project structure..." -ForegroundColor Blue
$requiredDirs = @("backend", "frontend", "docs", "scripts", "backend\src", "backend\migrations")
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "✅ Directory exists: $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ Directory missing: $dir" -ForegroundColor Red
        $errorCount++
    }
}

# Check configuration files
Write-Host "`n📄 Checking configuration files..." -ForegroundColor Blue
$configFiles = @(
    "docker-compose.dev.yml",
    "backend\package.json",
    "backend\tsconfig.json",
    "backend\.eslintrc.json",
    "backend\.prettierrc",
    "backend\Dockerfile.dev",
    "backend\.env.example",
    "frontend\package.json",
    "frontend\Dockerfile.dev",
    "frontend\.env.example",
    ".env.example",
    "README.md"
)

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Config file exists: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Config file missing: $file" -ForegroundColor Red
        $errorCount++
    }
}

# Check database migration
Write-Host "`n🗃️ Checking database configuration..." -ForegroundColor Blue
if (Test-Path "backend\migrations\init.sql") {
    $sqlContent = Get-Content "backend\migrations\init.sql" -Raw
    if ($sqlContent -like "*CREATE EXTENSION*uuid-ossp*") {
        Write-Host "✅ Database schema includes UUID extension" -ForegroundColor Green
    }
    if ($sqlContent -like "*CREATE TABLE organizations*") {
        Write-Host "✅ Organizations table configured" -ForegroundColor Green
    }
    if ($sqlContent -like "*CREATE TABLE appointments*") {
        Write-Host "✅ Appointments table configured" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Database migration file missing" -ForegroundColor Red
    $errorCount++
}

# Check Docker Compose configuration
Write-Host "`n🐳 Checking Docker configuration..." -ForegroundColor Blue
if (Test-Path "docker-compose.dev.yml") {
    $dockerContent = Get-Content "docker-compose.dev.yml" -Raw
    if ($dockerContent -like "*postgres:*") {
        Write-Host "✅ PostgreSQL service configured" -ForegroundColor Green
    }
    if ($dockerContent -like "*redis:*") {
        Write-Host "✅ Redis service configured" -ForegroundColor Green
    }
    if ($dockerContent -like "*networks:*") {
        Write-Host "✅ Docker networking configured" -ForegroundColor Green
    }
}

# Check package.json files
Write-Host "`n📦 Checking package configurations..." -ForegroundColor Blue

if (Test-Path "backend\package.json") {
    $backendPkg = Get-Content "backend\package.json" | ConvertFrom-Json
    if ($backendPkg.scripts.dev) {
        Write-Host "✅ Backend dev script configured" -ForegroundColor Green
    }
    if ($backendPkg.dependencies.express) {
        Write-Host "✅ Backend Express dependency configured" -ForegroundColor Green
    }
    if ($backendPkg.dependencies.typescript) {
        Write-Host "✅ Backend TypeScript dependency configured" -ForegroundColor Green
    } elseif ($backendPkg.devDependencies.typescript) {
        Write-Host "✅ Backend TypeScript dev dependency configured" -ForegroundColor Green
    }
}

if (Test-Path "frontend\package.json") {
    $frontendPkg = Get-Content "frontend\package.json" | ConvertFrom-Json
    if ($frontendPkg.scripts.dev) {
        Write-Host "✅ Frontend dev script configured" -ForegroundColor Green
    }
    if ($frontendPkg.dependencies.next) {
        Write-Host "✅ Frontend Next.js dependency configured" -ForegroundColor Green
    }
    if ($frontendPkg.dependencies.react) {
        Write-Host "✅ Frontend React dependency configured" -ForegroundColor Green
    }
}

# Check TypeScript configuration
Write-Host "`n⚙️ Checking TypeScript configuration..." -ForegroundColor Blue
if (Test-Path "backend\tsconfig.json") {
    $tsConfig = Get-Content "backend\tsconfig.json" | ConvertFrom-Json
    if ($tsConfig.compilerOptions.target -eq "ES2022") {
        Write-Host "✅ Backend TypeScript target configured" -ForegroundColor Green
    }
    if ($tsConfig.compilerOptions.paths) {
        Write-Host "✅ Backend path mapping configured" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n📊 Setup Verification Summary" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow

if ($errorCount -eq 0) {
    Write-Host "🎉 All checks passed! Development environment is properly configured." -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Blue
    Write-Host "1. Install Docker Desktop if not already installed"
    Write-Host "2. Copy .env.example files to .env files and configure"
    Write-Host "3. Run: docker compose -f docker-compose.dev.yml up -d postgres redis"
    Write-Host "4. Install dependencies: cd backend; npm install"
    Write-Host "5. Install dependencies: cd frontend; npm install"
    Write-Host "6. Start development servers"
} else {
    Write-Host "❌ $errorCount issues found. Please resolve them before proceeding." -ForegroundColor Red
}

Write-Host "`n🔗 Useful URLs (once running):" -ForegroundColor Blue
Write-Host "- Frontend: http://localhost:3000"
Write-Host "- Backend API: http://localhost:3001"
Write-Host "- PgAdmin: http://localhost:5050"
