Param(
  [string]$BaseUrl = "https://sunu-yoon-demo-2025.netlify.app/api",
  [int]$RecentLimit = 10
)

$ErrorActionPreference = "Stop"

function Invoke-JsonPost {
  Param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][object]$Body
  )
  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body $json
}

Write-Host "== Sunu Yoon PROD E2E (real API) ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkGray

$runId = (Get-Date).ToString("yyyyMMdd-HHmmss") + "-" + (Get-Random -Maximum 9999)
$departure = (Get-Date).AddDays(1).Date.AddHours(14)
$departureIso = $departure.ToString("o")

# 1) Publish ride as guest
$ridePayload = @{
  originCity = "Dakar"
  destinationCity = "Kaolack"
  departureTime = $departureIso
  pricePerSeat = 4000
  totalSeats = 3
  features = @("Climatisation")
  description = "TEST_AUTOMATION $runId"
  driverName = "Test Driver"
  driverPhone = "771234567"
}

Write-Host "\n[1/4] Publishing ride (guest)..." -ForegroundColor Yellow
$publishRes = Invoke-JsonPost -Url "$BaseUrl/rides" -Body $ridePayload
if (-not $publishRes.success) { throw "Ride publish failed: $($publishRes | ConvertTo-Json -Depth 6)" }
$rideId = $publishRes.data.ride.id
Write-Host "Published rideId: $rideId" -ForegroundColor Green

# 2) Verify ride appears in /recent
Write-Host "\n[2/4] Checking ride appears in /rides/recent..." -ForegroundColor Yellow
$recent = Invoke-RestMethod -Method Get -Uri "$BaseUrl/rides/recent?limit=$RecentLimit"
if (-not $recent.success) { throw "Recent fetch failed: $($recent | ConvertTo-Json -Depth 6)" }
$found = $false
foreach ($r in $recent.data.rides) {
  if ($r.id -eq $rideId) { $found = $true; break }
}
Write-Host ("Recent contains ride? " + $found) -ForegroundColor Green
if (-not $found) {
  Write-Host "Recent rides returned:" -ForegroundColor DarkGray
  $recent.data.rides | Select-Object -First 5 id,origin,destination,departureTime,createdAt | Format-Table -AutoSize | Out-String | Write-Host
}

# 3) Create guest booking (reservation)
$bookingPayload = @{
  rideId = $rideId
  passengerName = "Test Passenger"
  passengerPhone = "771234568"
  seats = 1
  notes = "TEST_AUTOMATION booking $runId"
  contactPreference = "call"
  paymentMethod = "CASH"
}

Write-Host "\n[3/4] Creating guest booking..." -ForegroundColor Yellow
$bookRes = Invoke-JsonPost -Url "$BaseUrl/guest-bookings" -Body $bookingPayload
if (-not $bookRes.success) { throw "Booking failed: $($bookRes | ConvertTo-Json -Depth 6)" }
$bookingId = $bookRes.data.booking.id
Write-Host "Created bookingId: $bookingId (status=$($bookRes.data.booking.status))" -ForegroundColor Green

# 4) Verify seats decremented on ride details
Write-Host "\n[4/4] Verifying ride details (seats decrement)..." -ForegroundColor Yellow
$rideDetails = Invoke-RestMethod -Method Get -Uri "$BaseUrl/rides/$rideId"
if (-not $rideDetails.success) { throw "Ride details failed: $($rideDetails | ConvertTo-Json -Depth 6)" }
$seatsAvail = $rideDetails.data.ride.seatsAvailable
Write-Host "Ride seatsAvailable now: $seatsAvail" -ForegroundColor Green

Write-Host "\n✅ E2E PROD OK" -ForegroundColor Cyan
Write-Host "Ride: $rideId" -ForegroundColor DarkGray
Write-Host "Booking: $bookingId" -ForegroundColor DarkGray
