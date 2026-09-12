import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, userApi } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // On mount, restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      userApi.getMe()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password })
    // OTP flow: backend sends OTP and returns { otpRequired: true }
    return data
  }, [])

  const verifyOtp = useCallback(async (email, code) => {
    const { data } = await authApi.verifyOtp(email, code)
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (fullName, email, password, phone, role = 'tenant') => {
    await authApi.register({ fullName, email, password, phone, role })
    if (role === 'agent') {
      // Agent accounts are inactive — no OTP needed, just show pending message
      return { otpRequired: false, pending: true, email }
    }
    // Tenant: trigger OTP via login
    await authApi.login({ email, password })
    return { otpRequired: true, email }
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    try { if (refreshToken) await authApi.logout(refreshToken) } catch { /* ignore */ }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => setUser(updated), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
