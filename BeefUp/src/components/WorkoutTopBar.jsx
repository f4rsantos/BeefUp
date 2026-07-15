import { ChevronDown, Dumbbell, Square, Timer as TimerIcon } from "lucide-react";
import { formatDuration } from "../lib/planUtils";

export default function WorkoutTopBar({ elapsed, onOneRM, onRest, onEnd, onMinimize, minimizeLabel }) {
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
        <button className="btn btn-ghost p-2.5" title="Rest" onClick={onRest}>
          <TimerIcon size={16} />
        </button>
      </div>

      <div
        className="font-mono text-lg font-semibold"
        style={{
          color: "var(--text)",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      >
        {formatDuration(elapsed)}
      </div>

      <button className="btn btn-danger p-2.5" title="End" onClick={onEnd}>
        <Square size={16} fill="currentColor" />
      </button>
    </div>
  );
}
