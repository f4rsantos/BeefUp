import { useRef, useState } from 'react'

// Drag-to-reorder and show/hide for the stat blocks.
export function useBlockReorder(statsLayout, setStatsLayout) {
  const [editing, setEditing] = useState(false)
  const [layout, setLayout] = useState(statsLayout)
  const itemRefs = useRef({})
  const draggedKey = useRef(null)

  function startEditing() {
    setLayout(statsLayout)
    setEditing(true)
  }

  function toggleEnabled(key) {
    const next = layout.map((b) => (b.key === key ? { ...b, enabled: !b.enabled } : b))
    setLayout(next)
    setStatsLayout(next)
  }

  function move(fromIndex, toIndex) {
    setLayout((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  function handlePointerDown(e, key) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggedKey.current = key
  }

  function handlePointerMove(e) {
    const key = draggedKey.current
    if (!key) return
    const currentIndex = layout.findIndex((b) => b.key === key)
    const y = e.clientY

    for (const block of layout) {
      if (block.key === key) continue
      const node = itemRefs.current[block.key]
      if (!node) continue
      const rect = node.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      const otherIndex = layout.findIndex((x) => x.key === block.key)

      if (y < midpoint && otherIndex < currentIndex) {
        move(currentIndex, otherIndex)
        break
      }
      if (y > midpoint && otherIndex > currentIndex) {
        move(currentIndex, otherIndex)
        break
      }
    }
  }

  function handlePointerUp() {
    if (!draggedKey.current) return
    draggedKey.current = null
    setStatsLayout(layout)
  }

  return {
    editing,
    setEditing,
    startEditing,
    layout,
    itemRefs,
    toggleEnabled,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,}
}
