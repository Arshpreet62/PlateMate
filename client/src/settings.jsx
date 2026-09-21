import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getSetting } from './db/packs.js'
import { DEFAULT_SETTINGS } from './db/schema.js'

const SettingsContext = createContext({ settings: DEFAULT_SETTINGS, reload: () => {} })

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const reload = useCallback(() => {
    getSetting().then(setSettings).catch(() => {})
  }, [])

  useEffect(reload, [reload])

  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}

export function useMoney() {
  const { settings } = useContext(SettingsContext)
  return (amount) => `${settings.currency}${Number(amount ?? 0).toLocaleString('en-IN')}`
}
