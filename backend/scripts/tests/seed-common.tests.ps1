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

# ---------------------------------------------------------------------------
# PostgreSQL Local environment validation
# ---------------------------------------------------------------------------

$cleanPostgresEnvironment = @{
    PGHOST = ''
    PGPORT = ''
    PGHOSTADDR = ''
    PGSERVICE = ''
    PGSERVICEFILE = ''
}

foreach ($loopbackHost in @('localhost', '127.0.0.1', '::1')) {
    $validated = Assert-DemoSeedLocalPostgresEnvironment `
        -PostgresHost $loopbackHost `
        -PostgresPort 5432 `
        -Environment $cleanPostgresEnvironment

    Assert-True `
        ($validated.Host -eq $loopbackHost -and $validated.Port -eq 5432) `
        "accepts loopback PostgreSQL host $loopbackHost"
}

$validatedWithMatchingEnvironment = Assert-DemoSeedLocalPostgresEnvironment `
    -PostgresHost 'localhost' `
    -PostgresPort 5433 `
    -Environment @{
        PGHOST = 'localhost'
        PGPORT = '5433'
        PGHOSTADDR = ''
        PGSERVICE = ''
        PGSERVICEFILE = ''
    }

Assert-True `
    ($validatedWithMatchingEnvironment.Port -eq 5433) `
    'accepts matching PGHOST and PGPORT'

foreach ($remoteHost in @('10.0.0.5', 'example.com', 'localhost,127.0.0.1', '')) {
    Assert-Throws `
        { Assert-DemoSeedLocalPostgresEnvironment `
            -PostgresHost $remoteHost `
            -PostgresPort 5432 `
            -Environment $cleanPostgresEnvironment } `
        '' `
        "rejects PostgreSQL host '$remoteHost'"
}

$blockedEnvironmentCases = @(
    @{ Name = 'PGHOSTADDR'; Value = '10.0.0.5'; Pattern = 'PGHOSTADDR' },
    @{ Name = 'PGSERVICE'; Value = 'demo'; Pattern = 'PGSERVICE' },
    @{
        Name = 'PGSERVICEFILE'
        Value = '/tmp/pg_service.conf'
        Pattern = 'PGSERVICEFILE'
    },
    @{ Name = 'PGHOST'; Value = '10.0.0.5'; Pattern = 'PGHOST' },
    @{
        Name = 'PGHOST'
        Value = 'localhost,127.0.0.1'
        Pattern = 'PGHOST'
    },
    @{ Name = 'PGHOST'; Value = '127.0.0.2'; Pattern = 'PGHOST' },
    @{ Name = 'PGPORT'; Value = '6543'; Pattern = 'PGPORT' },
    @{ Name = 'PGPORT'; Value = 'not-a-port'; Pattern = 'PGPORT' }
)

foreach ($case in $blockedEnvironmentCases) {
    $blockedEnvironment = $cleanPostgresEnvironment.Clone()
    $blockedEnvironment[$case.Name] = $case.Value

    Assert-Throws `
        { Assert-DemoSeedLocalPostgresEnvironment `
            -PostgresHost '127.0.0.1' `
            -PostgresPort 5432 `
            -Environment $blockedEnvironment } `
        $case.Pattern `
        "rejects $($case.Name)=$($case.Value)"
}

# ---------------------------------------------------------------------------
# Manifest interaction distribution version
# ---------------------------------------------------------------------------

$legacyManifest = [pscustomobject]@{
    interactions = @(
        [pscustomobject]@{
            eventId = '30000000-0000-4000-8000-000000000001'
        }
    )
}

Assert-Throws `
    { Assert-DemoSeedManifestDistributionVersion `
        -Manifest $legacyManifest `
        -Mode 'Seed' } `
    'phân bố cũ' `
    'rejects legacy interaction distribution during Seed'

Assert-Throws `
    { Assert-DemoSeedManifestDistributionVersion `
        -Manifest $legacyManifest `
        -Mode 'Verify' } `
    'phân bố cũ' `
    'rejects legacy interaction distribution during Verify'

Assert-True `
    ($null -eq (Assert-DemoSeedManifestDistributionVersion `
        -Manifest $legacyManifest `
        -Mode 'Cleanup')) `
    'allows Cleanup to remove a legacy interaction distribution'

$currentManifest = [pscustomobject]@{
    interactionDistributionVersion = 2
    interactions = @(
        [pscustomobject]@{
            eventId = '30000000-0000-4000-8000-000000000001'
        }
    )
}

Assert-True `
    ($null -eq (Assert-DemoSeedManifestDistributionVersion `
        -Manifest $currentManifest `
        -Mode 'Verify')) `
    'accepts current interaction distribution version'

$emptyLegacyManifest = [pscustomobject]@{
    interactions = @()
}

Assert-True `
    ($null -eq (Assert-DemoSeedManifestDistributionVersion `
        -Manifest $emptyLegacyManifest `
        -Mode 'Seed')) `
    'accepts an empty manifest without a distribution version'

# ---------------------------------------------------------------------------
# Analytics band planning
# ---------------------------------------------------------------------------

$productionBandCounts = Get-DemoSeedInteractionBandCounts -Total 60

