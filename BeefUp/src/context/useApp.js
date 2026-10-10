import { createContext, useContext } from 'react'

// Separate from AppContext.jsx so Vite fast refresh keeps working.
export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
