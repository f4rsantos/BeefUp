import { useEffect, useRef } from 'react'

// Only the topmost open modal reacts to Escape.
const stack = []

function onKeyDown(e) {
  if (e.key !== 'Escape' || stack.length === 0) return
  e.preventDefault()
  stack[stack.length - 1].current()
}

export function useEscapeKey(onClose, enabled = true) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })

  useEffect(() => {
    if (!enabled) return
    if (stack.length === 0) window.addEventListener('keydown', onKeyDown)
    stack.push(latest)
    return () => {
      stack.splice(stack.lastIndexOf(latest), 1)
      if (stack.length === 0) window.removeEventListener('keydown', onKeyDown)
    }
  }, [enabled])
}
