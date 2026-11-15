import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAllBeacons,
  getBeaconById,
  createBeacon,
  updateBeacon,
  deleteBeacon,
} from '../beaconService'
import * as apiClient from '../apiClient'
import type { Beacon, BeaconRequest } from '../../types/beacon'

vi.mock('../apiClient', () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  },
}))

describe('beaconService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockBeacon: Beacon = {
    beaconId: 1,
    name: 'Main Hall Beacon',
    uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
    major: 10,
    minor: 20,
    enabled: true,
    artifactId: 101,
    artifactName: 'Dong Son Drum',
    siteId: 5,
    siteName: 'Temple of Literature',
  }

  it('fetches all beacons from /api/admin/beacons', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Beacons retrieved successfully',
      data: [mockBeacon],
    })

    const result = await getAllBeacons()

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/beacons')
    expect(result).toEqual([mockBeacon])
  })

  it('fetches a single beacon by id', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Beacon retrieved successfully',
      data: mockBeacon,
    })

    const result = await getBeaconById(1)

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/beacons/1')
    expect(result).toEqual(mockBeacon)
  })

  it('creates a new beacon with POST', async () => {
    const payload: BeaconRequest = {
      name: 'New Beacon',
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 1,
      minor: 2,
      enabled: true,
      artifactId: 101,
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Beacon created successfully',
      data: { ...mockBeacon, ...payload, beaconId: 2 },
    })

    const result = await createBeacon(payload)

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/beacons', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    expect(result.beaconId).toBe(2)
  })

  it('updates an existing beacon with PUT', async () => {
    const payload: BeaconRequest = {
      name: 'Updated Beacon',
      uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0',
      major: 10,
      minor: 25,
      enabled: false,
      artifactId: null,
    }

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Beacon updated successfully',
      data: { ...mockBeacon, ...payload },
    })

    const result = await updateBeacon(1, payload)

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/beacons/1', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    expect(result.name).toBe('Updated Beacon')
    expect(result.enabled).toBe(false)
  })

  it('deletes a beacon with DELETE', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({
      success: true,
      message: 'Beacon deleted successfully',
      data: undefined as unknown as void,
    })

    await deleteBeacon(1)

    expect(apiClient.apiRequest).toHaveBeenCalledWith('/api/admin/beacons/1', {
      method: 'DELETE',
    })
  })

    it('propagates backend errors (409, 404) from mutations', async () => {
    const conflict = new apiClient.ApiError('A beacon with the same UUID, major and minor already exists', 409)
    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(conflict)
    await expect(
      createBeacon({ name: 'x', uuid: 'e2c56db5-dffb-48d2-b060-d0f5a71096e0', major: 1, minor: 1 }),
    ).rejects.toMatchObject({ status: 409 })

    vi.mocked(apiClient.apiRequest).mockRejectedValueOnce(new apiClient.ApiError('Beacon not found', 404))
    await expect(deleteBeacon(99)).rejects.toMatchObject({ status: 404 })
  })

  it('returns an empty list when the backend returns no data', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ success: true, message: 'OK' })
    await expect(getAllBeacons()).resolves.toEqual([])
  })

  it('throws when a single-record response has no data', async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ success: true, message: 'OK' })
    await expect(getBeaconById(1)).rejects.toThrow()
    await expect(createBeacon({ name: 'x', uuid: 'u', major: 0, minor: 0 })).rejects.toThrow()
    await expect(updateBeacon(1, { name: 'x', uuid: 'u', major: 0, minor: 0 })).rejects.toThrow()
  })
})
