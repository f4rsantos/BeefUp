import { Dumbbell, Square, Timer as TimerIcon } from "lucide-react";

export default function WorkoutTopBar({ elapsed, onOneRM, onRest, onEnd }) {
  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-3 gap-2">
      <div className="flex gap-2">
        <button className="btn btn-ghost p-2.5" title="1RM" onClick={onOneRM}>
          <Dumbbell size={16} />
        </button>
        <button className="btn btn-ghost p-2.5" title="Rest" onClick={onRest}>
          <TimerIcon size={16} />
        </button>
      </div>

      <div
        className="font-mono text-lg font-semibold"
        style={{ color: "var(--text)", transform: "translateX(-24px)" }}
      >
        {formatTime(elapsed)}
      </div>

      <button className="btn btn-danger p-2.5" title="End" onClick={onEnd}>
        <Square size={16} fill="currentColor" />
      </button>
    </div>
  );
}
