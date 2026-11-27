export type FeedbackType = 'FEEDBACK' | 'CONTENT'
export type FeedbackStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'DRAFT'

export interface FeedbackItem {
  id: number
  code: string
  type: FeedbackType
  title: string
  comment?: string
  content?: string
  user: string
  userEmail?: string
  rating?: number
  targetName?: string
  targetType?: 'SITE' | 'ARTIFACT'
  targetId?: number
  date: string
  status: FeedbackStatus
  updatedAt?: string
  moderatedAt?: string
}

export interface ModerateFeedbackRequest {
  action: 'APPROVE' | 'REJECT'
}

export interface CreateFeedbackRequest {
  type: FeedbackType
  title: string
  comment?: string
  content?: string
  user?: string
  userEmail?: string
  rating?: number
  targetName?: string
  targetType?: 'SITE' | 'ARTIFACT'
  targetId?: number
  status?: FeedbackStatus
}

export interface UpdateFeedbackRequest {
  title?: string
  comment?: string
  content?: string
  status?: FeedbackStatus
  rating?: number
}

export interface FeedbackFilterParams {
  q?: string
  status?: string
  type?: string
  page?: number
  size?: number
}
