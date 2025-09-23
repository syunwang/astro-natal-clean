# PowerShell quick test for Netlify Functions
param(
  [string]$Base = "https://astro-natal-clean.netlify.app",
  [string]$ApiKey = ""
)

Write-Host "Testing NATAL endpoint..."
$body = @{
  year=1958; month=1; day=7; hour=8; minute=50; seconds=0;
  latitude=22.99083; longitude=120.21333; timezone=8; language="en"
} | ConvertTo-Json

$headers = @{ "Content-Type"="application/json" }
if ($ApiKey) { $headers["Authorization"] = "Bearer $ApiKey" }

$response = Invoke-WebRequest -Uri "$Base/.netlify/functions/natal" `
  -Method POST `
  -Headers $headers `
  -Body $body

Write-Host ($response.Content | Out-String)
