import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api.js'
import { useAuth } from './auth.jsx'

const SettingsContext = createContext({ currency: '₹' })

export function SettingsProvider({ children }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState({ currency: '₹' })

  useEffect(() => {
    if (user) api('/settings').then(setSettings).catch(() => {})
  }, [user])

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useMoney() {
  const { currency } = useContext(SettingsContext)
  return (amount) => `${currency}${Number(amount ?? 0).toLocaleString('en-IN')}`
}
