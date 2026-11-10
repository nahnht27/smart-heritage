import { apiRequest } from './apiClient'

export interface InteractionTypeCount {
  interactionType: string
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

export type AnalyticsRange = 'all' | '7d' | '30d' | '90d'

export function getInteractionSummary(
  range: AnalyticsRange,
): Promise<InteractionSummary> {
  const params = new URLSearchParams()

  if (range !== 'all') {
    const days = Number(range.slice(0, -1))
    const to = new Date()
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    params.set('from', from.toISOString())
    params.set('to', to.toISOString())
  }

  const query = params.toString()
  const path = `/api/analytics/interactions/summary${query ? `?${query}` : ''}`

  return apiRequest<InteractionSummary>(path).then((response) => {
    if (!response.data) {
      throw new Error('The analytics response did not include data.')
    }
    return response.data
  })
}
