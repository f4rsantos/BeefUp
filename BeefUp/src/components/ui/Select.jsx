import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const GAP = 6;
const MAX_H = 320;

// Glass replacement for <select>: a field-styled trigger and a glass-menu
// listbox. options: [{ id, label }]. The menu portals into the nearest
// .app-shell so page scrollers and cards can't clip it.
export default function Select({ options, value, onChange, label, id, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const [host, setHost] = useState(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const current = options.find((o) => o.id === value);

  function place() {
    const r = triggerRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - 8;
    const above = r.top - GAP - 8;
    const up = below < Math.min(MAX_H, options.length * 44 + 12) && above > below;
    setPos({
      left: r.left,
      width: Math.max(r.width, 180),
      maxHeight: Math.min(MAX_H, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
    });
  }

  function openMenu() {
    place();
    setHost(triggerRef.current.closest(".app-shell") ?? document.body);
    setActive(Math.max(0, options.findIndex((o) => o.id === value)));
    setOpen(true);
  }

  function choose(option) {
    setOpen(false);
    triggerRef.current?.focus();
    if (option.id !== value) onChange(option.id);
  }

  useLayoutEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!listRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    const onScroll = (e) => { if (!listRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  function onKeyDown(e) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[active]) choose(options[active]); }
    else if (e.key === "Tab") setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`field select-trigger ${className}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={`select-value ${current ? "" : "placeholder"}`}>{current?.label ?? placeholder ?? ""}</span>
        <ChevronDown size={16} strokeWidth={2.4} className={`select-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
      {open && pos && host && createPortal(
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="glass-menu select-menu fade-in"
          style={pos}
        >
          {options.map((o, i) => (
            <div
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.id === value}
              className={`glass-menu-item select-option ${i === active ? "active" : ""}`}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              <span className="select-value">{o.label}</span>
              {o.id === value && <Check size={16} strokeWidth={2.6} className="select-check" />}
            </div>
          ))}
        </div>,
        host,
      )}
    </>
  );
}
