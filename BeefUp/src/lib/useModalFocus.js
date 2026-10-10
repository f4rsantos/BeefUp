import { useEffect } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function topOverlay() {
  const all = document.querySelectorAll('.modal-overlay')
  return all[all.length - 1] || null
}

// One manager for every .modal-overlay: focus in, Tab trapped, focus back.
export function useModalFocus() {
  useEffect(() => {
    const openers = new Map()

    function onAdded(overlay) {
      openers.set(overlay, document.activeElement)
      // Focus the dialog itself, so phones don't pop the keyboard.
      if (!overlay.hasAttribute('tabindex')) overlay.setAttribute('tabindex', '-1')
      overlay.focus({ preventScroll: true })
    }

    function onRemoved(overlay) {
      const opener = openers.get(overlay)
      openers.delete(overlay)
      const top = topOverlay()
      if (opener && opener.isConnected && (!top || top.contains(opener))) opener.focus({ preventScroll: true })
      else top?.focus({ preventScroll: true })
    }

    document.querySelectorAll('.modal-overlay').forEach(onAdded)

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (!(n instanceof Element)) continue
          const found = n.matches('.modal-overlay') ? [n] : [...n.querySelectorAll('.modal-overlay')]
          found.forEach(onAdded)
        }
        for (const n of r.removedNodes) {
          if (!(n instanceof Element)) continue
          const found = n.matches('.modal-overlay') ? [n] : [...n.querySelectorAll('.modal-overlay')]
          found.forEach(onRemoved)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const overlay = topOverlay()
      if (!overlay) return
      const items = [...overlay.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) { e.preventDefault(); overlay.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const inside = overlay.contains(document.activeElement)
      if (e.shiftKey && (document.activeElement === first || document.activeElement === overlay || !inside)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault(); first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
}
