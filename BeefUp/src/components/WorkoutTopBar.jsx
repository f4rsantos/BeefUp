import { ChevronDown, Dumbbell, Square, Timer as TimerIcon } from "lucide-react";
import { formatDuration } from "../lib/planUtils";
import ProgressRing from "./ProgressRing";

export default function WorkoutTopBar({ elapsed, restState, onOneRM, onRest, onEnd, onMinimize, minimizeLabel }) {
  const restRunning = restState?.running ?? false;
  const restRemaining = restRunning ? Math.max(0, restState.duration - restState.elapsed) : 0;

  return (
    <div
      className="flex items-center justify-between px-4 pt-5 pb-3 gap-2"
      style={{ position: "relative" }}
    >
      <div className="flex gap-2">
        <button
          className="btn btn-ghost p-2.5"
          title={minimizeLabel}
          aria-label={minimizeLabel}
          onClick={onMinimize}
        >
          <ChevronDown size={16} />
        </button>
        <button className="btn btn-ghost p-2.5" title="1RM" onClick={onOneRM}>
          <Dumbbell size={16} />
        </button>
        <button className={`btn btn-ghost ${restRunning ? "p-1.5" : "p-2.5"}`} title="Rest" onClick={onRest}>
          {restRunning ? (
            <ProgressRing value={restRemaining} max={restState.duration} size={26} stroke={3} color="var(--accent)">
              <span
                className="font-mono"
                style={{ fontSize: 9, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}
              >
                {restRemaining}
              </span>
            </ProgressRing>
          ) : (
            <TimerIcon size={16} />
          )}
        </button>
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          background: "var(--grad-accent)",
          boxShadow: "var(--shadow-glow)",
          borderRadius: 999,
          padding: "7px 14px",
        }}
      >
        <span className="workout-timer-dot" />
        <span
          className="font-mono text-lg font-bold"
          style={{ color: "#fff", fontVariantNumeric: "tabular-nums" }}
        >
          {formatDuration(elapsed)}
        </span>
      </div>

      <button className="btn btn-danger p-2.5" title="End" onClick={onEnd}>
        <Square size={16} fill="currentColor" />
      </button>
    </div>
  );
}
