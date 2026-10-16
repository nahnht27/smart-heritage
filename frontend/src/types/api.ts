export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T
  timestamp?: string
  path?: string
  errors?: ApiFieldError[]
}