
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/authService'
import { ApiError } from '../services/apiClient'
import { useAuth } from '../context/useAuth'
import type { AuthUser } from '../types/auth'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login: setAuth } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{
    username?: string
    password?: string
  }>({})
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    const nextErrors: { username?: string; password?: string } = {}

    if (!username.trim()) {
      nextErrors.username = 'Please enter your username.'
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.'
    }

    setErrors(nextErrors)
    setMessage('')
    setIsSuccess(false)

    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const result = await login({
        username: username.trim(),
        password,
      })

      const accessToken = result.accessToken
      const user: AuthUser = {
        userId: result.user.userId,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role,
        preferredLanguageId: result.user.preferredLanguageId,
      }

      if (user.role?.toUpperCase() !== 'ADMIN') {
        setMessage(
          'Access denied. An administrator account is required.',
        )
        return
      }

      setAuth(accessToken, user)
      setIsSuccess(true)
      setMessage('Login successful.')

      // Small delay so the user can see the success message before navigating.
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 800)
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          setMessage(
            'Cannot connect to the server. Please try again later.',
          )
        } else if (error.status === 401) {
          setMessage('Invalid username or password.')
        } else if (error.status === 403) {
          setMessage('Access denied. You do not have permission to sign in.')
        } else {
          setMessage(error.message || 'Login failed. Please try again.')
        }
      } else {
        setMessage('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="form-eyebrow">ADMINISTRATION</p>

        <h1>Welcome back</h1>

        <p className="login-description">
          Sign in to manage heritage sites and cultural artifacts.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="username">Username</label>

            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              disabled={isSubmitting}
              onChange={(event) => {
                setUsername(event.target.value)
                setErrors((current) => ({
                  ...current,
                  username: undefined,
                }))
                setMessage('')
                setIsSuccess(false)
              }}
              aria-invalid={Boolean(errors.username)}
              aria-describedby={
                errors.username ? 'username-error' : undefined
              }
              required
            />

            {errors.username && (
              <small
                id="username-error"
                className="field-error"
                role="alert"
              >
                {errors.username}
              </small>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                disabled={isSubmitting}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                  }))
                  setMessage('')
                  setIsSuccess(false)
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9 7-.2 1.1-1.2 2.7-2.8 4M6.2 6.2C3.8 7.8 2.3 10.4 2 12c.5 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </button>
            </div>

            {errors.password && (
              <small
                id="password-error"
                className="field-error"
                role="alert"
              >
                {errors.password}
              </small>
            )}
          </div>

          {message && (
            <p
              className="login-message"
              role={isSuccess ? 'status' : 'alert'}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <span>{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
            <span aria-hidden="true">
              {isSubmitting ? '…' : '→'}
            </span>
          </button>
        </form>

        <p className="login-security">
          <span aria-hidden="true">◆</span>
          Authorized administrators only
        </p>

        <p className="login-footer">
          © Smart Heritage Administration
        </p>
      </section>
    </main>
  )
}
