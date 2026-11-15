import { flushSync } from "react-dom";

// Where the last press happened, so the reveal starts from the switch the
// user touched. Theme pickers call setTheme(id) without the event.
let origin = null;
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointerdown",
    (e) => { origin = { x: e.clientX, y: e.clientY }; },
    { capture: true, passive: true },
  );
}

function resolve(theme) {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Applies `next` with a circle that grows from the press point.
// Falls back to an instant switch when unsupported, reduced motion is on,
// or the visible theme would not change (e.g. dark -> system while dark).
export function applyThemeWithReveal(current, next, commit) {
  const apply = () => {
    document.documentElement.setAttribute("data-theme", next);
    flushSync(() => commit(next));
  };

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce || resolve(current) === resolve(next)) {
    commit(next);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(apply);
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 480, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  }).catch(() => {});
}
