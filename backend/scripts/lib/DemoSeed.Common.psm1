Set-StrictMode -Version Latest

function Resolve-DemoSeedBaseUrl {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$BaseUrl
    )

    $candidate = $BaseUrl.Trim()

    if ([string]::IsNullOrWhiteSpace($candidate)) {
        throw 'BaseUrl không được để trống.'
    }

    $uri = $null

    if (-not [System.Uri]::TryCreate(
        $candidate,
        [System.UriKind]::Absolute,
        [ref]$uri
    )) {
        throw 'BaseUrl không phải URL tuyệt đối hợp lệ.'
    }

    if ($uri.Scheme -notin @('http', 'https')) {
        throw 'BaseUrl chỉ hỗ trợ giao thức http hoặc https.'
    }

    if (-not [string]::IsNullOrEmpty($uri.UserInfo)) {
        throw 'BaseUrl không được chứa thông tin đăng nhập.'
    }

    if (
        -not [string]::IsNullOrEmpty($uri.Query) -or
        -not [string]::IsNullOrEmpty($uri.Fragment)
    ) {
        throw 'BaseUrl không được chứa query string hoặc fragment.'
    }

    if ($uri.AbsolutePath -ne '/') {
        throw 'BaseUrl chỉ được trỏ tới gốc máy chủ.'
    }

    $hostName = $uri.IdnHost.ToLowerInvariant()
    $allowedHosts = @('localhost', '127.0.0.1', '::1')

    if ($allowedHosts -notcontains $hostName) {
        throw (
            'BaseUrl chỉ được trỏ tới loopback: ' +
            'localhost, 127.0.0.1 hoặc ::1.'
        )
    }

    return $candidate.TrimEnd('/')
}

function Resolve-DemoSeedInteractionAnchor {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$Manifest,

        [Parameter(Mandatory)]
        [DateTimeOffset]$Now
    )

    $anchorValue = $null
    $hasAnchor = $false

    if ($Manifest -is [System.Collections.IDictionary]) {
        if ($Manifest.Contains('interactionAnchorAtUtc')) {
            $hasAnchor = $true
            $anchorValue = $Manifest['interactionAnchorAtUtc']
        }
    }
    elseif ($null -ne $Manifest) {
        $anchorProperty = $Manifest.PSObject.Properties[
            'interactionAnchorAtUtc'
        ]

        if ($null -ne $anchorProperty) {
            $hasAnchor = $true
            $anchorValue = $anchorProperty.Value
        }
    }

    if (
        $hasAnchor -and
        -not [string]::IsNullOrWhiteSpace([string]$anchorValue)
    ) {
        $storedAnchor = [DateTimeOffset]::MinValue

        if (-not [DateTimeOffset]::TryParse(
            [string]$anchorValue,
            [ref]$storedAnchor
        )) {
            throw 'interactionAnchorAtUtc trong manifest không hợp lệ.'
        }

        return $storedAnchor.ToUniversalTime()
    }

    $earliestStart = $null
    $manifestInteractions = @()

    if ($Manifest -is [System.Collections.IDictionary]) {
        if ($Manifest.Contains('interactions')) {
            $manifestInteractions = @($Manifest['interactions'])
        }
    }
    elseif ($null -ne $Manifest) {
        $manifestInteractions = @($Manifest.interactions)
    }

    if ($manifestInteractions.Count -gt 0) {
        foreach ($entry in $manifestInteractions) {
            $startedAt = [DateTimeOffset]::MinValue

            if (-not [DateTimeOffset]::TryParse(
                [string]$entry.startedAt,
                [ref]$startedAt
            )) {
                continue
            }

            if (
                $null -eq $earliestStart -or
                $startedAt -lt $earliestStart
            ) {
                $earliestStart = $startedAt
            }
        }
    }

    if ($null -ne $earliestStart) {
        return $earliestStart.AddDays(8).AddMinutes(-15).ToUniversalTime()
    }

    return $Now.ToUniversalTime()
}

