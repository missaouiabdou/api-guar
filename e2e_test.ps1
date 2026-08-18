# =============================================================================
# GuardRail API - Full End-to-End Real Test Script
# =============================================================================
# Usage:  .\e2e_test.ps1
# Prerequisites:
#   1. Rails server running:  bundle exec rails s
#   2. Dev database migrated: bundle exec rails db:migrate
# =============================================================================

$ErrorActionPreference = "Continue"
$BASE = "http://localhost:3000"

# --- Read webhook secret ---
$SECRET_FILE = Join-Path $PSScriptRoot "tmp\.github_webhook_secret"
if (Test-Path $SECRET_FILE) {
    $WEBHOOK_SECRET = (Get-Content $SECRET_FILE).Trim()
    Write-Host "`n[CONFIG] Webhook secret loaded from tmp/.github_webhook_secret" -ForegroundColor Cyan
} else {
    $WEBHOOK_SECRET = "testsecret"
    Write-Host "`n[CONFIG] No secret file found, using fallback: testsecret" -ForegroundColor Yellow
}

# --- HMAC-SHA256 ---
function Get-HmacSha256 {
    param([string]$Secret, [string]$Message)
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [System.Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Message))
    return "sha256=" + [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

# --- Results ---
$results = @()
function Log-Result {
    param([string]$Step, [bool]$Pass, [string]$Detail)
    $icon = if ($Pass) { "PASS" } else { "FAIL" }
    $color = if ($Pass) { "Green" } else { "Red" }
    Write-Host "  [$icon] $Step - $Detail" -ForegroundColor $color
    $script:results += [PSCustomObject]@{ Step=$Step; Pass=$Pass; Detail=$Detail }
}

$TS = Get-Date -Format "yyyyMMddHHmmss"
$EMAIL = "test_e2e_${TS}@guardrail.dev"
$PASSWORD = "SecurePass123!"
$TOKEN = ""

Write-Host "`n========================================================" -ForegroundColor White
Write-Host "  GuardRail API - End-to-End Real Test" -ForegroundColor White
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "  Base URL: $BASE" -ForegroundColor Gray
Write-Host "  Test user: $EMAIL" -ForegroundColor Gray
Write-Host "========================================================`n" -ForegroundColor White

# === STEP 1: Health Check ===
Write-Host "[STEP 1] Health Check" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BASE/up" -UseBasicParsing -ErrorAction Stop
    Log-Result "Health Check" ($r.StatusCode -eq 200) "HTTP $($r.StatusCode)"
} catch {
    Log-Result "Health Check" $false "Server not reachable"
    Write-Host "`n[ABORT] Start Rails server first: bundle exec rails s`n" -ForegroundColor Red
    exit 1
}

# === STEP 2: Signup ===
Write-Host "`n[STEP 2] User Signup" -ForegroundColor Cyan
$signupBody = @{ user = @{ email = $EMAIL; password = $PASSWORD; password_confirmation = $PASSWORD } } | ConvertTo-Json -Depth 3
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/signup" -Method POST -ContentType "application/json" -Body $signupBody -UseBasicParsing -ErrorAction Stop
    Log-Result "Signup" ($r.StatusCode -eq 201 -or $r.StatusCode -eq 200) "HTTP $($r.StatusCode)"
} catch {
    Log-Result "Signup" $false "HTTP $($_.Exception.Response.StatusCode.value__)"
}

# === STEP 3: Login ===
Write-Host "`n[STEP 3] User Login" -ForegroundColor Cyan
$loginBody = @{ user = @{ email = $EMAIL; password = $PASSWORD } } | ConvertTo-Json -Depth 3
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing -ErrorAction Stop
    $TOKEN = $r.Headers["Authorization"]
    Log-Result "Login" ($r.StatusCode -eq 200 -and $TOKEN) "HTTP $($r.StatusCode), Token=$(if($TOKEN){'captured'}else{'MISSING'})"
} catch {
    Log-Result "Login" $false "HTTP $($_.Exception.Response.StatusCode.value__)"
}
if (-not $TOKEN) { Write-Host "`n[ABORT] No JWT token`n" -ForegroundColor Red; exit 1 }

