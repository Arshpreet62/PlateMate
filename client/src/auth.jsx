import { Center, Loader } from '@mantine/core'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    api('/me').then(setUser).catch(() => setUser(null))
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  const login = useCallback(async (username, password) => {
    const u = await api('/login', { method: 'POST', body: { username, password } })
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api('/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function RequireAuth({ children, owner = false }) {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (owner && user.role !== 'OWNER') return <Navigate to="/" replace />
  return children
}