function Assert-DemoSeedLocalPostgresEnvironment {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$PostgresHost,

        [Parameter(Mandatory)]
        [int]$PostgresPort,

        [System.Collections.IDictionary]$Environment
    )

    $allowedHosts = @('localhost', '127.0.0.1', '::1')

    $normalizedHost = $PostgresHost.Trim().ToLowerInvariant()

    if ([string]::IsNullOrWhiteSpace($normalizedHost)) {
        throw 'PostgresHost không được để trống.'
    }

    if ($normalizedHost.Contains(',')) {
        throw 'PostgresHost không được chứa nhiều máy chủ.'
    }

    if ($allowedHosts -notcontains $normalizedHost) {
        throw (
            'PostgresMode Local chỉ hỗ trợ host loopback: ' +
            'localhost, 127.0.0.1 hoặc ::1.'
        )
    }

    if ($PostgresPort -lt 1 -or $PostgresPort -gt 65535) {
        throw 'PostgresPort phải nằm trong khoảng 1-65535.'
    }

    function Get-EnvironmentValue {
        param([Parameter(Mandatory)][string]$Name)

        if ($null -ne $Environment -and $Environment.Contains($Name)) {
            return [string]$Environment[$Name]
        }

        return [string][Environment]::GetEnvironmentVariable($Name)
    }

    foreach ($blockedName in @('PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE')) {
        if (-not [string]::IsNullOrWhiteSpace(
            (Get-EnvironmentValue -Name $blockedName)
        )) {
            throw (
                "$blockedName phải được bỏ trống khi dùng " +
                'PostgresMode Local.'
            )
        }
    }

    $pgHost = Get-EnvironmentValue -Name 'PGHOST'

    if (-not [string]::IsNullOrWhiteSpace($pgHost)) {
        $pgHosts = @(
            $pgHost -split ',' |
                ForEach-Object { $_.Trim() } |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        )

        if ($pgHosts.Count -ne 1) {
            throw 'PGHOST không được chứa nhiều máy chủ.'
        }

        $normalizedPgHost = $pgHosts[0].ToLowerInvariant()

        if ($allowedHosts -notcontains $normalizedPgHost) {
            throw 'PGHOST phải là host loopback.'
        }

        if ($normalizedPgHost -ne $normalizedHost) {
            throw 'PGHOST phải khớp với PostgresHost.'
        }
    }

    $pgPort = Get-EnvironmentValue -Name 'PGPORT'

    if (-not [string]::IsNullOrWhiteSpace($pgPort)) {
        $parsedPgPort = 0

        if (-not [int]::TryParse($pgPort, [ref]$parsedPgPort)) {
            throw 'PGPORT không hợp lệ.'
        }

        if ($parsedPgPort -ne $PostgresPort) {
            throw 'PGPORT phải khớp với PostgresPort.'
        }
    }

    return [pscustomobject]@{
        Host = $normalizedHost
        Port = $PostgresPort
    }
}

function Assert-DemoSeedManifestDistributionVersion {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [object]$Manifest,

        [Parameter(Mandatory)]
        [ValidateSet('Seed', 'Verify', 'Cleanup')]
        [string]$Mode
    )

    if ($null -eq $Manifest -or $Mode -eq 'Cleanup') {
        return
    }

    $interactions = @()
    $version = $null

    if ($Manifest -is [System.Collections.IDictionary]) {
        if ($Manifest.Contains('interactions')) {
            $interactions = @(
                $Manifest['interactions'] |
                    Where-Object { $null -ne $_ }
            )
        }

        if ($Manifest.Contains('interactionDistributionVersion')) {
            $version = $Manifest['interactionDistributionVersion']
        }
    }
    else {
        $interactionsProperty = $Manifest.PSObject.Properties[
            'interactions'
        ]

        if ($null -ne $interactionsProperty) {
            $interactions = @(
                $interactionsProperty.Value |
                    Where-Object { $null -ne $_ }
            )
        }

        $versionProperty = $Manifest.PSObject.Properties[
            'interactionDistributionVersion'
        ]

        if ($null -ne $versionProperty) {
            $version = $versionProperty.Value
        }
    }

    if ($interactions.Count -eq 0) {
        return
    }

    $parsedVersion = 0

    if (
        -not [int]::TryParse([string]$version, [ref]$parsedVersion) -or
        $parsedVersion -ne 2
    ) {
        throw (
            'Manifest chứa interaction theo phân bố cũ. ' +
            'Chạy -Cleanup -Force để xóa dữ liệu seed cũ, ' +
            'sau đó chạy -Seed lại trên database demo/disposable. ' +
            'Không chạy trên database có dữ liệu thật.'
        )
    }
}

function Get-DemoSeedInteractionBandCounts {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [int]$Total
    )

    $bandTotal = 4
    $weights = @(8, 12, 16, 24)

    if ($Total -le 0) {
        return ,@(0, 0, 0, 0)
    }

    if ($Total -eq 60) {
        return ,@(8, 12, 16, 24)
    }

    if ($Total -lt $bandTotal) {
        $smallCounts = @()

        for ($index = 0; $index -lt $bandTotal; $index++) {
            $smallCounts += [int]($index -lt $Total)
        }

        return ,$smallCounts
    }

    $weightTotal = 0

    foreach ($weight in $weights) {
        $weightTotal += $weight
    }

    $counts = @()
    $remainders = @()
    $allocated = 0

    for ($index = 0; $index -lt $bandTotal; $index++) {
        $exact = ($Total * $weights[$index]) / $weightTotal
        $floor = [int][Math]::Floor($exact)

        if ($floor -lt 1) {
            $floor = 1
        }

        $counts += $floor
        $remainders += ($exact - [Math]::Floor($exact))
        $allocated += $floor
    }

    while ($allocated -gt $Total) {
        $largestIndex = 0

        for ($index = 1; $index -lt $bandTotal; $index++) {
            if ($counts[$index] -gt $counts[$largestIndex]) {
                $largestIndex = $index
            }
        }

        $counts[$largestIndex]--
        $allocated--
    }

    while ($allocated -lt $Total) {
        $bestIndex = 0

        for ($index = 1; $index -lt $bandTotal; $index++) {
            if ($remainders[$index] -gt $remainders[$bestIndex]) {
                $bestIndex = $index
            }
        }

        $counts[$bestIndex]++
        $remainders[$bestIndex] -= 1
        $allocated++
    }

    return ,$counts
}

