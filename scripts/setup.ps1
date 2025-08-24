# DrSync Development Environment Setup Script
# PowerShell script to set up the development environment

Write-Host "🚀 Setting up DrSync Development Environment..." -ForegroundColor Green

# Check if Docker is installed and running
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not running. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
try {
    $composeVersion = docker compose version
    Write-Host "✅ Docker Compose found: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not available. Please update Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
    
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -lt 18) {
            Write-Host "⚠️  Warning: Node.js version 18 or higher is recommended. Current version: $nodeVersion" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Create .env files if they don't exist
Write-Host "📝 Setting up environment files..." -ForegroundColor Blue

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "✅ Created backend/.env file" -ForegroundColor Green
} else {
    Write-Host "✅ backend/.env file already exists" -ForegroundColor Green
}

if (-not (Test-Path "frontend\.env.local")) {
    Copy-Item "frontend\.env.example" "frontend\.env.local"
    Write-Host "✅ Created frontend/.env.local file" -ForegroundColor Green
} else {
    Write-Host "✅ frontend/.env.local file already exists" -ForegroundColor Green
}

# Install dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
Set-Location backend
try {
    npm install
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
Set-Location frontend
try {
    npm install
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Start the development environment
Write-Host "🐳 Starting development services..." -ForegroundColor Blue
try {
    docker compose -f docker-compose.dev.yml up -d postgres redis
    Start-Sleep -Seconds 10
    Write-Host "✅ Database and cache services started" -ForegroundColor Green
    
    # Wait for PostgreSQL to be ready
    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Blue
    $maxRetries = 30
    $retry = 0
    do {
        try {
            docker compose -f docker-compose.dev.yml exec postgres pg_isready -U drsync_user -d drsync_dev | Out-Null
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
            break
        } catch {
            $retry++
            if ($retry -eq $maxRetries) {
                Write-Host "❌ PostgreSQL failed to start within timeout" -ForegroundColor Red
                exit 1
            }
            Start-Sleep -Seconds 2
        }
    } while ($retry -lt $maxRetries)
    
} catch {
    Write-Host "❌ Failed to start development services" -ForegroundColor Red
    exit 1
}

# Display success message
Write-Host ""
Write-Host "🎉 DrSync Development Environment Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the backend: cd backend && npm run dev"
Write-Host "2. Start the frontend: cd frontend && npm run dev"
Write-Host "3. Or use Docker: docker compose -f docker-compose.dev.yml up"
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Yellow
Write-Host "- Frontend: http://localhost:3000"
Write-Host "- Backend API: http://localhost:3001"
Write-Host "- PgAdmin: http://localhost:5050 (if enabled)"
Write-Host ""
Write-Host "📚 Documentation: Check the docs/ folder for detailed information"
Write-Host ""
