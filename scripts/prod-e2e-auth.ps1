Param(
  [string]$BaseUrl = "https://sunu-yoon-demo-2025.netlify.app/api",
  [int]$RecentLimit = 10
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  Param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][object]$Body,
    [hashtable]$Headers = @{}
  )
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Headers $Headers -Body $json
}

function Invoke-JsonGet {
  Param(
    [Parameter(Mandatory=$true)][string]$Url,
    [hashtable]$Headers = @{}
  )
  return Invoke-RestMethod -Method Get -Uri $Url -Headers $Headers
}

function New-TestUser {
  Param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string]$Phone7xxxxxxxx,
    [Parameter(Mandatory=$true)][string]$Password
  )

  $registerPayload = @{
    phone = $Phone7xxxxxxxx
    name = $Name
    password = $Password
  }

  try {
    $reg = Invoke-JsonPost -Url "$BaseUrl/auth/register" -Body $registerPayload
    if (-not $reg.success) { throw "Register failed" }
    $token = $reg.data.tokens.accessToken
    return @{ token = $token; phone = $Phone7xxxxxxxx; password = $Password; name = $Name; registered = $true }
  } catch {
    # If user exists, try login
    $loginPayload = @{
      phone = $Phone7xxxxxxxx
      password = $Password
    }
    $login = Invoke-JsonPost -Url "$BaseUrl/auth/login" -Body $loginPayload
    if (-not $login.success) { throw "Login failed: $($_)" }
    $token = $login.data.tokens.accessToken
    return @{ token = $token; phone = $Phone7xxxxxxxx; password = $Password; name = $Name; registered = $false }
  }
}

Write-Host "== Sunu Yoon PROD E2E AUTH (real API) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkGray

$runId = (Get-Date).ToString("yyyyMMdd-HHmmss") + "-" + (Get-Random -Maximum 9999)

# Create two distinct users so passenger can book a different driver's ride
$driverPhone = "77" + (Get-Random -Minimum 1000000 -Maximum 9999999)
$passPhone   = "77" + (Get-Random -Minimum 1000000 -Maximum 9999999)
$driverPwd = "Passw0rd!" + (Get-Random -Minimum 10 -Maximum 99)
$passPwd   = "Passw0rd!" + (Get-Random -Minimum 10 -Maximum 99)

Write-Host "\n[1/7] Creating/logging-in DRIVER user..." -ForegroundColor Yellow
$driver = New-TestUser -Name "Driver $runId" -Phone7xxxxxxxx $driverPhone -Password $driverPwd
$driverAuth = @{ Authorization = "Bearer $($driver.token)" }
Write-Host "Driver phone: $driverPhone" -ForegroundColor DarkGray

Write-Host "\n[2/7] Creating/logging-in PASSENGER user..." -ForegroundColor Yellow
$passenger = New-TestUser -Name "Passenger $runId" -Phone7xxxxxxxx $passPhone -Password $passPwd
$passAuth = @{ Authorization = "Bearer $($passenger.token)" }
Write-Host "Passenger phone: $passPhone" -ForegroundColor DarkGray

# Publish ride as authenticated driver
$departure = (Get-Date).AddDays(1).Date.AddHours(9)
$departureIso = $departure.ToString("o")
$ridePayload = @{
  originCity = "Dakar"
  destinationCity = "Touba"
  departureTime = $departureIso
  pricePerSeat = 3500
  totalSeats = 3
  features = @("Climatisation")
  description = "TEST_AUTH $runId"
}

Write-Host "\n[3/7] Publishing ride as AUTH driver..." -ForegroundColor Yellow
$publishRes = Invoke-JsonPost -Url "$BaseUrl/rides" -Body $ridePayload -Headers $driverAuth
if (-not $publishRes.success) { throw "Ride publish failed: $($publishRes | ConvertTo-Json -Depth 6)" }
$rideId = $publishRes.data.ride.id
Write-Host "Published rideId: $rideId" -ForegroundColor Green

# Verify ride appears in /recent
Write-Host "\n[4/7] Checking ride appears in /rides/recent..." -ForegroundColor Yellow
$recent = Invoke-JsonGet -Url "$BaseUrl/rides/recent?limit=$RecentLimit"
if (-not $recent.success) { throw "Recent fetch failed" }
$found = $false
foreach ($r in $recent.data.rides) { if ($r.id -eq $rideId) { $found = $true; break } }
Write-Host ("Recent contains ride? " + $found) -ForegroundColor Green

# Create booking as authenticated passenger
$bookingPayload = @{
  rideId = $rideId
  seats = 1
  notes = "TEST_AUTH booking $runId"
}

Write-Host "\n[5/7] Creating booking as AUTH passenger..." -ForegroundColor Yellow
$bookRes = Invoke-JsonPost -Url "$BaseUrl/bookings" -Body $bookingPayload -Headers $passAuth
if (-not $bookRes.success) { throw "Booking failed: $($bookRes | ConvertTo-Json -Depth 6)" }
$bookingId = $bookRes.data.id
Write-Host "Created bookingId: $bookingId (status=$($bookRes.data.status))" -ForegroundColor Green

# Verify passenger bookings list
Write-Host "\n[6/7] Fetching passenger bookings list..." -ForegroundColor Yellow
$myBookings = Invoke-JsonGet -Url "$BaseUrl/bookings" -Headers $passAuth
if (-not $myBookings.success) { throw "get /bookings failed" }
$hasBooking = $false
foreach ($b in $myBookings.data) { if ($b.id -eq $bookingId) { $hasBooking = $true; break } }
Write-Host ("Passenger bookings contains booking? " + $hasBooking) -ForegroundColor Green

# Verify driver requests list
Write-Host "\n[7/7] Fetching driver booking requests..." -ForegroundColor Yellow
$driverReq = Invoke-JsonGet -Url "$BaseUrl/bookings/requests" -Headers $driverAuth
if (-not $driverReq.success) { throw "get /bookings/requests failed" }
$foundReq = $false
foreach ($b in $driverReq.data) { if ($b.id -eq $bookingId) { $foundReq = $true; break } }
Write-Host ("Driver requests contains booking? " + $foundReq) -ForegroundColor Green

Write-Host "\n✅ E2E AUTH PROD OK" -ForegroundColor Cyan
Write-Host "Ride: $rideId" -ForegroundColor DarkGray
Write-Host "Booking: $bookingId" -ForegroundColor DarkGray
Write-Host "Driver phone: $driverPhone" -ForegroundColor DarkGray
Write-Host "Passenger phone: $passPhone" -ForegroundColor DarkGray
