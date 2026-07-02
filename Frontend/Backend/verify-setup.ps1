# Backend Setup Verification
# PowerShell script for Windows

Write-Host "🔍 Backend Setup Verification Script" -ForegroundColor Cyan
Write-Host "=" * 50
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "   Run: Copy-Item .env.example .env" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📁 Checking Backend Files..." -ForegroundColor Cyan

# Note: Backend files check removed

Write-Host ""
Write-Host "📦 Checking Dependencies..." -ForegroundColor Cyan

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules found" -ForegroundColor Green
    
    # Check specific packages
    if (Test-Path "node_modules\express-rate-limit") {
        Write-Host "✅ express-rate-limit installed" -ForegroundColor Green
    } else {
        Write-Host "❌ express-rate-limit not installed" -ForegroundColor Red
        Write-Host "   Run: npm install" -ForegroundColor Yellow
    }
    
    if (Test-Path "node_modules\axios") {
        Write-Host "✅ axios installed" -ForegroundColor Green
    } else {
        Write-Host "❌ axios not installed" -ForegroundColor Red
        Write-Host "   Run: npm install" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ node_modules not found" -ForegroundColor Red
    Write-Host "   Run: npm install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🚀 Checking Server..." -ForegroundColor Cyan

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Server is running on port 8080" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Server not running on port 8080" -ForegroundColor Yellow
    Write-Host "   Start server: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 50
Write-Host "Verification Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If any ❌ appear above, fix those issues first"
Write-Host "2. Start backend: npm run dev"
Write-Host "3. Start mobile app: cd ..\SnapnGraspp; npm start"
Write-Host ""
