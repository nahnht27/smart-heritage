/**
 * Smart Heritage Admin Web — useAuth hook
 *
 * Consumes the AuthContext. Must be used within an AuthProvider.
 */

import { useContext } from 'react'
import { AuthContext } from './AuthContext.ts'
import type { AuthContextType } from './AuthContext.ts'

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
