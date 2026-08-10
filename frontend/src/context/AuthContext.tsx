import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getCurrentUser, loginUser, registerUser } from '../services/auth'
import {
  getToken,
  removeToken,
  setToken,
} from '../services/tokenStorage'
import type { RegisterRequest, UserResponse } from '../types/auth'

export type AuthContextValue = {
  user: UserResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<UserResponse>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const token = getToken()
      if (!token) {
        if (!cancelled) {
          setIsLoading(false)
        }
        return
      }

      try {
        const currentUser = await getCurrentUser()
        if (!cancelled) {
          setUser(currentUser)
        }
      } catch {
        removeToken()
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const tokenResponse = await loginUser(email, password)
    setToken(tokenResponse.access_token)
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }, [])

  const register = useCallback(async (data: RegisterRequest) => {
    // Backend returns UserResponse only — no token. Do not invent a login flow.
    return registerUser(data)
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
