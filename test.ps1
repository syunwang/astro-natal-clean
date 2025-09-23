# test.ps1 — minimal, emoji-free

$ErrorActionPreference = 'Stop'

$base = "https://astro-natal-clean.netlify.app/.netlify/functions"

# 1) 測試 geo (GET)
$place = "Tainan"
$geoUrl = "$base/geo?place=$([uri]::EscapeDataString($place))"

Write-Host "Testing GEO endpoint: $geoUrl"
$geo = Invoke-WebRequest -Uri $geoUrl -Method GET
Write-Host "GEO Status Code:" $geo.StatusCode
try {
  ($geo.Content | ConvertFrom-Json) | ConvertTo-Json -Depth 10
} catch {
  Write-Host "GEO Raw Content:" $geo.Content
}
Write-Host ""

# 2) 測試 natal (POST)
$natalUrl = "$base/natal"
$payload = @{
  year      = 1958
  month     = 1
  day       = 7
  hour      = 8
  minute    = 50
  latitude  = 22.99083
  longitude = 120.21333
  timezone  = 8
  language  = "en"
} | ConvertTo-Json -Depth 10

Write-Host "Testing NATAL endpoint: $natalUrl"
$response = Invoke-WebRequest -Uri $natalUrl -Method POST -ContentType "application/json" -Body $payload

Write-Host "NATAL Status Code:" $response.StatusCode
try {
  ($response.Content | ConvertFrom-Json) | ConvertTo-Json -Depth 10
} catch {
  Write-Host "NATAL Raw Content:" $response.Content
}
