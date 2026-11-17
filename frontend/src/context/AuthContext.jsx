import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Start in "loading" only if a saved token needs to be checked
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem('bloodlink_token'))
  )

  // On page load: if a token is saved, ask the backend who we are
  useEffect(() => {
    if (!localStorage.getItem('bloodlink_token')) return

    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('bloodlink_token'))
      .finally(() => setLoading(false))
  }, [])

  const saveSession = (data) => {
    localStorage.setItem('bloodlink_token', data.token)
    setUser(data.user)
    return data.user
  }

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    return saveSession(res.data)
  }

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload)
    return saveSession(res.data)
  }

  // Reloads the user's data from the backend (e.g. after saving a profile)
  const refreshUser = async () => {
    const res = await api.get('/auth/me')
    setUser(res.data.user)
  }

  const logout = () => {
    localStorage.removeItem('bloodlink_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}