function New-DemoSeedInteractionDefinitions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [object[]]$Artifacts,

        [Parameter(Mandatory)]
        [object[]]$Beacons,

        [Parameter(Mandatory)]
        [string[]]$VisitorIds,

        [Parameter(Mandatory)]
        [hashtable]$ArtifactIds,

        [Parameter(Mandatory)]
        [hashtable]$BeaconIds,

        [Parameter(Mandatory)]
        [DateTimeOffset]$AnchorAtUtc
    )

    $definitions = @()
    $anchor = $AnchorAtUtc.ToUniversalTime()
    $eventNumber = 0
    $expectedInteractionCount = @($Artifacts).Count * 3

    if (@($VisitorIds).Count -eq 0) {
        throw 'VisitorIds không được để trống.'
    }

    $bandCounts = Get-DemoSeedInteractionBandCounts `
        -Total $expectedInteractionCount

    $bandRanges = @(
        @{ MinDaysAgo = 1; MaxDaysAgo = 6 },
        @{ MinDaysAgo = 8; MaxDaysAgo = 29 },
        @{ MinDaysAgo = 31; MaxDaysAgo = 89 },
        @{ MinDaysAgo = 91; MaxDaysAgo = 400 }
    )

    $eventBands = @()
    $bandPositions = @(0, 0, 0, 0)

    for ($bandIndex = 0; $bandIndex -lt $bandRanges.Count; $bandIndex++) {
        for ($position = 0; $position -lt $bandCounts[$bandIndex]; $position++) {
            $eventBands += $bandIndex
        }
    }

    $orderedArtifacts = @(
        $Artifacts |
            Sort-Object {
                [int]$ArtifactIds[$_.Key]
            }
    )

    foreach ($artifact in $orderedArtifacts) {
        $artifactId = [int]$ArtifactIds[$artifact.Key]

        $beacon = @(
            $Beacons |
                Where-Object {
                    $_.ArtifactKey -eq $artifact.Key
                }
        )

        $beaconId = $null

        if ($beacon.Count -eq 1) {
            $beaconId = [int]$BeaconIds[$beacon[0].Key]
        }

        $types = @('VIEW', 'SCAN')

        if ($null -ne $beaconId) {
            $types += 'BEACON_TRIGGER'
        }
        else {
            $types += 'AUDIO_PLAY'
        }

        foreach ($type in $types) {
            $eventIndex = $eventNumber
            $eventNumber++

            $bandIndex = [int]$eventBands[$eventIndex]
            $bandRange = $bandRanges[$bandIndex]
            $bandCount = [int]$bandCounts[$bandIndex]
            $position = [int]$bandPositions[$bandIndex]
            $bandPositions[$bandIndex] = $position + 1

            $span = $bandRange.MaxDaysAgo - $bandRange.MinDaysAgo + 1
            $daysAgo = $bandRange.MinDaysAgo + [int][Math]::Floor(
                (($position * $span) / [double]$bandCount)
            )

            $minuteOffset = (($eventIndex * 37) % 720) + 5
            $start = $anchor.AddDays(-$daysAgo).AddMinutes($minuteOffset)
            $start = $start.AddTicks(-($start.Ticks % 10))

            $end = $start.AddSeconds(90)

            $eventId = [guid]::Parse(
                ('30000000-0000-4000-8000-{0:D12}' -f $eventNumber)
            ).ToString()

            $item = [ordered]@{
                eventId = $eventId

                visitorId = $VisitorIds[
                    ($eventNumber - 1) % $VisitorIds.Count
                ]

                artifactId = $artifactId
                interactionType = $type

                languageCode = @('vi', 'en')[
                    ($eventNumber - 1) % 2
                ]

                startedAt = $start.ToString('o')
                endedAt = $end.ToString('o')
                interactedAt = $end.ToString('o')
            }

            if ($type -eq 'BEACON_TRIGGER') {
                $item.beaconId = $beaconId
            }

            $definitions += [pscustomobject]$item
        }
    }

    if ($definitions.Count -ne $expectedInteractionCount) {
        throw (
            "Expected $expectedInteractionCount interactions, " +
            "got $($definitions.Count)."
        )
    }

    return ,$definitions
}

Export-ModuleMember -Function @(
    'Resolve-DemoSeedBaseUrl',
    'Resolve-DemoSeedInteractionAnchor',
    'Assert-DemoSeedLocalPostgresEnvironment',
    'Assert-DemoSeedManifestDistributionVersion',
    'Get-DemoSeedInteractionBandCounts',
    'New-DemoSeedInteractionDefinitions'
)
