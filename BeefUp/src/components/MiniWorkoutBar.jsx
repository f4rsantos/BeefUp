import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { formatElapsedClock } from "../lib/planUtils";

export default function MiniWorkoutBar({ startedAt, workoutName, onExpand, label }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <button onClick={onExpand} aria-label={label} className="mini-player glass">
      <span className="workout-timer-dot" />
      <span className="mini-player-title">{workoutName}</span>
      <span className="mini-player-time">{formatElapsedClock(elapsed)}</span>
      <span className="icon-btn sm" aria-hidden="true">
        <ChevronUp size={16} strokeWidth={2.4} />
      </span>
    </button>
  );
}
