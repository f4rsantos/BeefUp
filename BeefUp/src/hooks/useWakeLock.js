import { useEffect } from 'react'

// O browser liberta o lock quando a página fica oculta: pedir de novo ao voltar.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined

    let sentinel = null
    let cancelled = false

    async function acquire() {
      if (document.visibilityState !== 'visible' || sentinel) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          lock.release().catch(() => {})
          return
        }
        sentinel = lock
        lock.addEventListener('release', () => {
          if (sentinel === lock) sentinel = null
        })
      } catch {
        // poupança de energia ou permissão negada: o treino segue sem lock
      }
    }

    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', acquire)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
