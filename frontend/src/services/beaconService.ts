import { apiRequest } from './apiClient'
import type { Beacon, BeaconRequest } from '../types/beacon'

const ADMIN_BEACONS_ENDPOINT = '/api/admin/beacons'

export async function getAllBeacons(): Promise<Beacon[]> {
  const response = await apiRequest<Beacon[]>(ADMIN_BEACONS_ENDPOINT)
  return response.data ?? []
}

export async function getBeaconById(beaconId: number): Promise<Beacon> {
  const response = await apiRequest<Beacon>(`${ADMIN_BEACONS_ENDPOINT}/${beaconId}`)
  if (!response.data) {
    throw new Error('Beacon details were not returned.')
  }
  return response.data
}

export async function createBeacon(payload: BeaconRequest): Promise<Beacon> {
  const response = await apiRequest<Beacon>(ADMIN_BEACONS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!response.data) {
    throw new Error('Created beacon was not returned.')
  }
  return response.data
}

export async function updateBeacon(
  beaconId: number,
  payload: BeaconRequest,
): Promise<Beacon> {
  const response = await apiRequest<Beacon>(
    `${ADMIN_BEACONS_ENDPOINT}/${beaconId}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
  if (!response.data) {
    throw new Error('Updated beacon was not returned.')
  }
  return response.data
}

export async function deleteBeacon(beaconId: number): Promise<void> {
  await apiRequest<void>(`${ADMIN_BEACONS_ENDPOINT}/${beaconId}`, {
    method: 'DELETE',
  })
}