Assert-True ($productionBandCounts.Count -eq 4) `
    'plans four analytics bands'
Assert-True `
    (($productionBandCounts -join ',') -eq '8,12,16,24') `
    'uses 8/12/16/24 events for the 60-event dataset'

$productionCumulative = @(
    $productionBandCounts[0]
    $productionBandCounts[0] + $productionBandCounts[1]
    $productionBandCounts[0] + $productionBandCounts[1] + $productionBandCounts[2]
    ($productionBandCounts | Measure-Object -Sum).Sum
)

Assert-True `
    (($productionCumulative -join ',') -eq '8,20,36,60') `
    'produces cumulative analytics counts 8 < 20 < 36 < 60'

$smallBandCounts = Get-DemoSeedInteractionBandCounts -Total 6

Assert-True `
    ((($smallBandCounts | Measure-Object -Sum).Sum) -eq 6) `
    'allocates every small dataset event to a band'
Assert-True `
    (@($smallBandCounts | Where-Object { $_ -lt 1 }).Count -eq 0) `
    'populates every analytics band for a small dataset'

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

$latestAllowed = $fixedAnchor
$startedTimes = @()
$interactedTimes = @()

foreach ($definition in $definitions) {
    $startedAt = [DateTimeOffset]::Parse([string]$definition.startedAt)
    $interactedAt = [DateTimeOffset]::Parse([string]$definition.interactedAt)

    $startedTimes += $startedAt
    $interactedTimes += $interactedAt

    Assert-True `
        ($startedAt -ge $fixedAnchor.AddDays(-400) -and
            $startedAt -lt $latestAllowed) `
        'interaction starts within the anchored window'
    Assert-True `
        ($interactedAt -lt $latestAllowed) `
        'interaction does not occur after the anchor'
}

$earliestStarted = $startedTimes[0]

foreach ($candidate in $startedTimes) {
    if ($candidate -lt $earliestStarted) {
        $earliestStarted = $candidate
    }
}

Assert-True `
    ($earliestStarted -ge $fixedAnchor.AddDays(-400) -and
        $earliestStarted -lt $fixedAnchor.AddDays(-91)) `
    'dataset includes interactions older than 90 days'

$smallAnalyticsCounts = @(
    @($interactedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-7) -and $_ -lt $fixedAnchor
        }).Count,
    @($interactedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-30) -and $_ -lt $fixedAnchor
        }).Count,
    @($interactedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-90) -and $_ -lt $fixedAnchor
        }).Count,
    @($interactedTimes | Where-Object { $_ -lt $fixedAnchor }).Count
)

Assert-True ($smallAnalyticsCounts.Count -eq 4) `
    'computes four analytics windows for a small dataset'
Assert-True `
    (($smallAnalyticsCounts -join ',') -eq '2,3,4,6') `
    'small dataset windows increase strictly'

# ---------------------------------------------------------------------------
# Full 60-event analytics distribution
# ---------------------------------------------------------------------------

$manyArtifacts = @()
$manyArtifactIds = @{}

for ($index = 1; $index -le 20; $index++) {
    $key = "many-a$index"
    $manyArtifacts += @{ Key = $key }
    $manyArtifactIds[$key] = $index
}

$manyBeacons = @()
$manyBeaconIds = @{}

for ($index = 1; $index -le 4; $index++) {
    $key = "many-b$index"
    $manyBeacons += @{
        Key = $key
        ArtifactKey = "many-a$index"
    }
    $manyBeaconIds[$key] = 500 + $index
}

$manyDefinitions = New-DemoSeedInteractionDefinitions `
    -Artifacts $manyArtifacts `
    -Beacons $manyBeacons `
    -VisitorIds $visitorIds `
    -ArtifactIds $manyArtifactIds `
    -BeaconIds $manyBeaconIds `
    -AnchorAtUtc $fixedAnchor

Assert-True ($manyDefinitions.Count -eq 60) `
    'creates 60 interactions for 20 artifacts'
Assert-True `
    ((@($manyDefinitions.eventId | Sort-Object -Unique)).Count -eq 60) `
    'creates 60 unique event IDs'

$manyInteractedTimes = @(
    $manyDefinitions |
        ForEach-Object {
            [DateTimeOffset]::Parse([string]$_.interactedAt)
        }
)

$manyAnalyticsCounts = @(
    @($manyInteractedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-7) -and $_ -lt $fixedAnchor
        }).Count,
    @($manyInteractedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-30) -and $_ -lt $fixedAnchor
        }).Count,
    @($manyInteractedTimes |
        Where-Object {
            $_ -ge $fixedAnchor.AddDays(-90) -and $_ -lt $fixedAnchor
        }).Count,
    @($manyInteractedTimes | Where-Object { $_ -lt $fixedAnchor }).Count
)

Assert-True `
    (($manyAnalyticsCounts -join ',') -eq '8,20,36,60') `
    '60-event dataset spans strict 7/30/90/all-time windows'
Assert-True `
    (@($manyInteractedTimes | Where-Object { $_ -ge $fixedAnchor }).Count -eq 0) `
    '60-event dataset contains no future interactions'

Write-Host "PASS: $($script:Passed) seed helper assertions."