$AUTH = @{ "Authorization" = $TOKEN; "Content-Type" = "application/json" }

# === STEP 4: Create Project ===
Write-Host "`n[STEP 4] Create Project (github_repo=missaoui/guardrail-api)" -ForegroundColor Cyan
$projBody = @{ project = @{ name = "GuardRail API"; description = "Security scanning platform"; repository_url = "https://github.com/missaoui/guardrail-api"; github_repo = "missaoui/guardrail-api"; status = "active" } } | ConvertTo-Json -Depth 3
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/projects" -Method POST -Headers $AUTH -Body $projBody -UseBasicParsing -ErrorAction Stop
    $proj = $r.Content | ConvertFrom-Json
    Log-Result "Create Project" ($r.StatusCode -eq 201 -and $proj.id) "HTTP $($r.StatusCode), id=$($proj.id)"
    Log-Result "github_repo saved" ($proj.github_repo -eq "missaoui/guardrail-api") "github_repo=$($proj.github_repo)"
} catch {
    $errBody = ""; try { $errBody = $_.ErrorDetails.Message } catch {}
    Log-Result "Create Project" $false "HTTP $($_.Exception.Response.StatusCode.value__): $errBody"
}

# === STEP 5: GitHub Push Webhook ===
Write-Host "`n[STEP 5] GitHub Push Webhook (real format)" -ForegroundColor Cyan
$pushPayload = '{"ref":"refs/heads/main","before":"0000000000000000000000000000000000000000","after":"a1b2c3d4e5f6789012345678901234567890abcd","created":false,"deleted":false,"forced":false,"compare":"https://github.com/missaoui/guardrail-api/compare/abc123...a1b2c3d","commits":[{"id":"a1b2c3d4e5f6789012345678901234567890abcd","tree_id":"def456789012345678901234567890abcdef1234","distinct":true,"message":"fix: resolve authentication bypass in JWT validation","timestamp":"2026-08-14T12:30:00+01:00","url":"https://github.com/missaoui/guardrail-api/commit/a1b2c3d4e5f6789012345678901234567890abcd","author":{"name":"Abdou Missaoui","email":"abdou@missaoui.dev","username":"missaoui"},"committer":{"name":"Abdou Missaoui","email":"abdou@missaoui.dev","username":"missaoui"},"added":[],"removed":[],"modified":["app/services/auth/jwt_validator.rb"]}],"head_commit":{"id":"a1b2c3d4e5f6789012345678901234567890abcd","tree_id":"def456789012345678901234567890abcdef1234","distinct":true,"message":"fix: resolve authentication bypass in JWT validation","timestamp":"2026-08-14T12:30:00+01:00","author":{"name":"Abdou Missaoui","email":"abdou@missaoui.dev","username":"missaoui"}},"repository":{"id":123456789,"name":"guardrail-api","full_name":"missaoui/guardrail-api","private":true,"owner":{"login":"missaoui","id":987654},"html_url":"https://github.com/missaoui/guardrail-api","default_branch":"main"},"pusher":{"name":"missaoui","email":"abdou@missaoui.dev"},"sender":{"login":"missaoui","id":987654,"type":"User"}}'

$pushSig = Get-HmacSha256 -Secret $WEBHOOK_SECRET -Message $pushPayload
$DEL1 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$pushSig; "X-GitHub-Event"="push"; "X-GitHub-Delivery"=$DEL1 } -Body $pushPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Push Webhook" ($r.StatusCode -eq 202) "HTTP $($r.StatusCode) - Delivery: $DEL1"
} catch {
    $errBody = ""; try { $errBody = $_.ErrorDetails.Message } catch {}
    Log-Result "Push Webhook" $false "HTTP $($_.Exception.Response.StatusCode.value__): $errBody"
}

# === STEP 6: Duplicate (same delivery_id) ===
Write-Host "`n[STEP 6] Duplicate Webhook (same delivery_id)" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$pushSig; "X-GitHub-Event"="push"; "X-GitHub-Delivery"=$DEL1 } -Body $pushPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Duplicate Webhook" ($r.StatusCode -eq 200) "HTTP $($r.StatusCode) - Deduplicated"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    Log-Result "Duplicate Webhook" ($sc -eq 200) "HTTP $sc"
}

