export type ContentType = 'SITE' | 'ARTIFACT'
export type TranslationStatus = 'PUBLISHED' | 'DRAFT'
export type LanguageCode = 'vi' | 'en'

export interface TranslationLanguageContent {
  title: string
  description: string
  status?: TranslationStatus
  updatedAt?: string
}

export interface Translation {
  id: number
  contentType: ContentType
  contentId: number
  contentName: string
  language: LanguageCode
  title: string
  description: string
  status: TranslationStatus
  updatedAt: string
  imageUrl?: string
  translations?: {
    vi?: TranslationLanguageContent
    en?: TranslationLanguageContent
  }
}

export interface TranslationRequest {
  contentType: ContentType
  contentId: number
  language: LanguageCode
  title: string
  description: string
  status: TranslationStatus
}

export interface TranslationFilterParams {
  q?: string
  language?: string
  contentType?: string
  status?: string
  page?: number
  size?: number
}

export interface TranslationStats {
  totalContent: number
  translated: number
  draft: number
  /** 'current-page' when more results exist than were loaded. */
  scope: 'current-page' | 'all-results'
}
