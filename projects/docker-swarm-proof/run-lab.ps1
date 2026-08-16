param(
    [switch]$Reset
)

$ErrorActionPreference = 'Stop'

$labRoot = $PSScriptRoot
$runtimeDir = Join-Path $labRoot 'runtime'
$resultsDir = Join-Path $labRoot 'results'
$composeFile = Join-Path $labRoot 'docker-compose.yml'
$stackFile = Join-Path $labRoot 'stack.yml'
$opensslConfig = Join-Path $labRoot 'registry-openssl.cnf'
$managerHost = 'tcp://127.0.0.1:23750'
$passwordBytes = New-Object byte[] 32
$passwordGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $passwordGenerator.GetBytes($passwordBytes)
} finally {
    $passwordGenerator.Dispose()
}
$registryPassword = [Convert]::ToBase64String($passwordBytes)

New-Item -ItemType Directory -Force $runtimeDir, $resultsDir | Out-Null

function Invoke-OuterCompose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & docker compose -f $composeFile @Arguments
    if ($LASTEXITCODE) { throw "docker compose failed: $($Arguments -join ' ')" }
}

if ($Reset) {
    Write-Host 'Resetting only the foxbox-swarm-proof Compose project...'
    Invoke-OuterCompose -Arguments @('down', '--volumes', '--remove-orphans')
}

foreach ($evidencePath in @(
    (Join-Path $resultsDir 'baseline.json'),
    (Join-Path $resultsDir 'worker-failover.txt'),
    (Join-Path $resultsDir 'manager-failover.txt'),
    (Join-Path $resultsDir 'recovered.json'),
    (Join-Path $resultsDir 'BENCHMARK_SUMMARY.md')
)) {
    if (Test-Path -LiteralPath $evidencePath) {
        Remove-Item -LiteralPath $evidencePath -Force
    }
}

function Invoke-ManagerDocker {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    & docker --host $managerHost @Arguments
    if ($LASTEXITCODE) { throw "manager docker command failed: $($Arguments -join ' ')" }
}

function Wait-Dind {
    param([string]$Service)
    $ErrorActionPreference = 'Continue'
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $serverVersion = & docker compose -f $composeFile exec -T $Service docker info --format '{{.ServerVersion}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($serverVersion -join ''))) { return }
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for nested Docker daemon: $Service"
}

function Wait-Services {
    $ErrorActionPreference = 'Continue'
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        $lines = & docker --host $managerHost service ls --format '{{.Name}}={{.Replicas}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $lines -contains 'proof_health=3/3' -and $lines -contains 'proof_registry=1/1') { return }
        Start-Sleep -Seconds 2
    }
    throw 'Timed out waiting for proof services to converge.'
}

function Wait-NodeReady {
    param([string]$Node)
    $ErrorActionPreference = 'Continue'
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $state = & docker --host $managerHost node inspect $Node --format '{{.Status.State}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $state.Trim() -eq 'ready') { return }
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for node: $Node"
}

function Wait-NodeDown {
    param([string]$Node)
    $ErrorActionPreference = 'Continue'
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $state = & docker --host $managerHost node inspect $Node --format '{{.Status.State}}' 2>$null
        if ($LASTEXITCODE -eq 0 -and $state.Trim() -eq 'down') { return }
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for node to become Down: $Node"
}

function Wait-ServiceOffNode {
    param(
        [string]$Service,
        [string]$Node,
        [int]$ExpectedRunning
    )
    $ErrorActionPreference = 'Continue'
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        $rows = @(& docker --host $managerHost service ps $Service `
            --filter desired-state=running `
            --format '{{.Node}}|{{.CurrentState}}' 2>$null)
        $runningRows = @($rows | Where-Object { $_ -match '\|Running\b' })
        $runningOnStoppedNode = @($runningRows | Where-Object { $_ -like "$Node|*" })
        if (
            $LASTEXITCODE -eq 0 -and
            $runningRows.Count -eq $ExpectedRunning -and
            $runningOnStoppedNode.Count -eq 0
        ) { return }
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for $Service to run $ExpectedRunning tasks away from $Node"
}

function Wait-Http200 {
    param([string]$Url)
    for ($attempt = 1; $attempt -le 60; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) { return }
        } catch {}
        Start-Sleep -Seconds 2
    }
    throw "Timed out waiting for HTTP 200: $Url"
}

