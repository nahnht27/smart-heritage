import { useEffect, useRef, useState, useId } from 'react'
import { ApiError } from '../services/apiClient'
import { getInteractionSummary } from '../services/analyticsService'
import type {
  InteractionSummary,
  InteractionTypeCount,
  PopularArtifact,
} from '../types/analytics'
import './DashboardPage.css'

type PresetRange = '7d' | '30d' | '90d' | 'all' | 'custom'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_RANGE_DAYS = 90
const MAX_RANGE_MS = MAX_RANGE_DAYS * MS_PER_DAY

// The API range is [from, to): `to` is exclusive. The UI works with whole
// calendar days (UTC) where both the start and end day are inclusive, so the
// end day is converted to the exclusive instant "start of the next day".
function toRangeParams(
  startDate: string,
  endDate: string,
): { from: string; to: string } {
  const endExclusive = new Date(`${endDate}T00:00:00Z`)
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  return {
    from: `${startDate}T00:00:00Z`,
    to: `${formatUtcDateInput(endExclusive)}T00:00:00Z`,
  }
}

// Inverse of the conversion above, used to show the inclusive end day.
function formatInclusiveEnd(exclusiveEndIso: string | null): string {
  if (!exclusiveEndIso) return 'All recorded history'
  const end = new Date(exclusiveEndIso)
  if (isNaN(end.getTime())) return exclusiveEndIso
  return formatDisplayDate(new Date(end.getTime() - MS_PER_DAY).toISOString())
}

function formatUtcDateInput(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDisplayDate(isoString: string | null): string {
  if (!isoString) return 'All recorded history'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isoString
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return isoString
  }
}

function getPresetBounds(preset: PresetRange): {
  from?: string
  to?: string
  startDateInput: string
  endDateInput: string
} {
  const now = new Date()
  const todayStr = formatUtcDateInput(now)

  if (preset === 'all') {
    return {
      from: undefined,
      to: undefined,
      startDateInput: '',
      endDateInput: '',
    }
  }

  // "Last N days" = N calendar days ending today (today included).
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const first = new Date(now.getTime() - (days - 1) * MS_PER_DAY)
  const firstStr = formatUtcDateInput(first)

  return {
    ...toRangeParams(firstStr, todayStr),
    startDateInput: firstStr,
    endDateInput: todayStr,
  }
}

function validateCustomRange(fromStr: string, toStr: string): string | null {
  if (!fromStr || !toStr) {
    return 'Please select both a start date and an end date.'
  }

  const fromDate = new Date(`${fromStr}T00:00:00Z`)
  const toDate = new Date(`${toStr}T00:00:00Z`)

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return 'Invalid date format selected.'
  }

  if (fromDate > toDate) {
    return 'Start date must not be later than end date.'
  }

  // Both days are inclusive, so the span covers one more day than the gap.
  const spanMs = toDate.getTime() - fromDate.getTime() + MS_PER_DAY
  if (spanMs > MAX_RANGE_MS) {
    return `Date range cannot exceed ${MAX_RANGE_DAYS} days.`
  }

  return null
}

function KpiIcon({ type }: { type: 'interactions' | 'visitors' | 'rate' | 'top' }) {
  if (type === 'interactions') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'visitors') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (type === 'rate') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18M7 14l4-4 4 4 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getTypeClass(type: string): string {
  const upper = type.toUpperCase()
  if (upper === 'VIEW') return 'view'
  if (upper === 'AUDIO_PLAY') return 'audio'
  if (upper === 'SCAN' || upper === 'BEACON_TRIGGER') return 'scan'
  return 'other'
}

function getTypeLabel(type: string): string {
  const upper = type.toUpperCase()
  if (upper === 'VIEW') return 'Artifact Views'
  if (upper === 'AUDIO_PLAY') return 'Audio Plays'
  if (upper === 'SCAN') return 'QR/Beacon Scans'
  if (upper === 'BEACON_TRIGGER') return 'Beacon Triggers'
  return type
}

type UiIconName = 'view' | 'audio' | 'scan' | 'other' | 'warning' | 'forbidden'

