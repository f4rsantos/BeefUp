import { useEffect, useState } from 'react'

// The trainer dashboard is desktop-only, and both App and Onboarding need to
// know before they render anything.
export function useIsDesktop(query = '(min-width: 900px)') {
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
