import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import ProgressRing from "./ProgressRing";

const DRAG_STEP_PX = 18; // px of vertical drag per one step of that column
const RING_SIZE = 190;

// Wraps instead of clamping: past the top it comes back to min, past the
// bottom it jumps to max — like a real odometer reel, no dead end at 00.
function wrap(n, min, max) {
  if (n > max) return min;
  if (n < min) return max;
  return n;
}

// One independent reel (minutes or seconds): shows the value above and below
// the current one, dimmed, like an odometer — drag/scroll it on its own,
// the other column doesn't move.
function OdometerColumn({ value, onChange, min, max, step }) {
  const dragRef = useRef(null); // { lastY, accum } while a pointer drag is active

  function adjust(direction) {
    onChange(wrap(value + direction * step, min, max));
  }

  function handleWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    adjust(e.deltaY < 0 ? 1 : -1);
  }

  function handlePointerDown(e) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { lastY: e.clientY, accum: 0 };
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    e.stopPropagation();
    const delta = dragRef.current.lastY - e.clientY; // up = positive = increase
    dragRef.current.lastY = e.clientY;
    dragRef.current.accum += delta;
    while (dragRef.current.accum >= DRAG_STEP_PX) {
      adjust(1);
      dragRef.current.accum -= DRAG_STEP_PX;
    }
    while (dragRef.current.accum <= -DRAG_STEP_PX) {
      adjust(-1);
      dragRef.current.accum += DRAG_STEP_PX;
    }
  }

  function handlePointerUp(e) {
    e.stopPropagation();
    dragRef.current = null;
  }

  const prev = wrap(value - step, min, max);
  const next = wrap(value + step, min, max);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      className="flex flex-col items-center"
      style={{ touchAction: "none", cursor: "ns-resize", userSelect: "none", width: 52 }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span className="font-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)", opacity: 0.35, lineHeight: 1 }}>
        {pad(prev)}
      </span>
      <span
        className="font-mono"
        style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}
      >
        {pad(value)}
      </span>
      <span className="font-mono" style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)", opacity: 0.35, lineHeight: 1 }}>
        {pad(next)}
      </span>
    </div>
  );
}

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m > 0 ? `${m}:` : "0:"}${s.toString().padStart(2, "0")}`;
}

export default function RestModal({ restState, setRestState, onClose }) {
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
    });
  }

  function stopRest() {
    setRestState(null);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-center fade-in"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span
            className="font-semibold text-base"
            style={{ color: "var(--text)" }}
          >
            {isRunning || isDone
              ? isDone
                ? t.restTimerDone
                : t.rest
              : t.restTimer}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center" style={{ marginBottom: 24 }}>
          {isIdle ? (
            <>
              <ProgressRing value={pickedSeconds} max={900} size={RING_SIZE} stroke={10} color="var(--accent)">
                <div className="flex items-center" style={{ gap: 8 }}>
                  <OdometerColumn value={mm} onChange={setMm} min={0} max={15} step={1} />
                  <div style={{ width: 1, height: 68, background: "var(--border)" }} />
                  <OdometerColumn value={ss} onChange={setSs} min={0} max={55} step={5} />
                </div>
              </ProgressRing>
              <p className="mt-3" style={{ color: "var(--muted)", fontSize: 9 }}>
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
                className="font-mono"
                style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
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
          <button className="btn btn-ghost w-full mt-1" onClick={stopRest}>
            {t.skipRest}
          </button>
        )}

        {(isRunning || isDone) && (
          <button className="btn btn-ghost w-full mt-4" onClick={stopRest}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
