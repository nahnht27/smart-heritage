import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardPage from '../DashboardPage'
import * as analyticsService from '../../services/analyticsService'
import { ApiError } from '../../services/apiClient'
import type { InteractionSummary } from '../../types/analytics'

vi.mock('../../services/analyticsService')

const mockAnalyticsData: InteractionSummary = {
  from: '2026-10-08T00:00:00Z',
  to: '2026-11-07T00:00:00Z',
  totalInteractions: 1420,
  uniqueVisitors: 350,
  interactionTypes: [
    { interactionType: 'VIEW', count: 900 },
    { interactionType: 'AUDIO_PLAY', count: 320 },
    { interactionType: 'SCAN', count: 200 },
  ],
  popularArtifacts: [
    {
      artifactId: 101,
      artifactName: 'Dong Son Bronze Drum',
      interactionCount: 520,
    },
    {
      artifactId: 102,
      artifactName: 'Ancient Ceramic Vase',
      interactionCount: 310,
    },
  ],
}

describe('DashboardPage — Admin Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading skeleton and loads analytics data on mount', async () => {
    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValueOnce(
      mockAnalyticsData,
    )

    render(<DashboardPage />)

    // Initially loading skeleton is shown
    expect(screen.getByLabelText(/loading kpis/i)).toBeInTheDocument()

    // Resolves and displays KPI cards
    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
      expect(screen.getByText('350')).toBeInTheDocument()
      // Avg engagement: 1420 / 350 = 4.1
      expect(screen.getByText('4.1')).toBeInTheDocument()
    })

    // Breakdown panel
    expect(screen.getByText('Artifact Views')).toBeInTheDocument()
    expect(screen.getByText('900')).toBeInTheDocument()
    expect(screen.getByText('Audio Plays')).toBeInTheDocument()
    expect(screen.getByText('320')).toBeInTheDocument()
    expect(screen.getByText('QR/Beacon Scans')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()

    // Popular Artifacts panel
    expect(screen.getByText('Dong Son Bronze Drum')).toBeInTheDocument()
    expect(screen.getByText('ID: #101')).toBeInTheDocument()
    expect(screen.getByText('520')).toBeInTheDocument()
    expect(screen.getByText('Ancient Ceramic Vase')).toBeInTheDocument()
    expect(screen.getByText('ID: #102')).toBeInTheDocument()
    expect(screen.getByText('310')).toBeInTheDocument()
  })

  it('renders empty states when analytics data has zero interactions', async () => {
    const emptyData: InteractionSummary = {
      from: '2026-10-08T00:00:00Z',
      to: '2026-11-07T00:00:00Z',
      totalInteractions: 0,
      uniqueVisitors: 0,
      interactionTypes: [],
      popularArtifacts: [],
    }

    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValueOnce(
      emptyData,
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('No interaction records')).toBeInTheDocument()
    expect(screen.getByText('No popular artifacts yet')).toBeInTheDocument()
  })

  it('displays error message and allows retrying on network/server error', async () => {
    const user = userEvent.setup()

    vi.mocked(analyticsService.getInteractionSummary)
      .mockRejectedValueOnce(new Error('Network error connecting to API'))
      .mockResolvedValueOnce(mockAnalyticsData)

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    expect(
      screen.getByText('Network error connecting to API'),
    ).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await user.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })
  })

  it('displays specific access denied alert for 403 Forbidden without retry button', async () => {
    vi.mocked(analyticsService.getInteractionSummary).mockRejectedValueOnce(
      new ApiError('Forbidden', 403),
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        /you do not have administrator permissions to view analytics/i,
      ),
    ).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
  })

  it('allows switching preset ranges to Last 7 Days, Last 90 Days, and All Time', async () => {
    const user = userEvent.setup()

    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    // Click Last 7 Days
    const sevenDayBtn = screen.getByRole('button', { name: /last 7 days/i })
    await user.click(sevenDayBtn)

    expect(analyticsService.getInteractionSummary).toHaveBeenCalledTimes(2)

    // Click All Time
    const allTimeBtn = screen.getByRole('button', { name: /all time/i })
    await user.click(allTimeBtn)

    expect(analyticsService.getInteractionSummary).toHaveBeenCalledWith({
      from: undefined,
      to: undefined,
    })
  })

  it('validates custom date range: prevents from > to and > 90 days', async () => {
    const user = userEvent.setup()

    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/start date/i)
    const toInput = screen.getByLabelText(/end date/i)
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    // Test 1: from is after to
    await user.clear(fromInput)
    await user.type(fromInput, '2026-11-10')
    await user.clear(toInput)
    await user.type(toInput, '2026-11-05')
    await user.click(applyBtn)

    expect(
      screen.getByText(/start date must not be later than end date/i),
    ).toBeInTheDocument()

    // Test 2: date range > 90 days
    await user.clear(fromInput)
    await user.type(fromInput, '2026-01-01')
    await user.clear(toInput)
    await user.type(toInput, '2026-05-01')
    await user.click(applyBtn)

    expect(
      screen.getByText(/date range cannot exceed 90 days/i),
    ).toBeInTheDocument()

    // Test 3: valid range (< 90 days)
    await user.clear(fromInput)
    await user.type(fromInput, '2026-11-01')
    await user.clear(toInput)
    await user.type(toInput, '2026-11-15')
    await user.click(applyBtn)

    expect(
      screen.queryByText(/date range cannot exceed 90 days/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/start date must not be later than end date/i),
    ).not.toBeInTheDocument()

    // The end day is inclusive in the UI, so the exclusive API `to` is the
    // start of the following day (contract: [from, to)).
    expect(analyticsService.getInteractionSummary).toHaveBeenCalledWith({
      from: '2026-11-01T00:00:00Z',
      to: '2026-11-16T00:00:00Z',
    })
  })

  it('includes the selected end day: 2026-11-01 to 2026-11-04 sends to=2026-11-05', async () => {
    const user = userEvent.setup()
    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/start date/i)
    const toInput = screen.getByLabelText(/end date/i)
    await user.clear(fromInput)
    await user.type(fromInput, '2026-11-01')
    await user.clear(toInput)
    await user.type(toInput, '2026-11-04')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(analyticsService.getInteractionSummary).toHaveBeenLastCalledWith({
      from: '2026-11-01T00:00:00Z',
      to: '2026-11-05T00:00:00Z',
    })
  })

  it('allows a single-day range and exactly 90 days, rejects 91 days', async () => {
    const user = userEvent.setup()
    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    const fromInput = screen.getByLabelText(/start date/i)
    const toInput = screen.getByLabelText(/end date/i)
    const applyBtn = screen.getByRole('button', { name: /apply/i })

    // Single day
    await user.clear(fromInput)
    await user.type(fromInput, '2026-11-03')
    await user.clear(toInput)
    await user.type(toInput, '2026-11-03')
    await user.click(applyBtn)
    expect(analyticsService.getInteractionSummary).toHaveBeenLastCalledWith({
      from: '2026-11-03T00:00:00Z',
      to: '2026-11-04T00:00:00Z',
    })

    // 90 inclusive days: backend range is exactly 90 days
    await user.clear(fromInput)
    await user.type(fromInput, '2026-08-01')
    await user.clear(toInput)
    await user.type(toInput, '2026-10-29')
    await user.click(applyBtn)
    expect(
      screen.queryByText(/date range cannot exceed 90 days/i),
    ).not.toBeInTheDocument()
    expect(analyticsService.getInteractionSummary).toHaveBeenLastCalledWith({
      from: '2026-08-01T00:00:00Z',
      to: '2026-10-30T00:00:00Z',
    })

    // 91 inclusive days
    await user.clear(toInput)
    await user.type(toInput, '2026-10-30')
    await user.click(applyBtn)
    expect(
      screen.getByText(/date range cannot exceed 90 days/i),
    ).toBeInTheDocument()
  })

  it('preset ranges include today (exclusive end = start of tomorrow, UTC)', async () => {
    const user = userEvent.setup()
    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /last 7 days/i }))

    const params = vi.mocked(analyticsService.getInteractionSummary).mock
      .calls.at(-1)?.[0]
    const day = 24 * 60 * 60 * 1000
    const tomorrow = new Date()
    tomorrow.setUTCHours(0, 0, 0, 0)
    const expectedTo = new Date(tomorrow.getTime() + day)

    expect(new Date(params!.to!).getTime()).toBe(expectedTo.getTime())
    expect(
      new Date(params!.to!).getTime() - new Date(params!.from!).getTime(),
    ).toBe(7 * day)
  })

  it('handles refresh button click', async () => {
    const user = userEvent.setup()

    vi.mocked(analyticsService.getInteractionSummary).mockResolvedValue(
      mockAnalyticsData,
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('1,420')).toBeInTheDocument()
    })

    const refreshBtn = screen.getByRole('button', {
      name: /refresh analytics data/i,
    })
    await user.click(refreshBtn)

    expect(analyticsService.getInteractionSummary).toHaveBeenCalledTimes(2)
  })
})