# === STEP 7: Pull Request Webhook ===
Write-Host "`n[STEP 7] GitHub Pull Request Webhook" -ForegroundColor Cyan
$prPayload = '{"action":"opened","number":42,"pull_request":{"id":11223344,"number":42,"state":"open","title":"Add rate limiting to API endpoints","user":{"login":"missaoui","id":987654},"head":{"ref":"feature/rate-limiting","sha":"b2c3d4e5f6a789012345678901234567890bcd12"},"base":{"ref":"main","sha":"a1b2c3d4e5f6789012345678901234567890abcd"},"html_url":"https://github.com/missaoui/guardrail-api/pull/42"},"repository":{"id":123456789,"name":"guardrail-api","full_name":"missaoui/guardrail-api","private":true,"owner":{"login":"missaoui"},"default_branch":"main"},"sender":{"login":"missaoui","id":987654,"type":"User"}}'

$prSig = Get-HmacSha256 -Secret $WEBHOOK_SECRET -Message $prPayload
$DEL2 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$prSig; "X-GitHub-Event"="pull_request"; "X-GitHub-Delivery"=$DEL2 } -Body $prPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "PR Webhook" ($r.StatusCode -eq 202) "HTTP $($r.StatusCode) - PR #42"
} catch {
    $errBody = ""; try { $errBody = $_.ErrorDetails.Message } catch {}
    Log-Result "PR Webhook" $false "HTTP $($_.Exception.Response.StatusCode.value__): $errBody"
}

# === STEP 8: Unsupported Event (issues) ===
Write-Host "`n[STEP 8] Unsupported Event (issues)" -ForegroundColor Cyan
$issuesPayload = '{"action":"opened","issue":{"number":7,"title":"Bug: login fails on Safari"},"repository":{"full_name":"missaoui/guardrail-api"},"sender":{"login":"missaoui"}}'
$issuesSig = Get-HmacSha256 -Secret $WEBHOOK_SECRET -Message $issuesPayload
$DEL3 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$issuesSig; "X-GitHub-Event"="issues"; "X-GitHub-Delivery"=$DEL3 } -Body $issuesPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Unsupported Event" ($r.StatusCode -eq 202) "HTTP $($r.StatusCode) - Recorded, no scan"
} catch {
    $errBody = ""; try { $errBody = $_.ErrorDetails.Message } catch {}
    Log-Result "Unsupported Event" $false "HTTP $($_.Exception.Response.StatusCode.value__): $errBody"
}

# === STEP 9: Ping Event ===
Write-Host "`n[STEP 9] GitHub Ping Event" -ForegroundColor Cyan
$pingPayload = '{"zen":"Responsive is better than fast.","hook_id":55667788,"hook":{"type":"Repository","id":55667788,"events":["push","pull_request"],"active":true},"repository":{"full_name":"missaoui/guardrail-api"},"sender":{"login":"missaoui"}}'
$pingSig = Get-HmacSha256 -Secret $WEBHOOK_SECRET -Message $pingPayload
$DEL4 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$pingSig; "X-GitHub-Event"="ping"; "X-GitHub-Delivery"=$DEL4 } -Body $pingPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Ping Event" ($r.StatusCode -eq 202) "HTTP $($r.StatusCode) - Ping OK"
} catch {
    $errBody = ""; try { $errBody = $_.ErrorDetails.Message } catch {}
    Log-Result "Ping Event" $false "HTTP $($_.Exception.Response.StatusCode.value__): $errBody"
}

# === STEP 10: List Scans ===
Write-Host "`n[STEP 10] Get All Scans" -ForegroundColor Cyan
$scans = $null
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/scans" -Method GET -Headers $AUTH -UseBasicParsing -ErrorAction Stop
    $scans = $r.Content | ConvertFrom-Json
    $scanCount = if ($scans -is [Array]) { $scans.Count } else { 1 }
    Log-Result "List Scans" ($r.StatusCode -eq 200) "HTTP $($r.StatusCode) - $scanCount scan(s)"
    if ($scans -is [Array]) {
        foreach ($s in $scans) {
            Write-Host "    Scan #$($s.id): source=$($s.source_type) branch=$($s.branch) sha=$($s.commit_sha) status=$($s.status)" -ForegroundColor Gray
        }
    }
} catch {
    Log-Result "List Scans" $false "HTTP $($_.Exception.Response.StatusCode.value__)"
}

