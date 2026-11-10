import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from '../DashboardPage'
import {
  getInteractionSummary,
  type InteractionSummary,
} from '../../services/analyticsService'

vi.mock('../../services/analyticsService', () => ({
  getInteractionSummary: vi.fn(),
}))

const mockedGetSummary = vi.mocked(getInteractionSummary)

const summary: InteractionSummary = {
  from: null,
  to: null,
  totalInteractions: 12,
  uniqueVisitors: 4,
  interactionTypes: [
    { interactionType: 'VIEW', count: 9 },
    { interactionType: 'AUDIO_PLAY', count: 3 },
  ],
  popularArtifacts: [
    { artifactId: 101, artifactName: 'Ancient Drum', interactionCount: 7 },
    { artifactId: 102, artifactName: 'Bronze Vase', interactionCount: 6 },
  ],
}

const emptySummary: InteractionSummary = {
  from: null,
  to: null,
  totalInteractions: 0,
  uniqueVisitors: 0,
  interactionTypes: [],
  popularArtifacts: [],
}

describe('DashboardPage analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders real summary metrics', async () => {
    mockedGetSummary.mockResolvedValue(summary)

    render(<DashboardPage />)

    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getAllByText('9').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ancient Drum').length).toBeGreaterThan(0)
    expect(screen.getByText('AUDIO PLAY')).toBeInTheDocument()
    expect(screen.getByText('Bronze Vase')).toBeInTheDocument()
  })

  it('shows loading then empty states when no interactions exist', async () => {
    mockedGetSummary.mockResolvedValue(emptySummary)

    render(<DashboardPage />)

    expect(screen.getAllByText('Loading analytics').length).toBeGreaterThan(0)
    expect(
      await screen.findByText('No interactions recorded yet'),
    ).toBeInTheDocument()
    expect(screen.getByText('No artifact interactions yet')).toBeInTheDocument()
  })

  it('shows an error and retries the request', async () => {
    mockedGetSummary
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(summary)

    render(<DashboardPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(
      'Unable to load interaction analytics. Please try again.',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect((await screen.findAllByText('12')).length).toBeGreaterThan(0)
    expect(mockedGetSummary).toHaveBeenCalledTimes(2)
  })

  it('requests the selected reporting period', async () => {
    mockedGetSummary.mockResolvedValue(summary)

    render(<DashboardPage />)
    await screen.findAllByText('12')

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Reporting period' }),
      '7d',
    )

    await waitFor(() => {
      expect(mockedGetSummary).toHaveBeenLastCalledWith('7d')
    })
  })

  it('does not duplicate the initial request in StrictMode', async () => {
    mockedGetSummary.mockResolvedValue(summary)

    render(
      <StrictMode>
        <DashboardPage />
      </StrictMode>,
    )

    await screen.findAllByText('12')
    expect(mockedGetSummary).toHaveBeenCalledTimes(1)
  })
})