Write-Host 'Generating controlled-lab TLS material...'
$certMount = ($runtimeDir -replace '\\', '/')
$configMount = ($opensslConfig -replace '\\', '/')
& docker run --rm -v "${certMount}:/out" alpine/openssl genrsa -out /out/ca.key 2048
if ($LASTEXITCODE) { throw 'CA key generation failed.' }
& docker run --rm -v "${certMount}:/out" alpine/openssl req -x509 -new -nodes -key /out/ca.key -sha256 -days 2 -subj '/CN=Fox Box Controlled Proof CA' -out /out/ca.crt
if ($LASTEXITCODE) { throw 'CA certificate generation failed.' }
& docker run --rm -v "${certMount}:/out" alpine/openssl genrsa -out /out/registry.key 2048
if ($LASTEXITCODE) { throw 'Registry key generation failed.' }
& docker run --rm -v "${certMount}:/out" -v "${configMount}:/config/registry-openssl.cnf:ro" alpine/openssl req -new -key /out/registry.key -out /out/registry.csr -config /config/registry-openssl.cnf
if ($LASTEXITCODE) { throw 'Registry CSR generation failed.' }
& docker run --rm -v "${certMount}:/out" -v "${configMount}:/config/registry-openssl.cnf:ro" alpine/openssl x509 -req -in /out/registry.csr -CA /out/ca.crt -CAkey /out/ca.key -CAcreateserial -out /out/registry.crt -days 2 -sha256 -extfile /config/registry-openssl.cnf -extensions v3_req
if ($LASTEXITCODE) { throw 'Registry certificate signing failed.' }
$htpasswd = $registryPassword | & docker run --rm -i httpd:2.4-alpine htpasswd -Bni proof
if ($LASTEXITCODE) { throw 'Registry htpasswd generation failed.' }
$htpasswd | Set-Content -Encoding ascii (Join-Path $runtimeDir 'registry.htpasswd')

Write-Host 'Starting five isolated Docker-in-Docker nodes...'
Invoke-OuterCompose -Arguments @('up', '-d')
foreach ($service in 'manager1', 'manager2', 'manager3', 'worker1', 'worker2') { Wait-Dind $service }

Write-Host 'Initializing 3-manager/2-worker Swarm...'
& docker compose -f $composeFile exec -T manager1 docker swarm init --advertise-addr 172.31.50.11 | Out-Null
if ($LASTEXITCODE) { throw 'Swarm initialization failed.' }
$managerToken = (& docker compose -f $composeFile exec -T manager1 docker swarm join-token -q manager).Trim()
$workerToken = (& docker compose -f $composeFile exec -T manager1 docker swarm join-token -q worker).Trim()
foreach ($service in 'manager2', 'manager3') {
    & docker compose -f $composeFile exec -T $service docker swarm join --token $managerToken 172.31.50.11:2377 | Out-Null
    if ($LASTEXITCODE) { throw "Manager join failed: $service" }
}
foreach ($service in 'worker1', 'worker2') {
    & docker compose -f $composeFile exec -T $service docker swarm join --token $workerToken 172.31.50.11:2377 | Out-Null
    if ($LASTEXITCODE) { throw "Worker join failed: $service" }
}
foreach ($node in 'manager-1', 'manager-2', 'manager-3', 'worker-1', 'worker-2') { Wait-NodeReady $node }

Write-Host 'Creating ephemeral Swarm secrets and deploying proof services...'
Get-Content -Raw (Join-Path $runtimeDir 'registry.crt') | docker --host $managerHost secret create foxbox_registry_cert - | Out-Null
if ($LASTEXITCODE) { throw 'Registry certificate secret creation failed.' }
Get-Content -Raw (Join-Path $runtimeDir 'registry.key') | docker --host $managerHost secret create foxbox_registry_key - | Out-Null
if ($LASTEXITCODE) { throw 'Registry key secret creation failed.' }
Get-Content -Raw (Join-Path $runtimeDir 'registry.htpasswd') | docker --host $managerHost secret create foxbox_registry_htpasswd - | Out-Null
if ($LASTEXITCODE) { throw 'Registry auth secret creation failed.' }
Invoke-ManagerDocker stack deploy -c $stackFile proof
Wait-Services
Wait-Http200 'http://127.0.0.1:18080/'

$oldDockerHost = $env:DOCKER_HOST
$oldRegistryPassword = $env:REGISTRY_PASSWORD
try {
    $env:DOCKER_HOST = $managerHost
    $env:REGISTRY_PASSWORD = $registryPassword
    & python (Join-Path $labRoot 'verify_swarm.py') `
        --expected-managers 3 `
        --expected-workers 2 `
        --service proof_health `
        --service proof_registry `
        --health-url http://127.0.0.1:18080/ `
        --registry-url https://127.0.0.1:15000 `
        --registry-user proof `
        --registry-ca-file (Join-Path $runtimeDir 'ca.crt') `
        --output (Join-Path $resultsDir 'baseline.json') | Out-Null
    if ($LASTEXITCODE) { throw 'Baseline verification failed.' }
} finally {
    $env:DOCKER_HOST = $oldDockerHost
    $env:REGISTRY_PASSWORD = $oldRegistryPassword
}