function UiIcon({ name, size = 16 }: { name: UiIconName; size?: number }) {
  return (
    <svg
      className="ui-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'view' && (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
      {name === 'audio' && (
        <>
          <path d="M3 18v-6a9 9 0 0118 0v6" />
          <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z" />
        </>
      )}
      {name === 'scan' && (
        <>
          <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
          <path d="M7 12h10" />
        </>
      )}
      {name === 'other' && <circle cx="12" cy="12" r="3" />}
      {name === 'warning' && (
        <>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </>
      )}
      {name === 'forbidden' && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M4.93 4.93l14.14 14.14" />
        </>
      )}
    </svg>
  )
}

function getTypeIconName(type: string): UiIconName {
  const upper = type.toUpperCase()
  if (upper === 'VIEW') return 'view'
  if (upper === 'AUDIO_PLAY') return 'audio'
  if (upper === 'SCAN' || upper === 'BEACON_TRIGGER') return 'scan'
  return 'other'
}

export default function DashboardPage() {
  const fromInputId = useId()
  const toInputId = useId()
  const [summary, setSummary] = useState<InteractionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isForbidden, setIsForbidden] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const inFlightRequest = useRef<{
    key: string
    promise: Promise<InteractionSummary>
  } | null>(null)

  // Filter state
  const [preset, setPreset] = useState<PresetRange>('30d')
  const [startDateInput, setStartDateInput] = useState(() => getPresetBounds('30d').startDateInput)
  const [endDateInput, setEndDateInput] = useState(() => getPresetBounds('30d').endDateInput)
  const [dateError, setDateError] = useState<string | null>(null)

  // Active query parameters applied
  const [activeParams, setActiveParams] = useState<{ from?: string; to?: string }>(() => {
    const bounds = getPresetBounds('30d')
    return { from: bounds.from, to: bounds.to }
  })

  useEffect(() => {
    let cancelled = false
    const requestKey = [
      activeParams.from ?? '',
      activeParams.to ?? '',
      reloadKey,
    ].join('|')

    let request = inFlightRequest.current
    if (!request || request.key !== requestKey) {
      request = {
        key: requestKey,
        promise: getInteractionSummary(activeParams),
      }
      inFlightRequest.current = request
    }

    request.promise
      .then((data) => {
        if (!cancelled) {
          setSummary(data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 403) {
            setIsForbidden(true)
            setError(
              'Access denied. You do not have administrator permissions to view analytics reports.',
            )
          } else if (err instanceof Error) {
            setError(err.message || 'Unable to retrieve interaction analytics.')
          } else {
            setError('An unexpected error occurred while loading analytics.')
          }
        }
      })
      .finally(() => {
        if (inFlightRequest.current === request) {
          inFlightRequest.current = null
        }
        if (!cancelled) {
          setLoading(false)
          setRefreshing(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeParams, reloadKey])

  const handleSelectPreset = (nextPreset: PresetRange) => {
    setPreset(nextPreset)
    setDateError(null)
    setError(null)
    setIsForbidden(false)

    if (nextPreset === 'custom') {
      return
    }

    const bounds = getPresetBounds(nextPreset)
    setStartDateInput(bounds.startDateInput)
    setEndDateInput(bounds.endDateInput)
    setLoading(true)
    setActiveParams({ from: bounds.from, to: bounds.to })
  }

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateCustomRange(startDateInput, endDateInput)
    if (validationError) {
      setDateError(validationError)
      return
    }

    setDateError(null)
    setPreset('custom')
    setLoading(true)
    setError(null)
    setIsForbidden(false)
    setActiveParams(toRangeParams(startDateInput, endDateInput))
  }

  const handleResetFilter = () => {
    handleSelectPreset('30d')
  }

  const handleRefresh = () => {
    setRefreshing(true)
    setError(null)
    setIsForbidden(false)
    setReloadKey((key) => key + 1)
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setIsForbidden(false)
    setReloadKey((key) => key + 1)
  }

  // Derived calculations
  const totalInteractions = summary?.totalInteractions ?? 0
  const uniqueVisitors = summary?.uniqueVisitors ?? 0
  const avgInteractionsPerVisitor =
    uniqueVisitors > 0 ? (totalInteractions / uniqueVisitors).toFixed(1) : '0'

  const interactionTypes: InteractionTypeCount[] = summary?.interactionTypes ?? []
  const popularArtifacts: PopularArtifact[] = summary?.popularArtifacts ?? []

  const topType =
    interactionTypes.length > 0
      ? [...interactionTypes].sort((a, b) => b.count - a.count)[0]
      : null

  const topTypePercentage =
    totalInteractions > 0 && topType
      ? Math.round((topType.count / totalInteractions) * 100)
      : 0

  const maxArtifactCount =
    popularArtifacts.length > 0
      ? Math.max(...popularArtifacts.map((a) => a.interactionCount))
      : 0

  // Date range display label
  const periodLabel =
    activeParams.from && activeParams.to
      ? `${formatDisplayDate(activeParams.from)} – ${formatInclusiveEnd(activeParams.to)} (UTC)`
      : summary?.from && summary?.to
        ? `${formatDisplayDate(summary.from)} – ${formatInclusiveEnd(summary.to)} (UTC)`
        : 'All recorded history'

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <header className="analytics-header">
        <div>
          <p className="analytics-eyebrow">Visitor Analytics</p>
          <h1 className="analytics-title">Overview & Engagement</h1>
          <p className="analytics-subtitle">
            <span>Period:</span>
            <strong>{periodLabel}</strong>
          </p>
        </div>

        <div className="analytics-header-actions">
          <button
            type="button"
            className="refresh-button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh analytics data"
          >
            <svg
              className={`refresh-icon ${refreshing ? 'refresh-icon--spinning' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {/* Date Filter Card */}
      <section className="filter-card" aria-label="Date range filters">
        <div className="filter-row">
          <div className="filter-presets">
            <span className="filter-label">Range:</span>
            <button
              type="button"
              className={`preset-chip ${preset === '7d' ? 'preset-chip--active' : ''}`}
              onClick={() => handleSelectPreset('7d')}
              disabled={loading || refreshing}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`preset-chip ${preset === '30d' ? 'preset-chip--active' : ''}`}
              onClick={() => handleSelectPreset('30d')}
              disabled={loading || refreshing}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className={`preset-chip ${preset === '90d' ? 'preset-chip--active' : ''}`}
              onClick={() => handleSelectPreset('90d')}
              disabled={loading || refreshing}
            >
              Last 90 Days
            </button>
            <button
              type="button"
              className={`preset-chip ${preset === 'all' ? 'preset-chip--active' : ''}`}
              onClick={() => handleSelectPreset('all')}
              disabled={loading || refreshing}
            >
              All Time
            </button>
          </div>

          <form className="custom-range-inputs" onSubmit={handleApplyCustomRange}>
            <label htmlFor={fromInputId} className="date-field">
              <span>From:</span>
              <input
                id={fromInputId}
                type="date"
                className="date-input"
                value={startDateInput}
                onChange={(e) => {
                  setStartDateInput(e.target.value)
                  setDateError(null)
                  setPreset('custom')
                }}
                disabled={loading || refreshing}
                aria-label="Start date"
              />
            </label>

            <label htmlFor={toInputId} className="date-field">
              <span>To:</span>
              <input
                id={toInputId}
                type="date"
                className="date-input"
                value={endDateInput}
                onChange={(e) => {
                  setEndDateInput(e.target.value)
                  setDateError(null)
                  setPreset('custom')
                }}
                disabled={loading || refreshing}
                aria-label="End date"
              />
            </label>

            <button
              type="submit"
              className="date-apply-button"
              disabled={loading || refreshing || !startDateInput || !endDateInput}
            >
              Apply
            </button>

            {preset !== '30d' && (
              <button
                type="button"
                className="date-reset-button"
                onClick={handleResetFilter}
                disabled={loading || refreshing}
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {dateError && (
          <p className="filter-error-message" role="alert">
            <UiIcon name="warning" size={14} /> {dateError}
          </p>
        )}
      </section>

      {/* Error / Forbidden Alert */}
      {error && (
        <section
          className="analytics-alert analytics-alert--error"
          role="alert"
          aria-live="assertive"
        >
          <div className="analytics-alert__content">
            <span className="analytics-alert__icon" aria-hidden="true">
              <UiIcon name={isForbidden ? 'forbidden' : 'warning'} size={20} />
            </span>
            <div>
              <strong>{isForbidden ? 'Access Denied' : 'Error Loading Analytics'}</strong>
              <p style={{ margin: '2px 0 0' }}>{error}</p>
            </div>
          </div>

          {!isForbidden && (
            <button
              type="button"
              className="analytics-retry-button"
              onClick={handleRetry}
              disabled={loading || refreshing}
            >
              Retry
            </button>
          )}
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && !summary && (
        <>
          <section className="analytics-kpis" aria-label="Loading KPIs">
            <div className="kpi-card skeleton skeleton-card" />
            <div className="kpi-card skeleton skeleton-card" />
            <div className="kpi-card skeleton skeleton-card" />
            <div className="kpi-card skeleton skeleton-card" />
          </section>

          <section className="analytics-panels-grid" aria-label="Loading panels">
            <div className="analytics-panel skeleton skeleton-panel" />
            <div className="analytics-panel skeleton skeleton-panel" />
          </section>
        </>
      )}

      {/* Analytics Content */}
      {summary && (
        <>
          {/* KPI Cards */}
          <section className="analytics-kpis" aria-label="Key Performance Indicators">
            <article className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-label">Total Interactions</span>
                <span className="kpi-value">{totalInteractions.toLocaleString()}</span>
                <span className="kpi-note">Recorded visitor actions</span>
              </div>
              <div className="kpi-icon-wrapper kpi-icon-wrapper--primary" aria-hidden="true">
                <KpiIcon type="interactions" />
              </div>
            </article>

            <article className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-label">Unique Visitors</span>
                <span className="kpi-value">{uniqueVisitors.toLocaleString()}</span>
                <span className="kpi-note">Distinct visitors active</span>
              </div>
              <div className="kpi-icon-wrapper kpi-icon-wrapper--success" aria-hidden="true">
                <KpiIcon type="visitors" />
              </div>
            </article>

            <article className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-label">Avg. Engagement</span>
                <span className="kpi-value">{avgInteractionsPerVisitor}</span>
                <span className="kpi-note">Interactions per visitor</span>
              </div>
              <div className="kpi-icon-wrapper kpi-icon-wrapper--info" aria-hidden="true">
                <KpiIcon type="rate" />
              </div>
            </article>

            <article className="kpi-card">
              <div className="kpi-content">
                <span className="kpi-label">Top Interaction</span>
                <span className="kpi-value" style={{ fontSize: '20px' }}>
                  {topType ? `${topType.interactionType} (${topTypePercentage}%)` : 'None'}
                </span>
                <span className="kpi-note">
                  {topType ? `${topType.count.toLocaleString()} actions recorded` : 'No interactions'}
                </span>
              </div>
              <div className="kpi-icon-wrapper kpi-icon-wrapper--amber" aria-hidden="true">
                <KpiIcon type="top" />
              </div>
            </article>
          </section>

          {/* Main Visualizations Grid */}
          <section className="analytics-panels-grid">
            {/* Interaction Breakdown Panel */}
            <article className="analytics-panel">
              <header className="analytics-panel__header">
                <div className="analytics-panel__title-group">
                  <h2>Interaction Breakdown</h2>
                  <p>Distribution across VIEW, AUDIO_PLAY, SCAN, and BEACON_TRIGGER events</p>
                </div>
                <span className="analytics-panel__badge">
                  {interactionTypes.length} {interactionTypes.length === 1 ? 'type' : 'types'}
                </span>
              </header>

              <div className="analytics-panel__body">
                {totalInteractions === 0 || interactionTypes.length === 0 ? (
                  <div className="analytics-empty-state">
                    <svg
                      className="analytics-empty-state__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 20v-6m0-4V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3>No interaction records</h3>
                    <p>No visitor interactions were recorded during the selected date range.</p>
                  </div>
                ) : (
                  <>
                    {/* Stacked bar visualization */}
                    <div
                      className="breakdown-stacked-bar"
                      role="img"
                      aria-label="Stacked interaction distribution chart"
                    >
                      {interactionTypes.map((item) => {
                        const pct = Math.max(
                          2,
                          Math.round((item.count / totalInteractions) * 100),
                        )
                        return (
                          <div
                            key={item.interactionType}
                            className={`stacked-segment stacked-segment--${getTypeClass(item.interactionType)}`}
                            style={{ width: `${pct}%` }}
                            title={`${item.interactionType}: ${item.count} (${pct}%)`}
                          />
                        )
                      })}
                    </div>

                    {/* Breakdown list */}
                    <div className="breakdown-list">
                      {interactionTypes.map((item) => {
                        const pct =
                          totalInteractions > 0
                            ? Math.round((item.count / totalInteractions) * 100)
                            : 0
                        const typeClass = getTypeClass(item.interactionType)
                        return (
                          <div key={item.interactionType} className="breakdown-item">
                            <div className="breakdown-item__header">
                              <span className="breakdown-item__type">
                                <span className={`type-indicator-dot type-indicator-dot--${typeClass}`} />
                                <UiIcon name={getTypeIconName(item.interactionType)} />
                                <strong>{getTypeLabel(item.interactionType)}</strong>
                              </span>

                              <div className="breakdown-item__stats">
                                <span className="breakdown-count">
                                  {item.count.toLocaleString()}
                                </span>
                                <span className="breakdown-percent">{pct}%</span>
                              </div>
                            </div>

                            <div className="breakdown-item__bar-container">
                              <div
                                className={`breakdown-item__bar-fill breakdown-item__bar-fill--${typeClass}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </article>

            {/* Top 10 Popular Artifacts Panel */}
            <article className="analytics-panel">
              <header className="analytics-panel__header">
                <div className="analytics-panel__title-group">
                  <h2>Top 10 Popular Artifacts</h2>
                  <p>Artifacts with the highest visitor engagement</p>
                </div>
                <span className="analytics-panel__badge">
                  {popularArtifacts.length} {popularArtifacts.length === 1 ? 'artifact' : 'artifacts'}
                </span>
              </header>

              <div className="analytics-panel__body">
                {popularArtifacts.length === 0 ? (
                  <div className="analytics-empty-state">
                    <svg
                      className="analytics-empty-state__icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3>No popular artifacts yet</h3>
                    <p>There are no artifact interactions recorded in this period.</p>
                  </div>
                ) : (
                  <div className="popular-artifacts-list">
                    {popularArtifacts.map((artifact, index) => {
                      const rank = index + 1
                      const pctOfMax =
                        maxArtifactCount > 0
                          ? Math.round((artifact.interactionCount / maxArtifactCount) * 100)
                          : 0

                      return (
                        <div key={artifact.artifactId} className="artifact-rank-item">
                          <span
                            className={`rank-badge ${
                              rank <= 3 ? `rank-badge--${rank}` : ''
                            }`}
                          >
                            {rank}
                          </span>

                          <div className="artifact-info">
                            <span className="artifact-name" title={artifact.artifactName}>
                              {artifact.artifactName}
                            </span>
                            <div className="artifact-meta">
                              <span className="artifact-id-tag">
                                ID: #{artifact.artifactId}
                              </span>
                              <div className="artifact-bar-mini" aria-hidden="true">
                                <div
                                  className="artifact-bar-mini-fill"
                                  style={{ width: `${pctOfMax}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="artifact-count-tag">
                            <span>{artifact.interactionCount.toLocaleString()}</span>
                            <span className="artifact-count-label">
                              {artifact.interactionCount === 1 ? 'action' : 'actions'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}