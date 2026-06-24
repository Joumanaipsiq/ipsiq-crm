import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => sessionStorage.getItem('ipsiq_token'))
  const [loading, setLoading] = useState(true)

  // Validate stored token on mount
  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data.user); else _logout() })
      .catch(_logout)
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function login(newToken, newUser) {
    sessionStorage.setItem('ipsiq_token', newToken)
    setToken(newToken)
    setUser(newUser)
  }

  function _logout() {
    sessionStorage.removeItem('ipsiq_token')
    setToken(null)
    setUser(null)
  }

  /** Authenticated fetch wrapper — use instead of raw fetch() */
  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })
    if (res.status === 401) { _logout(); throw new Error('Session expired') }
    return res
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout: _logout, api, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