# === STEP 11: Get Scan by ID ===
Write-Host "`n[STEP 11] Get Scan by ID" -ForegroundColor Cyan
if ($scans -and ($scans -is [Array]) -and $scans.Count -gt 0) {
    $sid = $scans[0].id
    try {
        $r = Invoke-WebRequest -Uri "$BASE/api/v1/scans/$sid" -Method GET -Headers $AUTH -UseBasicParsing -ErrorAction Stop
        $sd = $r.Content | ConvertFrom-Json
        Log-Result "Get Scan $sid" ($r.StatusCode -eq 200) "HTTP $($r.StatusCode) - source=$($sd.source_type) status=$($sd.status)"
    } catch {
        Log-Result "Get Scan $sid" $false "HTTP $($_.Exception.Response.StatusCode.value__)"
    }
} else {
    Log-Result "Get Scan by ID" $false "No scans found"
}

# === STEP 12: Invalid Signature ===
Write-Host "`n[STEP 12] Security: Invalid Signature" -ForegroundColor Cyan
$DEL5 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"="sha256=0000000000000000000000000000000000000000000000000000000000000000"; "X-GitHub-Event"="push"; "X-GitHub-Delivery"=$DEL5 } -Body $pushPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Invalid Signature" $false "HTTP $($r.StatusCode) - Should be 401"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    Log-Result "Invalid Signature" ($sc -eq 401) "HTTP $sc - Rejected"
}

# === STEP 13: Missing Signature ===
Write-Host "`n[STEP 13] Security: Missing Signature" -ForegroundColor Cyan
$DEL6 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-GitHub-Event"="push"; "X-GitHub-Delivery"=$DEL6 } -Body $pushPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Missing Signature" $false "HTTP $($r.StatusCode) - Should be 401"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    Log-Result "Missing Signature" ($sc -eq 401) "HTTP $sc - Rejected"
}

# === STEP 14: Unknown Repository ===
Write-Host "`n[STEP 14] Unknown Repository" -ForegroundColor Cyan
$unkPayload = '{"ref":"refs/heads/main","after":"deadbeef","repository":{"full_name":"unknown-org/nonexistent-repo"},"commits":[]}'
$unkSig = Get-HmacSha256 -Secret $WEBHOOK_SECRET -Message $unkPayload
$DEL7 = [guid]::NewGuid().ToString()
try {
    $r = Invoke-WebRequest -Uri "$BASE/api/v1/webhooks/github" -Method POST -ContentType "application/json" -Headers @{ "X-Hub-Signature-256"=$unkSig; "X-GitHub-Event"="push"; "X-GitHub-Delivery"=$DEL7 } -Body $unkPayload -UseBasicParsing -ErrorAction Stop
    Log-Result "Unknown Repo" $false "HTTP $($r.StatusCode) - Should be 422"
} catch {
    $sc = $_.Exception.Response.StatusCode.value__
    Log-Result "Unknown Repo" ($sc -eq 422) "HTTP $sc - Rejected"
}

# === FINAL SUMMARY ===
Write-Host "`n========================================================" -ForegroundColor White
Write-Host "  FINAL RESULTS" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor White

$passed = ($results | Where-Object { $_.Pass }).Count
$failed = ($results | Where-Object { -not $_.Pass }).Count
$total = $results.Count

Write-Host ""
foreach ($r in $results) {
    $icon = if ($r.Pass) { "[PASS]" } else { "[FAIL]" }
    $color = if ($r.Pass) { "Green" } else { "Red" }
    Write-Host "  $icon $($r.Step) - $($r.Detail)" -ForegroundColor $color
}

Write-Host "`n--------------------------------------------------------" -ForegroundColor White
$summaryColor = if ($failed -eq 0) { "Green" } else { "Red" }
Write-Host "  Total: $total  |  Passed: $passed  |  Failed: $failed" -ForegroundColor $summaryColor
Write-Host "========================================================`n" -ForegroundColor White
