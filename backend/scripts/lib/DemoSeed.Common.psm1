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
    $baseTime = $AnchorAtUtc.ToUniversalTime().AddDays(-8)
    $eventNumber = 0

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
            $eventNumber++

            $start = $baseTime.AddDays(
                ($eventNumber - 1) % 8
            ).AddMinutes(15 * $eventNumber)

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

    $expectedInteractionCount = @($Artifacts).Count * 3

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
    'New-DemoSeedInteractionDefinitions'
)
