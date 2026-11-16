import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { X } from "lucide-react";
import { useApp } from "../context/useApp";
import ProgressRing from "./ProgressRing";
import "./RestModal.css";

const RING_SIZE = 190;
const ITEM_H = 34; // px per reel row — keep in sync with RestModal.css
const LOOPS = 5; // values are repeated so the reel can spin past the ends
const WHEEL_STEP = 40; // accumulated wheel delta per one row

// One independent reel (minutes or seconds). Native scroll-snap gives the
// iOS feel (fling, momentum, snap); rows scale, tilt and fade as they roll
// away from the center. The values are repeated LOOPS times and the reel is
// silently re-centered on the middle copy when it settles, so it wraps like
// an odometer — no dead end at 00.
function OdometerColumn({ values, value, onChange }) {
  const ref = useRef(null);
  const dragRef = useRef(null); // { y, top, moved } while a mouse drag is active
  const settleRef = useRef(null);
  const len = values.length;
  const mid = Math.floor(LOOPS / 2) * len;
  const [scrollTop, setScrollTop] = useState(() => (mid + Math.max(0, values.indexOf(value))) * ITEM_H);

  useLayoutEffect(() => {
    ref.current.scrollTop = scrollTop;
    // Only position on mount; afterwards the reel is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mouse wheel: one row per notch (React's onWheel is passive, so bind here).
  useEffect(() => {
    const el = ref.current;
    let accum = 0;
    function onWheel(e) {
      e.preventDefault();
      e.stopPropagation();
      accum += e.deltaY;
      if (Math.abs(accum) < WHEEL_STEP) return;
      const dir = Math.sign(accum);
      accum = 0;
      const row = Math.round(el.scrollTop / ITEM_H) - dir; // wheel up = increase
      el.scrollTo({ top: row * ITEM_H, behavior: "smooth" });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function recenter() {
    const el = ref.current;
    if (!el || dragRef.current) return;
    const row = Math.round(el.scrollTop / ITEM_H);
    const target = mid + (((row % len) + len) % len);
    if (row !== target) el.scrollTop = target * ITEM_H; // same value, invisible jump
  }

  function handleScroll(e) {
    const top = e.currentTarget.scrollTop;
    setScrollTop(top);
    const row = Math.round(top / ITEM_H);
    const v = values[((row % len) + len) % len];
    if (v !== value) onChange(v);
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(recenter, 150);
  }

  function snapToRow(row) {
    ref.current.scrollTo({ top: row * ITEM_H, behavior: "smooth" });
  }

  // Touch/pen scroll natively; a mouse can't drag-scroll, so emulate it.
  function handlePointerDown(e) {
    e.stopPropagation();
    if (e.pointerType !== "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.scrollSnapType = "none";
    dragRef.current = { y: e.clientY, top: e.currentTarget.scrollTop, moved: false };
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    e.stopPropagation();
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dy) > 3) dragRef.current.moved = true;
    e.currentTarget.scrollTop = dragRef.current.top - dy;
  }

  function handlePointerUp(e) {
    e.stopPropagation();
    if (!dragRef.current) return;
    const moved = dragRef.current.moved;
    dragRef.current = null;
    e.currentTarget.style.scrollSnapType = "";
    if (moved) snapToRow(Math.round(e.currentTarget.scrollTop / ITEM_H));
  }

  const pad = (n) => String(n).padStart(2, "0");
  const rows = Array.from({ length: LOOPS * len }, (_, i) => i);

  return (
    <div
      ref={ref}
      className="rm-odo"
      onScroll={handleScroll}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="rm-odo-spacer" />
      {rows.map((i) => {
        const offset = (i * ITEM_H - scrollTop) / ITEM_H;
        const dist = Math.abs(offset);
        if (dist > 2.5) return <div key={i} className="rm-odo-item" />; // off-screen
        return (
          <div
            key={i}
            className={`rm-odo-item font-mono ${dist < 0.5 ? "text-body" : "text-muted"}`}
            onClick={() => snapToRow(i)}
            style={{
              transform: `rotateX(${Math.max(-70, Math.min(70, offset * -35))}deg) scale(${1 - Math.min(dist, 1.5) * 0.4})`,
              opacity: Math.max(0.15, 1 - dist * 0.65),
            }}
          >
            {pad(values[i % len])}
          </div>
        );
      })}
      <div className="rm-odo-spacer" />
    </div>
  );
}

const MINUTES = Array.from({ length: 16 }, (_, i) => i); // 0–15
const SECONDS = Array.from({ length: 12 }, (_, i) => i * 5); // 0–55, step 5

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m > 0 ? `${m}:` : "0:"}${s.toString().padStart(2, "0")}`;
}

export default function RestModal({ restState, setRestState, onClose }) {
  useEscapeKey(onClose);
  const { t } = useApp();
  const initialDuration = restState?.duration ?? 60;
  const [mm, setMm] = useState(Math.floor(initialDuration / 60));
  const [ss, setSs] = useState(initialDuration % 60);

  const isRunning = restState?.running ?? false;
  const isDone = restState?.done ?? false;
  const isIdle = !isRunning && !isDone;
  const elapsed = restState?.elapsed ?? 0;
  const pickedSeconds = Math.max(5, mm * 60 + ss);
  const duration = restState?.duration ?? pickedSeconds;
  const remaining = Math.max(0, duration - elapsed);

  function start() {
    setRestState({
      duration: pickedSeconds,
      elapsed: 0,
      running: true,
      done: false,
      endsAt: Date.now() + pickedSeconds * 1000,
    });
  }

  function stopRest() {
    setRestState(null);
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onClose}>
      <div
        className="modal-center fade-in rm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span
            className="font-semibold text-base text-body"
          >
            {isRunning || isDone
              ? isDone
                ? t.restTimerDone
                : t.rest
              : t.restTimer}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center rm-body">
          {isIdle ? (
            <>
              <ProgressRing value={pickedSeconds} max={900} size={RING_SIZE} stroke={10} color="var(--accent)">
                <div className="flex items-center gap-2">
                  <OdometerColumn values={MINUTES} value={mm} onChange={setMm} />
                  <div className="rm-divider" />
                  <OdometerColumn values={SECONDS} value={ss} onChange={setSs} />
                </div>
              </ProgressRing>
              <p className="mt-3 text-muted rm-hint">
                {t.dragToAdjust}
              </p>
            </>
          ) : (
            <ProgressRing
              value={isDone ? duration : elapsed}
              max={duration}
              size={RING_SIZE}
              stroke={10}
              color="var(--accent)"
            >
              <span
                className="font-mono text-body rm-clock"
              >
                {isDone ? "0" : formatClock(remaining)}
              </span>
            </ProgressRing>
          )}
        </div>

        {isIdle && (
          <button className="btn btn-primary w-full" onClick={start}>
            {t.startRest}
          </button>
        )}

        {(isRunning || isDone) && (
          <div className="flex gap-3 mt-1">
            <button className="btn btn-ghost flex-1" onClick={stopRest}>
              {t.skipRest}
            </button>
            <button className="btn btn-ghost flex-1" onClick={stopRest}>
              {t.cancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
