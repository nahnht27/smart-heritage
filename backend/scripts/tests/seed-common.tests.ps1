Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'seed-demo-data.ps1'
$modulePath = Join-Path $root 'lib/DemoSeed.Common.psm1'

Import-Module $modulePath -Force

$script:Passed = 0

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "Assertion failed: $Message"
    }

    $script:Passed++
}

function Assert-Throws {
    param(
        [scriptblock]$Action,
        [string]$Pattern,
        [string]$Message
    )

    $threw = $false
    $actualMessage = ''

    try {
        & $Action | Out-Null
    }
    catch {
        $threw = $true
        $actualMessage = $_.Exception.Message
    }

    Assert-True $threw $Message

    if ($Pattern -and $actualMessage -notmatch $Pattern) {
        throw (
            "Assertion failed: $Message. " +
            "Message '$actualMessage' did not match '$Pattern'."
        )
    }
}

function Get-ParseErrors {
    param([string]$Path)

    $tokens = $null
    $errors = $null

    [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path $Path),
        [ref]$tokens,
        [ref]$errors
    ) | Out-Null

    return @($errors)
}

Assert-True `
    (@(Get-ParseErrors $scriptPath).Count -eq 0) `
    'seed script parses'

Assert-True `
    (@(Get-ParseErrors $modulePath).Count -eq 0) `
    'common module parses'

$acceptedBaseUrls = @(
    'http://localhost:8080',
    'http://localhost:8080/',
    'http://127.0.0.1:8080',
    'http://[::1]:8080',
    'https://localhost:8443'
)

foreach ($baseUrl in $acceptedBaseUrls) {
    $resolved = Resolve-DemoSeedBaseUrl -BaseUrl $baseUrl
    Assert-True `
        ($resolved -ceq $baseUrl.TrimEnd('/')) `
        "accepts loopback BaseUrl $baseUrl"
}

$rejectedBaseUrls = @(
    '',
    'not-a-url',
    'ftp://localhost:8080',
    'https://example.com',
    'http://192.168.1.10:8080',
    'http://localhost.example.com:8080',
    'http://user:pass@localhost:8080',
    'http://localhost:8080/api',
    'http://localhost:8080/?demo=true'
)

foreach ($baseUrl in $rejectedBaseUrls) {
    Assert-Throws `
        { Resolve-DemoSeedBaseUrl -BaseUrl $baseUrl } `
        '' `
        "rejects BaseUrl '$baseUrl'"
}

$fixedNow = [DateTimeOffset]::Parse('2026-11-22T12:00:00Z')
$fixedAnchor = [DateTimeOffset]::Parse('2026-11-22T10:00:00Z')

$manifestWithAnchor = [pscustomobject]@{
    interactionAnchorAtUtc = $fixedAnchor.ToString('o')
    interactions = @()
}

Assert-True `
    ((Resolve-DemoSeedInteractionAnchor `
        -Manifest $manifestWithAnchor `
        -Now $fixedNow) -eq $fixedAnchor) `
    'reuses persisted anchor'

$legacyFirstStart = $fixedAnchor.AddDays(-8).AddMinutes(15)
$manifestWithoutAnchor = [pscustomobject]@{
    interactions = @(
        [pscustomobject]@{
            startedAt = $legacyFirstStart.AddHours(3).ToString('o')
        },
        [pscustomobject]@{
            startedAt = $legacyFirstStart.ToString('o')
        }
    )
}

Assert-True `
    ((Resolve-DemoSeedInteractionAnchor `
        -Manifest $manifestWithoutAnchor `
        -Now $fixedNow) -eq $fixedAnchor) `
    'derives legacy anchor without rewriting timestamps'

Assert-True `
    ((Resolve-DemoSeedInteractionAnchor `
        -Manifest $null `
        -Now $fixedNow) -eq $fixedNow) `
    'uses supplied current time for a new manifest'

$invalidAnchorManifest = [pscustomobject]@{
    interactionAnchorAtUtc = 'not-a-timestamp'
    interactions = @()
}

Assert-Throws `
    { Resolve-DemoSeedInteractionAnchor `
        -Manifest $invalidAnchorManifest `
        -Now $fixedNow } `
    'interactionAnchorAtUtc' `
    'rejects invalid persisted anchor'

$artifacts = @(
    @{ Key = 'a1' },
    @{ Key = 'a2' }
)

$beacons = @(
    @{
        Key = 'b1'
        ArtifactKey = 'a1'
    }
)

$visitorIds = @(
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000005',
    '20000000-0000-4000-8000-000000000006',
    '20000000-0000-4000-8000-000000000007',
    '20000000-0000-4000-8000-000000000008'
)

$artifactIds = @{
    a1 = 10
    a2 = 20
}

$beaconIds = @{
    b1 = 100
}

$definitions = New-DemoSeedInteractionDefinitions `
    -Artifacts $artifacts `
    -Beacons $beacons `
    -VisitorIds $visitorIds `
    -ArtifactIds $artifactIds `
    -BeaconIds $beaconIds `
    -AnchorAtUtc $fixedAnchor

$repeatedDefinitions = New-DemoSeedInteractionDefinitions `
    -Artifacts $artifacts `
    -Beacons $beacons `
    -VisitorIds $visitorIds `
    -ArtifactIds $artifactIds `
    -BeaconIds $beaconIds `
    -AnchorAtUtc $fixedAnchor

Assert-True ($definitions.Count -eq 6) 'creates three events per artifact'
Assert-True `
    ((@($definitions.eventId | Sort-Object -Unique)).Count -eq 6) `
    'creates unique deterministic event IDs'
Assert-True `
    (($definitions | ConvertTo-Json -Depth 10) -ceq
        ($repeatedDefinitions | ConvertTo-Json -Depth 10)) `
    'same anchor produces identical interaction definitions'

$earliestExpected = $fixedAnchor.AddDays(-8).AddMinutes(15)
$latestAllowed = $fixedAnchor

Assert-True `
    (([DateTimeOffset]::Parse([string]$definitions[0].startedAt)) -eq
        $earliestExpected) `
    'first interaction starts at the expected anchored time'

foreach ($definition in $definitions) {
    $startedAt = [DateTimeOffset]::Parse([string]$definition.startedAt)
    $interactedAt = [DateTimeOffset]::Parse([string]$definition.interactedAt)

    Assert-True `
        ($startedAt -ge $earliestExpected -and $startedAt -lt $latestAllowed) `
        'interaction starts within the anchored window'
    Assert-True `
        ($interactedAt -lt $latestAllowed) `
        'interaction does not occur after the anchor'
}

$sevenDayCount = @(
    $definitions |
        Where-Object {
            [DateTimeOffset]::Parse([string]$_.interactedAt) -ge
                $fixedAnchor.AddDays(-7)
        }
).Count

Assert-True ($sevenDayCount -gt 0) 'anchored definitions populate 7-day window'
Assert-True ($definitions.Count -gt 0) 'anchored definitions populate all-time window'

Write-Host "PASS: $($script:Passed) seed helper assertions."
