export type InteractionType = 'VIEW' | 'AUDIO_PLAY' | 'SCAN' | string

export interface InteractionTypeCount {
  interactionType: InteractionType
  count: number
}

export interface PopularArtifact {
  artifactId: number
  artifactName: string
  interactionCount: number
}

export interface InteractionSummary {
  from: string | null
  to: string | null
  totalInteractions: number
  uniqueVisitors: number
  interactionTypes: InteractionTypeCount[]
  popularArtifacts: PopularArtifact[]
}

export interface AnalyticsFilterParams {
  from?: string
  to?: string
}
