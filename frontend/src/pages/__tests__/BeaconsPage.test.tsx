import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BeaconsPage from '../BeaconsPage'
import * as beaconService from '../../services/beaconService'
import * as apiClient from '../../services/apiClient'
import { ApiError } from '../../services/apiClient'
import type { Beacon } from '../../types/beacon'

vi.mock('../../services/beaconService')
vi.mock('../../services/apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/apiClient')>()
  return {
    ...actual,
    apiRequest: vi.fn(),
  }
})

const mockBeacons: Beacon[] = [
  {
    beaconId: 1,
    name: 'North Gate Beacon',
    uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
    major: 10,
    minor: 20,
    enabled: true,
    artifactId: 101,
    artifactName: 'Dong Son Drum',
    siteId: 1,
    siteName: 'Temple of Literature',
  },
  {
    beaconId: 2,
    name: 'Courtyard Beacon',
    uuid: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    major: 10,
    minor: 21,
    enabled: false,
    artifactId: null,
    artifactName: null,
    siteId: null,
    siteName: null,
  },
]

const mockArtifacts = [
  { artifactId: 101, name: 'Dong Son Drum', siteName: 'Temple of Literature' },
  { artifactId: 102, name: 'Ancient Bronze Bell', siteName: 'Imperial Citadel' },
]

