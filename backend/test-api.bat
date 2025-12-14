@echo off
timeout /t 1 >nul

REM Login
echo Test 1: Login
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"+221771234567\",\"password\":\"password123\"}" > token.json 2>nul

REM Extract token (PowerShell)
powershell -Command "$json = Get-Content token.json | ConvertFrom-Json; $token = $json.data.tokens.accessToken; Set-Content -Path token.txt -Value $token"

REM Get token
set /p TOKEN=<token.txt

echo.
echo Test 2: Publish Ride
curl -v -X POST http://localhost:3001/api/rides -H "Content-Type: application/json" -H "Authorization: Bearer %TOKEN%" -d "{\"originCity\":\"Dakar\",\"originAddress\":\"Place de l'Independance\",\"destinationCity\":\"Thies\",\"destinationAddress\":\"Gare routiere\",\"departureTime\":\"2025-12-16T08:00:00.000Z\",\"pricePerSeat\":2000,\"totalSeats\":4,\"description\":\"Test\"}"

echo.
echo Test 3: Search Rides
curl http://localhost:3001/api/rides?origin=Dakar

del token.json token.txt 2>nul
