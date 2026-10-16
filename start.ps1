Write-Host "? Starting NoteWise Backend (FastAPI)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; py main.py"

Write-Host "?? Starting NoteWise Frontend (React)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host "? Both services are spinning up! Check the new PowerShell windows." -ForegroundColor Yellow
