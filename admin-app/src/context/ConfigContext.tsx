import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AppSettings } from '../lib/app-settings'

interface ConfigContextType {
  ready: boolean
  error: string | null
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfigContextType>({ ready: false, error: null })

  useEffect(() => {
    AppSettings.init()
      .then(() => setState({ ready: true, error: null }))
      .catch((err) => {
        console.error('Failed to load config:', err)
        setState({ ready: false, error: err.message })
      })
  }, [])

  if (state.error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Failed to load configuration: {state.error}</div>
  }

  if (!state.ready) {
    return <div style={{ padding: '2rem' }}>Loading configuration…</div>
  }

  return (
    <ConfigContext.Provider value={state}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}
