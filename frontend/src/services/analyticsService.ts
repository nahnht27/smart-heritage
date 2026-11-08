import { apiRequest } from './apiClient'
import type {
  AnalyticsFilterParams,
  InteractionSummary,
} from '../types/analytics'

const SUMMARY_ENDPOINT = '/api/analytics/interactions/summary'

export async function getInteractionSummary(
  params?: AnalyticsFilterParams,
): Promise<InteractionSummary> {
  let url = SUMMARY_ENDPOINT

  if (params?.from && params?.to) {
    const searchParams = new URLSearchParams({
      from: params.from,
      to: params.to,
    })
    url = `${SUMMARY_ENDPOINT}?${searchParams.toString()}`
  }

  const response = await apiRequest<InteractionSummary>(url)

  return {
    from: response.data?.from ?? null,
    to: response.data?.to ?? null,
    totalInteractions: Number(response.data?.totalInteractions ?? 0),
    uniqueVisitors: Number(response.data?.uniqueVisitors ?? 0),
    interactionTypes: response.data?.interactionTypes ?? [],
    popularArtifacts: response.data?.popularArtifacts ?? [],
  }
}
