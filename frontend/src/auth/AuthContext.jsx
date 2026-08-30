import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginUser as apiLogin, signupUser as apiSignup, logoutUser as apiLogout } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('guardrail_token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('guardrail_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  // Synchronize state across tabs / storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('guardrail_token'))
      try {
        const stored = localStorage.getItem('guardrail_user')
        setUser(stored ? JSON.parse(stored) : null)
      } catch {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const res = await apiLogin(credentials)
      const currentToken = localStorage.getItem('guardrail_token')
      const storedUser = localStorage.getItem('guardrail_user')
      setToken(currentToken)
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else if (res.data?.user) {
        setUser(res.data.user)
      }
      return res
    } finally {
      setLoading(false)
    }
  }, [])

  const signup = useCallback(async (credentials) => {
    setLoading(true)
    try {
      const res = await apiSignup(credentials)
      const currentToken = localStorage.getItem('guardrail_token')
      const storedUser = localStorage.getItem('guardrail_user')
      setToken(currentToken)
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      } else if (res.data?.user) {
        setUser(res.data.user)
      }
      return res
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      await apiLogout()
    } finally {
      setToken(null)
      setUser(null)
      setLoading(false)
    }
  }, [])

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    login,
    signup,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
