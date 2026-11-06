import { useEffect, useRef, useState } from 'react'
import {
  getInteractionSummary,
  type AnalyticsRange,
  type InteractionSummary,
} from '../services/analyticsService'
import { ApiError } from '../services/apiClient'

type StatIconType = 'interactions' | 'visitors' | 'views' | 'artifact'

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

function StatIcon({ type }: { type: StatIconType }) {
  if (type === 'interactions')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 5h16v12H9l-5 4V5Z" />
        <path d="M8 9h8m-8 4h5" />
      </svg>
    )

  if (type === 'visitors')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 0 1 0 7M18 20c0-2.6-1.1-4.7-2.7-6" />
      </svg>
    )

  if (type === 'views')
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 9h16m-10 4h4" />
    </svg>
  )
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value)
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  return 'Unable to load interaction analytics. Please try again.'
}

function DashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('all')
  const [retryCount, setRetryCount] = useState(0)
  const [summary, setSummary] = useState<InteractionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inFlightRequest = useRef<{
    key: string
    promise: Promise<InteractionSummary>
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    const key = `${range}:${retryCount}`

    let request = inFlightRequest.current
    if (!request || request.key !== key) {
      request = { key, promise: getInteractionSummary(range) }
      inFlightRequest.current = request
    }

    request.promise
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setSummary(null)
          setError(errorMessage(caught))
        }
      })
      .finally(() => {
        if (inFlightRequest.current === request) {
          inFlightRequest.current = null
        }
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [range, retryCount])

  function handleRangeChange(nextRange: AnalyticsRange) {
    setIsLoading(true)
    setError(null)
    setRange(nextRange)
  }

  function handleRetry() {
    setIsLoading(true)
    setError(null)
    setRetryCount((count) => count + 1)
  }

  const viewCount =
    summary?.interactionTypes.find((item) => item.interactionType === 'VIEW')
      ?.count ?? 0
  const topArtifact = summary?.popularArtifacts[0]

  const stats = [
    {
      number: summary ? formatNumber(summary.totalInteractions) : '—',
      label: 'Total Interactions',
      note: 'Recorded visitor events',
      icon: 'interactions' as const,
    },
    {
      number: summary ? formatNumber(summary.uniqueVisitors) : '—',
      label: 'Unique Visitors',
      note: 'Distinct visitor IDs',
      icon: 'visitors' as const,
    },
    {
      number: summary ? formatNumber(viewCount) : '—',
      label: 'Artifact Views',
      note: 'VIEW interaction events',
      icon: 'views' as const,
    },
    {
      number: topArtifact?.artifactName ?? '—',
      label: 'Most Viewed Artifact',
      note: topArtifact
        ? `${formatNumber(topArtifact.interactionCount)} interactions`
        : 'No interactions yet',
      icon: 'artifact' as const,
    },
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-toolbar">
        <div>
          <h2 className="dashboard-toolbar__title">Visitor Analytics</h2>
          <p className="dashboard-toolbar__subtitle">
            Recorded interactions and artifact popularity
          </p>
        </div>
        <label className="dashboard-range">
          <span>Reporting period</span>
          <select
            value={range}
            onChange={(event) =>
              handleRangeChange(event.target.value as AnalyticsRange)
            }
            disabled={isLoading}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="analytics-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={handleRetry}>
            Try again
          </button>
        </div>
      ) : null}

      <section className="dashboard-stats" aria-label="Interaction statistics">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <div>
              <p className="stat-card__number">
                {isLoading ? '…' : stat.number}
              </p>
              <p className="stat-card__label">{stat.label}</p>
              <p className="stat-card__note">
                {isLoading ? 'Loading analytics' : stat.note}
              </p>
            </div>

            <span className="stat-card__icon">
              <StatIcon type={stat.icon} />
            </span>
          </article>
        ))}
      </section>

      <section className="dashboard-charts">
        <article className="panel">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Interaction Types</h2>
              <p className="panel__subtitle">Events by interaction type</p>
            </div>
            <span className="panel__badge">
              {summary ? formatNumber(summary.totalInteractions) : '—'}
            </span>
          </div>

          <div className="interaction-chart">
            {isLoading ? (
              <div className="empty-state" role="status">
                Loading interaction types…
              </div>
            ) : summary?.interactionTypes.length ? (
              summary.interactionTypes.map((item, index) => {
                const max = Math.max(
                  ...summary.interactionTypes.map((entry) => entry.count),
                  1,
                )
                const height = Math.max((item.count / max) * 100, 6)

                return (
                  <div className="interaction-bar" key={item.interactionType}>
                    <span className="interaction-bar__value">
                      {formatNumber(item.count)}
                    </span>
                    <span
                      className={
                        index === 0
                          ? 'interaction-bar__fill'
                          : 'interaction-bar__fill interaction-bar__fill--muted'
                      }
                      style={{ height: `${height}%` }}
                    />
                    <span className="interaction-bar__label">
                      {item.interactionType.replaceAll('_', ' ')}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">No interactions recorded yet</div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Popular Artifacts</h2>
              <p className="panel__subtitle">Top artifacts by interaction count</p>
            </div>
            <span className="panel__badge">
              {summary ? summary.popularArtifacts.length : '—'}
            </span>
          </div>

          <div className="popular-artifacts">
            {isLoading ? (
              <div className="empty-state" role="status">
                Loading popular artifacts…
              </div>
            ) : summary?.popularArtifacts.length ? (
              <ol className="popular-artifacts__list">
                {summary.popularArtifacts.map((item, index) => (
                  <li key={item.artifactId}>
                    <span className="popular-artifacts__rank">{index + 1}</span>
                    <span className="popular-artifacts__name">
                      {item.artifactName}
                    </span>
                    <span className="popular-artifacts__count">
                      {formatNumber(item.interactionCount)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state">No artifact interactions yet</div>
            )}
          </div>
        </article>
      </section>

      <p className="analytics-footnote">
        Metrics come from recorded visitor interactions. Beacon activity,
        favorites, and feedback are not included because no backend data source
        currently exists for them.
      </p>
    </div>
  )
}

export default DashboardPage
