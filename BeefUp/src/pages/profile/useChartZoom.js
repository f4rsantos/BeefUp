import { useEffect, useRef } from 'react'

const WHEEL_ZOOM_STEP = 0.15

export function useChartZoom({ days, minDays, maxDays, onZoom }) {
  const ref = useRef(null)
  const daysRef = useRef(days)
  const pinchDistRef = useRef(null)

  useEffect(() => {
    daysRef.current = days
  }, [days])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const clamp = (value) => Math.min(maxDays, Math.max(minDays, Math.round(value)))

    const touchDistance = (touches) => {
      const [a, b] = touches
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    }

    function handleWheel(e) {
      if (!e.ctrlKey) return
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1 - WHEEL_ZOOM_STEP : 1 + WHEEL_ZOOM_STEP
      onZoom(clamp(daysRef.current * factor))
    }

    function handleTouchStart(e) {
      if (e.touches.length === 2) pinchDistRef.current = touchDistance(e.touches)
    }

    function handleTouchMove(e) {
      if (e.touches.length !== 2 || pinchDistRef.current == null) return
      e.preventDefault()
      const dist = touchDistance(e.touches)
      onZoom(clamp(daysRef.current / (dist / pinchDistRef.current)))
      pinchDistRef.current = dist
    }

    function handleTouchEnd(e) {
      if (e.touches.length < 2) pinchDistRef.current = null
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [minDays, maxDays, onZoom])

  return ref
}
