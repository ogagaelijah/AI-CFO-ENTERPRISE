# load-tests/write-heavy.ps1
# v1.1.0 — Write-heavy load test using PowerShell Jobs.
#
# v1.1.0 changes:
#   - Uses Invoke-WebRequest inside jobs (native, no curl).
#   - Proper error capture on login.
#   - Reports progress every 10 writes.

param(
    [string]$BaseUrl = "http://127.0.0.1:5000",
    [string]$Email = "writetest@aicfo.test",
    [string]$Password = "WriteTest2026!",
    [int]$ConcurrentJobs = 5,
    [int]$WritesPerJob = 10
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Write-Heavy Load Test ===" -ForegroundColor Cyan
Write-Host "Base URL       : $BaseUrl"
Write-Host "Account        : $Email"
Write-Host "Concurrent jobs: $ConcurrentJobs"
Write-Host "Writes per job : $WritesPerJob"
Write-Host "Total writes   : $($ConcurrentJobs * $WritesPerJob)"
Write-Host ""

# ── Step 1: Login ─────────────────────────────────────────────────
Write-Host "Logging in..." -ForegroundColor Yellow

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$BaseUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -TimeoutSec 30
} catch {
    Write-Host "❌ Login request failed: $_" -ForegroundColor Red
    exit 1
}

if (-not $loginResponse.token) {
    Write-Host "❌ Login rejected: $($loginResponse.message)" -ForegroundColor Red
    Write-Host ($loginResponse | ConvertTo-Json -Depth 3) -ForegroundColor Red
    exit 1
}

$token = $loginResponse.token
$businessId = $loginResponse.business.id
Write-Host "✅ Login OK. businessId=$businessId" -ForegroundColor Green
Write-Host ""

# ── Step 2: Fire concurrent jobs ──────────────────────────────────
Write-Host "Firing $ConcurrentJobs concurrent jobs..." -ForegroundColor Yellow

$startTime = Get-Date

$scriptBlock = {
    param($BaseUrl, $Token, $BusinessId, $WritesPerJob, $JobIndex)

    $latencies = @()
    $errors = @()

    for ($i = 1; $i -le $WritesPerJob; $i++) {
        $payload = @{
            itemName       = "LoadTest Item J$JobIndex-W$i"
            quantity       = 1
            unitPrice      = 100
            customerName   = "LoadTest Customer J$JobIndex"
            customerType   = "CUSTOMER"
            paymentStatus  = "PAID"
            amountPaid     = 100
            skipInventory  = $true
            notes          = "loadtest job=$JobIndex write=$i"
        } | ConvertTo-Json -Compress

        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            $response = Invoke-RestMethod `
                -Uri "$BaseUrl/api/sales" `
                -Method Post `
                -ContentType "application/json" `
                -Headers @{ "Authorization" = "Bearer $Token" } `
                -Body $payload `
                -TimeoutSec 30
            $statusCode = 200
        } catch {
            $statusCode = $_.Exception.Response.StatusCode.value__
            if (-not $statusCode) { $statusCode = 0 }
            $errors += "J${JobIndex}W${i}: HTTP $statusCode - $($_.Exception.Message)"
        }
        $sw.Stop()

        $latencies += $sw.ElapsedMilliseconds
    }

    return @{
        JobIndex  = $JobIndex
        Latencies = $latencies
        Errors    = $errors
    }
}

$jobs = @()
for ($j = 1; $j -le $ConcurrentJobs; $j++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $BaseUrl, $token, $businessId, $WritesPerJob, $j
}

Write-Host "Waiting for $ConcurrentJobs jobs to complete..." -ForegroundColor Yellow
$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$totalTime = ((Get-Date) - $startTime).TotalSeconds

# ── Step 3: Aggregate ─────────────────────────────────────────────
$allLatencies = @()
$allErrors = @()
foreach ($r in $results) {
    $allLatencies += $r.Latencies
    $allErrors += $r.Errors
}

$sorted = $allLatencies | Sort-Object
$count = $sorted.Count

if ($count -eq 0) {
    Write-Host "❌ No requests completed." -ForegroundColor Red
    exit 1
}

$p50 = $sorted[[math]::Floor($count * 0.50)]
$p95 = $sorted[[math]::Min([math]::Floor($count * 0.95), $count - 1)]
$p99 = $sorted[[math]::Min([math]::Floor($count * 0.99), $count - 1)]
$avg = [math]::Round(($sorted | Measure-Object -Average).Average, 0)
$min = $sorted[0]
$max = $sorted[-1]
$rps = [math]::Round($count / $totalTime, 2)

Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "Total requests : $count"
Write-Host "Total time (s) : $([math]::Round($totalTime, 1))"
Write-Host "Throughput RPS : $rps"
Write-Host "Errors         : $($allErrors.Count)"
$successRate = if ($count -gt 0) { [math]::Round((($count - $allErrors.Count) / $count) * 100, 2) } else { 0 }
Write-Host "Success rate   : $successRate%"
Write-Host ""
Write-Host "Latency (ms):"
Write-Host "  min : $min"
Write-Host "  p50 : $p50"
Write-Host "  p95 : $p95"
Write-Host "  p99 : $p99"
Write-Host "  avg : $avg"
Write-Host "  max : $max"

if ($allErrors.Count -gt 0) {
    Write-Host ""
    Write-Host "First 10 errors:" -ForegroundColor Red
    $allErrors | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Expected rows in DB: $count (business=$businessId)"
Write-Host "Run: node scripts/verify-write-loadtest.js $businessId"
Write-Host "Then: node scripts/cleanup-write-loadtest.js $businessId"