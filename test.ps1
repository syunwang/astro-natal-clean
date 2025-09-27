# test.ps1 - 測試 Netlify Functions natal API

Write-Host "🚀 Testing natal API..." -ForegroundColor Cyan

# 你的 Netlify Function URL
$uri = "https://astro-natal-clean.netlify.app/.netlify/functions/natal"

# 測試 payload
$body = @{
    year      = 1958
    month     = 1
    day       = 7
    hour      = 8
    minute    = 50
    seconds   = 0
    latitude  = 22.99083
    longitude = 120.21333
    timezone  = 8
} | ConvertTo-Json -Compress

# 發送請求
$response = Invoke-WebRequest `
    -Uri $uri `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "✅ Status Code:" $response.StatusCode -ForegroundColor Green
Write-Host "`n🌍 API Response:" -ForegroundColor Yellow
$response.Content | Out-String | Write-Output