Write-Host 'Testing worker failover...'
Invoke-OuterCompose -Arguments @('stop', 'worker1')
Wait-NodeDown 'worker-1'
Wait-ServiceOffNode -Service 'proof_health' -Node 'worker-1' -ExpectedRunning 3
Wait-Http200 'http://127.0.0.1:18080/'
$workerEvidence = @(
    'NODE_STATE_WHILE_WORKER_1_STOPPED',
    (Invoke-ManagerDocker -Arguments @('node', 'ls', '--format', '{{.Hostname}}|{{.Status}}|{{.ManagerStatus}}')),
    '',
    'DESIRED_RUNNING_TASKS_WHILE_WORKER_1_STOPPED',
    (Invoke-ManagerDocker -Arguments @(
        'service', 'ps', 'proof_health',
        '--filter', 'desired-state=running',
        '--format', '{{.Name}}|{{.Node}}|{{.CurrentState}}'
    ))
)
$workerEvidence | Set-Content -Encoding utf8 (Join-Path $resultsDir 'worker-failover.txt')
Invoke-OuterCompose -Arguments @('start', 'worker1')
Wait-Dind 'worker1'
Wait-NodeReady 'worker-1'
Wait-Services

Write-Host 'Testing follower-manager failover...'
Invoke-OuterCompose -Arguments @('stop', 'manager2')
Wait-NodeDown 'manager-2'
$managerEvidence = @(
    'NODE_STATE_WHILE_MANAGER_2_STOPPED',
    (Invoke-ManagerDocker -Arguments @('node', 'ls', '--format', '{{.Hostname}}|{{.Status}}|{{.ManagerStatus}}')),
    '',
    'SERVICE_STATE_WHILE_MANAGER_2_STOPPED',
    (Invoke-ManagerDocker -Arguments @('service', 'ls', '--format', '{{.Name}}|{{.Replicas}}'))
)
$managerEvidence | Set-Content -Encoding utf8 (Join-Path $resultsDir 'manager-failover.txt')
Wait-Http200 'http://127.0.0.1:18080/'
Invoke-OuterCompose -Arguments @('start', 'manager2')
Wait-Dind 'manager2'
Wait-NodeReady 'manager-2'
Wait-Services

try {
    $env:DOCKER_HOST = $managerHost
    $env:REGISTRY_PASSWORD = $registryPassword
    & python (Join-Path $labRoot 'verify_swarm.py') `
        --expected-managers 3 `
        --expected-workers 2 `
        --service proof_health `
        --service proof_registry `
        --health-url http://127.0.0.1:18080/ `
        --registry-url https://127.0.0.1:15000 `
        --registry-user proof `
        --registry-ca-file (Join-Path $runtimeDir 'ca.crt') `
        --output (Join-Path $resultsDir 'recovered.json') | Out-Null
    if ($LASTEXITCODE) { throw 'Recovered-state verification failed.' }
} finally {
    $env:DOCKER_HOST = $oldDockerHost
    $env:REGISTRY_PASSWORD = $oldRegistryPassword
}

$baseline = Get-Content -Raw (Join-Path $resultsDir 'baseline.json') | ConvertFrom-Json
$recovered = Get-Content -Raw (Join-Path $resultsDir 'recovered.json') | ConvertFrom-Json
$summary = @(
    '# Fox Box controlled Docker Swarm proof lab',
    '',
    '> Controlled local process proof, not a client case and not evidence about a third-party production environment.',
    '',
    "Baseline gate: **$(if ($baseline.passed) { 'PASS' } else { 'FAIL' })**.",
    "Recovered-state gate: **$(if ($recovered.passed) { 'PASS' } else { 'FAIL' })**.",
    '',
    '- Five isolated Docker-in-Docker nodes: three managers and two workers.',
    '- Three replicated Nginx health tasks scheduled only on workers.',
    '- Registry 2 deployed as a Swarm service with CA-signed TLS and bcrypt htpasswd authentication.',
    '- HTTP service remained available after one worker stopped and tasks converged on the remaining worker.',
    '- The leader continued listing services and serving traffic while one follower-manager was stopped.',
    '- Both stopped nodes returned to Ready and the complete read-only verifier passed again.',
    '',
    'Use only as process proof. A funded client environment requires its own baseline, storage decision, firewall matrix and approved failover window.'
)
$summary | Set-Content -Encoding utf8 (Join-Path $resultsDir 'BENCHMARK_SUMMARY.md')
Get-Content (Join-Path $resultsDir 'BENCHMARK_SUMMARY.md')
