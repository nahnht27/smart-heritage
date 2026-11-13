export interface Beacon {
  beaconId: number
  name: string
  uuid: string
  major: number
  minor: number
  enabled: boolean
  artifactId: number | null
  artifactName: string | null
  siteId: number | null
  siteName: string | null
}

export interface BeaconRequest {
  name: string
  uuid: string
  major: number
  minor: number
  enabled?: boolean
  artifactId?: number | null
}
