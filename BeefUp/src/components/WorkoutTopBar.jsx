import { ChevronDown, Dumbbell, Square, Timer as TimerIcon } from "lucide-react";
import { formatElapsedClock } from "../lib/planUtils";
import ProgressRing from "./ProgressRing";
import IconButton from "./ui/IconButton";

export default function WorkoutTopBar({ elapsed, restState, onOneRM, onRest, onEnd, onMinimize, minimizeLabel, t }) {
  const restRunning = restState?.running ?? false;
  const restRemaining = restRunning ? Math.max(0, restState.duration - restState.elapsed) : 0;

  return (
    <div className="workout-topbar">
      <div className="flex gap-2">
        <IconButton icon={ChevronDown} label={minimizeLabel} onClick={onMinimize} />
        <IconButton icon={Dumbbell} label={t.oneRM} onClick={onOneRM} />
        <IconButton label={t.rest} onClick={onRest} icon={restRunning ? null : TimerIcon}>
          {restRunning && (
            <ProgressRing value={restRemaining} max={restState.duration} size={30} stroke={3} color="var(--accent)">
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                {restRemaining}
              </span>
            </ProgressRing>
          )}
        </IconButton>
      </div>

      <div
        className="flex items-center gap-2"
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          background: "var(--fill)",
          borderRadius: 999,
          padding: "7px 14px",
        }}
      >
        <span className="workout-timer-dot" />
        <span className="stat-value" style={{ fontSize: 17, color: "var(--text)" }}>
          {formatElapsedClock(elapsed)}
        </span>
      </div>

      <IconButton variant="danger" label={t.end} onClick={onEnd}>
        <Square size={14} fill="currentColor" />
      </IconButton>
    </div>
  );
}
