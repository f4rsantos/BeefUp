import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";

const PRESETS = [30, 60, 90, 120, 180];

export default function RestModal({ restState, setRestState, onClose }) {
  const { t } = useApp();
  const [selected, setSelected] = useState(restState?.duration ?? 60);
  const intervalRef = useRef(null);

  const isRunning = restState?.running ?? false;
  const elapsed = restState?.elapsed ?? 0;
  const duration = restState?.duration ?? selected;
  const remaining = Math.max(0, duration - elapsed);
  const progress = duration > 0 ? elapsed / duration : 0;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRestState((prev) => {
          if (!prev) return prev;
          const nextElapsed = prev.elapsed + 1;
          if (nextElapsed >= prev.duration) {
            clearInterval(intervalRef.current);
            return {
              ...prev,
              elapsed: prev.duration,
              running: false,
              done: true,
            };
          }
          return { ...prev, elapsed: nextElapsed };
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, setRestState]);

  // Reopen when done
  useEffect(() => {
    if (restState?.done) {
      // modal is already open when done triggers
    }
  }, [restState?.done]);

  function start() {
    setRestState({
      duration: selected,
      elapsed: 0,
      running: true,
      done: false,
    });
  }

  function cancel() {
    setRestState(null);
    onClose();
  }

  function skip() {
    setRestState(null);
    onClose();
  }

  const circumference = 2 * Math.PI * 44;
  const strokeDash = circumference * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-center fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span
            className="font-semibold text-base"
            style={{ color: "var(--text)" }}
          >
            {isRunning || restState?.done
              ? restState?.done
                ? t.restTimerDone
                : t.rest
              : t.restTimer}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!isRunning && !restState?.done ? (
          <>
            {/* Presets */}
            <div className="flex gap-2 flex-wrap mb-5">
              {PRESETS.map((s) => (
                <button
                  key={s}
                  className="btn text-sm px-3 py-2"
                  style={{
                    background:
                      selected === s ? "var(--text)" : "var(--surface2)",
                    color: selected === s ? "var(--bg)" : "var(--text)",
                  }}
                  onClick={() => setSelected(s)}
                >
                  {s >= 60 ? `${s / 60}${t.minutes}` : `${s}${t.seconds}`}
                </button>
              ))}
            </div>
            <input
              className="field w-full mb-5"
              type="number"
              placeholder={`${t.seconds}`}
              value={selected}
              onChange={(e) =>
                setSelected(Math.max(1, parseInt(e.target.value) || 60))
              }
            />
            <button className="btn btn-primary w-full" onClick={start}>
              {t.startRest}
            </button>
          </>
        ) : (
          <>
            {/* Circle progress */}
            <div className="flex justify-center my-5">
              <svg width={100} height={100} viewBox="0 0 100 100">
                <circle
                  cx={50}
                  cy={50}
                  r={44}
                  fill="none"
                  stroke="var(--surface2)"
                  strokeWidth={6}
                />
                <circle
                  cx={50}
                  cy={50}
                  r={44}
                  fill="none"
                  stroke="var(--text)"
                  strokeWidth={6}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDash}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset 0.5s linear" }}
                />
                <text
                  x={50}
                  y={50}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--text)"
                  fontSize={18}
                  fontWeight={600}
                >
                  {restState?.done
                    ? "0"
                    : `${mins > 0 ? `${mins}:` : ""}${secs.toString().padStart(2, "0")}`}
                </text>
              </svg>
            </div>
            <button className="btn btn-ghost w-full mt-1" onClick={skip}>
              {t.skipRest}
            </button>
          </>
        )}

        {(isRunning || restState?.done) && (
          <button className="btn btn-ghost w-full mt-3" onClick={cancel}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
