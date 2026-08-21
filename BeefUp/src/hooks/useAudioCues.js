import { useCallback, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'

// sintetizado via Web Audio (sem ficheiros)
export function useAudioCues() {
  const { soundEnabled } = useApp()
  const ctxRef = useRef(null)

  function getContext() {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctxRef.current = new AudioCtx()
    }
    return ctxRef.current
  }

  const unlock = useCallback(() => {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()
  }, [])

  const beep = useCallback((freq, durationMs, when = 0) => {
    const ctx = getContext()
    const start = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + durationMs / 1000 + 0.02)
  }, [])

  const play = useCallback((kind) => {
    if (!soundEnabled) return
    if (kind === 'tick') beep(880, 100)
    else if (kind === 'done') beep(1320, 250)
    else if (kind === 'finish') {
      const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.50
      beep(C5, 100, 0)
      beep(E5, 100, 0.1)
      beep(G5, 100, 0.2)
      beep(C6, 300, 0.3)
    }
  }, [beep, soundEnabled])

  useEffect(() => {
    return () => { ctxRef.current?.close() }
  }, [])

  return { unlock, play }
}
