import { createContext, useContext, useRef } from "react";

export const DockContext = createContext(null);

const SCROLL_THRESHOLD = 12;
const TOP_ZONE = 24;

export function useDockScroll() {
  const setCompact = useContext(DockContext);
  const last = useRef(0);
  return (e) => {
    if (!setCompact) return;
    const y = e.currentTarget.scrollTop;
    const delta = y - last.current;
    if (y < TOP_ZONE) setCompact(false);
    else if (delta > SCROLL_THRESHOLD) setCompact(true);
    else if (delta < -SCROLL_THRESHOLD) setCompact(false);
    if (Math.abs(delta) > SCROLL_THRESHOLD || y < TOP_ZONE) last.current = y;
  };
}
