import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import ProgressRing from "./ProgressRing";

const PRESETS = [30, 60, 90, 120, 180];

export default function RestModal({ restState, setRestState, onClose }) {
  const { t } = useApp();
  const [selected, setSelected] = useState(restState?.duration ?? 60);

  const isRunning = restState?.running ?? false;
  const elapsed = restState?.elapsed ?? 0;
  const duration = restState?.duration ?? selected;
  const remaining = Math.max(0, duration - elapsed);

  function start() {
    setRestState({
      duration: selected,
      elapsed: 0,
      running: true,
      done: false,
    });
  }

  function stopRest() {
    setRestState(null);
    onClose();
  }

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
            <div className="flex gap-2.5 flex-wrap" style={{ marginBottom: 15 }}>
              {PRESETS.map((s) => (
                <button
                  key={s}
                  className={`chip ${selected === s ? "active" : ""}`}
                  onClick={() => setSelected(s)}
                >
                  {s >= 60 ? `${s / 60}${t.minutes}` : `${s}${t.seconds}`}
                </button>
              ))}
            </div>
            <input
              className="field w-full"
              style={{ marginBottom: 15 }}
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
              <ProgressRing value={elapsed} max={duration} size={140} stroke={8} color="var(--accent)">
                <span
                  className="font-mono"
                  style={{ fontSize: 28, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
                >
                  {restState?.done
                    ? "0"
                    : `${mins > 0 ? `${mins}:` : ""}${secs.toString().padStart(2, "0")}`}
                </span>
              </ProgressRing>
            </div>
            <button className="btn btn-ghost w-full mt-3" onClick={stopRest}>
              {t.skipRest}
            </button>
          </>
        )}

        {(isRunning || restState?.done) && (
          <button className="btn btn-ghost w-full mt-4" onClick={stopRest}>
            {t.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
