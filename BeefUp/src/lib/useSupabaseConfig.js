import { useSyncExternalStore } from 'react'
import { subscribeConfig, isConfigured } from './supabaseConfig.js'

export function useSupabaseConfigured() {
  return useSyncExternalStore(subscribeConfig, isConfigured)
}
