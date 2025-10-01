# Quick Restart - IoT Weight Monitor
# Run this script to restart the server and weight sensor

# Kill all node processes
taskkill /F /IM node.exe 2>$null

# Wait a moment
Start-Sleep -Seconds 2

# Start server in new window
Start-Process pwsh -ArgumentList "-NoExit -Command cd '$PSScriptRoot'; npm start"

# Wait for server to start
Start-Sleep -Seconds 3

# Start weight sensor in new window  
Start-Process pwsh -ArgumentList "-NoExit -Command cd '$PSScriptRoot'; npm run weight"

Write-Host "`n✅ IoT Weight Monitor restarted!" -ForegroundColor Green
Write-Host "📊 Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each window to stop the services." -ForegroundColor Yellow
