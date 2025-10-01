# Restart Script for IoT Weight Monitor

Write-Host "🔄 Restarting IoT Weight Monitor..." -ForegroundColor Cyan

# Stop all node processes
Write-Host "⏹️  Stopping existing processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start the server
Write-Host "🚀 Starting server..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm start"
Start-Sleep -Seconds 3

# Start the weight sensor
Write-Host "⚖️  Starting weight sensor..." -ForegroundColor Green
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run weight"

Write-Host "✅ Services started!" -ForegroundColor Green
Write-Host "📱 Open http://localhost:3000 in your browser" -ForegroundColor Cyan
