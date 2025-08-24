Write-Host "Verifying DrSync Development Environment Setup..." -ForegroundColor Green

$errors = 0

# Check directories
$dirs = @("backend", "frontend", "docs", "scripts", "backend\src", "backend\migrations")
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ $dir" -ForegroundColor Red
        $errors++
    }
}

# Check files
$files = @("docker-compose.dev.yml", "backend\package.json", "README.md")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file" -ForegroundColor Red
        $errors++
    }
}

if ($errors -eq 0) {
    Write-Host "🎉 Setup verification passed!" -ForegroundColor Green
} else {
    Write-Host "❌ $errors issues found" -ForegroundColor Red
}
