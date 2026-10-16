export interface LoginRequest {
  username: string
  password: string
}

export interface AuthUser {
  userId: number
  username: string
  email: string
  role: string
  preferredLanguageId: number | null
}

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: AuthUser
}