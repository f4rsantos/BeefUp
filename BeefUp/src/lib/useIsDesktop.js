import { useEffect, useState } from 'react'

// Layout switch, not a gate: the trainer dashboard runs everywhere, but below
// 720px it stacks its two panes and moves navigation to a bottom bar. The
// query must match dashboard.css's own breakpoint or the two disagree.
export function useIsDesktop(query = '(min-width: 720px)') {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const fn = (e) => setDesktop(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [query])

  return desktop
}