describe('BeaconsPage — Admin Beacon Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      success: true,
      message: 'OK',
      data: mockArtifacts,
    })
  })

  it('renders beacon list with backend data and identity badges', async () => {
    vi.mocked(beaconService.getAllBeacons).mockResolvedValueOnce(mockBeacons)

    render(<BeaconsPage />)

    expect(await screen.findByText('North Gate Beacon')).toBeInTheDocument()
    expect(screen.getByText('Courtyard Beacon')).toBeInTheDocument()
    expect(screen.getByText('e2c56db5-dffb-48d2-b060-d0f5a71096e0')).toBeInTheDocument()
        expect(
      within(screen.getByRole('table', { name: /beacon devices table/i })).getByText('Dong Son Drum'),
    ).toBeInTheDocument()
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('filters beacons by status and search keyword', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValueOnce(mockBeacons)

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    // Filter status: Inactive Only
    const statusSelect = screen.getByLabelText(/filter by status/i)
    await user.selectOptions(statusSelect, 'INACTIVE')

    expect(screen.queryByText('North Gate Beacon')).not.toBeInTheDocument()
    expect(screen.getByText('Courtyard Beacon')).toBeInTheDocument()

    // Reset status to All
    await user.selectOptions(statusSelect, 'ALL')
    expect(screen.getByText('North Gate Beacon')).toBeInTheDocument()

    // Search by keyword
    const searchInput = screen.getByLabelText(/search beacons/i)
    await user.type(searchInput, 'North')

    expect(screen.getByText('North Gate Beacon')).toBeInTheDocument()
    expect(screen.queryByText('Courtyard Beacon')).not.toBeInTheDocument()
  })

  it('renders empty state when no beacons exist', async () => {
    vi.mocked(beaconService.getAllBeacons).mockResolvedValueOnce([])

    render(<BeaconsPage />)

    expect(await screen.findByText(/no beacons found/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register first beacon/i })).toBeInTheDocument()
  })

  it('renders error alert and allows retrying on fetch error', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons)
      .mockRejectedValueOnce(new ApiError('Failed to fetch beacons', 500))
      .mockResolvedValueOnce(mockBeacons)

    render(<BeaconsPage />)

    expect(await screen.findByText(/failed to fetch beacons/i)).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    expect(await screen.findByText('North Gate Beacon')).toBeInTheDocument()
  })

  it('validates client-side inputs for create beacon form', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValueOnce(mockBeacons)

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    await user.click(screen.getByRole('button', { name: /add beacon/i }))

    expect(screen.getByText('Register New Beacon')).toBeInTheDocument()

    // Try submit without entering required name
    const submitBtn = screen.getByRole('button', { name: /create beacon/i })
    await user.click(submitBtn)

    // Name input is required by HTML5 and state validation
    const nameInput = screen.getByLabelText(/beacon name/i)
    await user.type(nameInput, 'Gallery Beacon')

    // Invalid UUID
    const uuidInput = screen.getByLabelText(/proximity uuid/i)
    await user.type(uuidInput, 'invalid-uuid-format')

    const majorInput = screen.getByLabelText(/major/i)
    await user.type(majorInput, '10')

    const minorInput = screen.getByLabelText(/minor/i)
    await user.type(minorInput, '20')

    await user.click(submitBtn)

    expect(
      await screen.findByText(/invalid uuid format/i),
    ).toBeInTheDocument()

    // Fix UUID and set out of range Major (> 65535)
    await user.clear(uuidInput)
    await user.type(uuidInput, 'e2c56db5-dffb-48d2-b060-d0f5a71096e0')
    await user.clear(majorInput)
    await user.type(majorInput, '70000')

    await user.click(submitBtn)

    expect(
      await screen.findByText(/major must be an integer between 0 and 65535/i),
    ).toBeInTheDocument()
  })

  it('creates a new beacon successfully and displays success message', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
    vi.mocked(beaconService.createBeacon).mockResolvedValueOnce({
      beaconId: 3,
      name: 'South Wing Beacon',
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 15,
      minor: 30,
      enabled: true,
      artifactId: 101,
      artifactName: 'Dong Son Drum',
      siteId: 1,
      siteName: 'Temple of Literature',
    })

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    await user.click(screen.getByRole('button', { name: /add beacon/i }))

    await user.type(screen.getByLabelText(/beacon name/i), 'South Wing Beacon')
    await user.type(screen.getByLabelText(/proximity uuid/i), 'e2c56db5-dffb-48d2-b060-d0f5a71096e0')
    await user.type(screen.getByLabelText(/major/i), '15')
    await user.type(screen.getByLabelText(/minor/i), '30')
    await user.selectOptions(screen.getByLabelText(/associated artifact/i), '101')

    await user.click(screen.getByRole('button', { name: /create beacon/i }))

    await waitFor(() => {
      expect(beaconService.createBeacon).toHaveBeenCalledWith({
        name: 'South Wing Beacon',
        uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
        major: 15,
        minor: 30,
        enabled: true,
        artifactId: 101,
      })
    })

    expect(
      await screen.findByText(/beacon "south wing beacon" created successfully/i),
    ).toBeInTheDocument()
  })

  it('displays duplicate/conflict error (409) in modal clearly', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
    vi.mocked(beaconService.createBeacon).mockRejectedValueOnce(
      new ApiError('A beacon with the same UUID, major and minor already exists', 409),
    )

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    await user.click(screen.getByRole('button', { name: /add beacon/i }))

    await user.type(screen.getByLabelText(/beacon name/i), 'Duplicate Beacon')
    await user.type(screen.getByLabelText(/proximity uuid/i), 'e2c56db5-dffb-48d2-b060-d0f5a71096e0')
    await user.type(screen.getByLabelText(/major/i), '10')
    await user.type(screen.getByLabelText(/minor/i), '20')

    await user.click(screen.getByRole('button', { name: /create beacon/i }))

    expect(
      await screen.findByText(/a beacon with the same uuid, major and minor already exists/i),
    ).toBeInTheDocument()
  })

  it('edits an existing beacon', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
    vi.mocked(beaconService.getBeaconById).mockResolvedValueOnce(mockBeacons[0])
    vi.mocked(beaconService.updateBeacon).mockResolvedValueOnce({
      ...mockBeacons[0],
      name: 'North Gate Beacon Updated',
      major: 12,
    })

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    const editBtn = screen.getByRole('button', { name: /edit north gate beacon/i })
    await user.click(editBtn)

    expect(await screen.findByText(/edit beacon: north gate beacon/i)).toBeInTheDocument()

    const nameInput = screen.getByLabelText(/beacon name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'North Gate Beacon Updated')

    const majorInput = screen.getByLabelText(/major/i)
    await user.clear(majorInput)
    await user.type(majorInput, '12')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(beaconService.updateBeacon).toHaveBeenCalledWith(1, {
        name: 'North Gate Beacon Updated',
        uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
        major: 12,
        minor: 20,
        enabled: true,
        artifactId: 101,
      })
    })

    expect(
      await screen.findByText(/beacon "north gate beacon updated" updated successfully/i),
    ).toBeInTheDocument()
  })

  it('confirms and deletes a beacon', async () => {
    const user = userEvent.setup()
    vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
    vi.mocked(beaconService.deleteBeacon).mockResolvedValueOnce(undefined)

    const confirmSpy = vi.spyOn(window, 'confirm')

    // Scenario 1: User cancels confirmation
    confirmSpy.mockReturnValueOnce(false)

    render(<BeaconsPage />)
    await screen.findByText('North Gate Beacon')

    const deleteBtn = screen.getByRole('button', { name: /delete north gate beacon/i })
    await user.click(deleteBtn)

    expect(confirmSpy).toHaveBeenCalled()
    expect(beaconService.deleteBeacon).not.toHaveBeenCalled()

    // Scenario 2: User confirms deletion
    confirmSpy.mockReturnValueOnce(true)
    await user.click(deleteBtn)

    await waitFor(() => {
      expect(beaconService.deleteBeacon).toHaveBeenCalledWith(1)
    })

    expect(
      await screen.findByText(/beacon "north gate beacon" deleted successfully/i),
    ).toBeInTheDocument()
  })

    async function fillValidCreateForm(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /add beacon/i }))
    await user.type(screen.getByLabelText(/beacon name/i), 'New Beacon')
    await user.type(screen.getByLabelText(/proximity uuid/i), 'e2c56db5-dffb-48d2-b060-d0f5a71096e0')
    await user.type(screen.getByLabelText(/major/i), '1')
    await user.type(screen.getByLabelText(/minor/i), '2')
  }

  describe('error handling', () => {
    it.each([
      [400, 'Request validation failed', /request validation failed/i],
      [403, 'Forbidden', /you do not have permission to perform this action/i],
      [0, 'Cannot connect to the server. Please check whether the backend is running.', /cannot connect to the server/i],
    ])('shows a clear form error for HTTP %i on save', async (status, message, expected) => {
      const user = userEvent.setup()
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.createBeacon).mockRejectedValueOnce(new ApiError(message, status))

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await fillValidCreateForm(user)
      await user.click(screen.getByRole('button', { name: /create beacon/i }))

      expect(await screen.findByText(expected)).toBeInTheDocument()
      // The dialog stays open so the admin can correct and retry.
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('refreshes the list when updating a beacon that no longer exists (404)', async () => {
      const user = userEvent.setup()
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.getBeaconById).mockResolvedValueOnce(mockBeacons[0])
      vi.mocked(beaconService.updateBeacon).mockRejectedValueOnce(
        new ApiError('Beacon not found with ID: 1', 404),
      )

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /edit north gate beacon/i }))
      await screen.findByText(/edit beacon: north gate beacon/i)
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(await screen.findByText(/beacon not found with id: 1/i)).toBeInTheDocument()
      await waitFor(() => expect(beaconService.getAllBeacons).toHaveBeenCalledTimes(2))
    })

    it('refreshes the list when deleting a beacon that is already gone (404)', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.deleteBeacon).mockRejectedValueOnce(
        new ApiError('Beacon not found with ID: 1', 404),
      )

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /delete north gate beacon/i }))

      expect(await screen.findByText(/beacon not found with id: 1/i)).toBeInTheDocument()
      await waitFor(() => expect(beaconService.getAllBeacons).toHaveBeenCalledTimes(2))
    })

    it('shows a permission message for 403 on delete', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.deleteBeacon).mockRejectedValueOnce(new ApiError('Forbidden', 403))

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /delete north gate beacon/i }))

      expect(await screen.findByText(/do not have permission to delete beacons/i)).toBeInTheDocument()
    })
        it('shows a permission message for 403 on update and keeps the dialog open', async () => {
      const user = userEvent.setup()
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.getBeaconById).mockResolvedValueOnce(mockBeacons[0])
      vi.mocked(beaconService.updateBeacon).mockRejectedValueOnce(new ApiError('Forbidden', 403))

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /edit north gate beacon/i }))
      await screen.findByText(/edit beacon: north gate beacon/i)
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(
        await screen.findByText(/you do not have permission to perform this action/i),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      // A 403 is not a stale record: the list must not be reloaded.
      expect(beaconService.getAllBeacons).toHaveBeenCalledTimes(1)
    })

    it('does not treat a 401 on save as a permission error (session expiry is global)', async () => {
      const user = userEvent.setup()
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.createBeacon).mockRejectedValueOnce(
        new ApiError('Authentication is required to access this resource', 401),
      )

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await fillValidCreateForm(user)
      await user.click(screen.getByRole('button', { name: /create beacon/i }))

      expect(
        await screen.findByText(/authentication is required to access this resource/i),
      ).toBeInTheDocument()
      expect(screen.queryByText(/do not have permission/i)).not.toBeInTheDocument()
      expect(beaconService.getAllBeacons).toHaveBeenCalledTimes(1)
    })

    it('does not treat a 401 while loading the list as a permission error', async () => {
      vi.mocked(beaconService.getAllBeacons).mockRejectedValueOnce(
        new ApiError('Authentication is required to access this resource', 401),
      )

      render(<BeaconsPage />)

      expect(
        await screen.findByText(/authentication is required to access this resource/i),
      ).toBeInTheDocument()
      expect(screen.queryByText(/do not have permission/i)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument()
    })
  })


  describe('artifact mapping', () => {
    it('loads the complete artifact list without a fixed page size', async () => {
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/artifacts')
    })

    it('keeps showing and submitting the current mapping when the artifact is not in the loaded list', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClient.apiRequest).mockResolvedValue({
        success: true,
        message: 'OK',
        data: [{ artifactId: 102, name: 'Ancient Bronze Bell' }],
      })
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.getBeaconById).mockResolvedValueOnce(mockBeacons[0])
      vi.mocked(beaconService.updateBeacon).mockResolvedValueOnce(mockBeacons[0])

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /edit north gate beacon/i }))

      const select = (await screen.findByLabelText(/associated artifact/i)) as HTMLSelectElement
      expect(select.value).toBe('101')
      expect(select.selectedOptions[0].textContent).toMatch(/Dong Son Drum.*current mapping/i)

      await user.click(screen.getByRole('button', { name: /save changes/i }))
      await waitFor(() =>
        expect(beaconService.updateBeacon).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ artifactId: 101 }),
        ),
      )
    })

    it('lets the admin change the mapping and unassign it', async () => {
      const user = userEvent.setup()
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)
      vi.mocked(beaconService.getBeaconById).mockResolvedValueOnce(mockBeacons[0])
      vi.mocked(beaconService.updateBeacon).mockResolvedValue(mockBeacons[0])

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /edit north gate beacon/i }))
      const select = await screen.findByLabelText(/associated artifact/i)

      await user.selectOptions(select, '102')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      await waitFor(() =>
        expect(beaconService.updateBeacon).toHaveBeenLastCalledWith(
          1,
          expect.objectContaining({ artifactId: 102 }),
        ),
      )
    })

    it('shows an error with retry when artifacts cannot be loaded', async () => {
      const user = userEvent.setup()
      vi.mocked(apiClient.apiRequest)
        .mockRejectedValueOnce(new ApiError('Cannot connect to the server.', 0))
        .mockResolvedValue({ success: true, message: 'OK', data: mockArtifacts })
      vi.mocked(beaconService.getAllBeacons).mockResolvedValue(mockBeacons)

      render(<BeaconsPage />)
      await screen.findByText('North Gate Beacon')
      await user.click(screen.getByRole('button', { name: /add beacon/i }))

      expect(await screen.findByText(/could not load artifacts: cannot connect/i)).toBeInTheDocument()

      const dialog = screen.getByRole('dialog')
      await user.click(within(dialog).getByRole('button', { name: /retry/i }))
      await waitFor(() =>
        expect(within(dialog).queryByText(/could not load artifacts/i)).not.toBeInTheDocument(),
      )
      expect(within(dialog).getByRole('option', { name: /Ancient Bronze Bell/i })).toBeInTheDocument()
    })
  })

})

