import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { formatDuration } from "../lib/planUtils";

// Collapsed view of a running workout
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
    <button
      onClick={onExpand}
      aria-label={label}
      className="flex items-center gap-3"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 22,
        background: "var(--surface)",
        boxShadow: "var(--shadow-md)",
        margin: "0 12px -4px",
        padding: "10px 14px",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <ChevronUp size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
      <span
        className="text-sm font-semibold flex-1 truncate"
        style={{ color: "var(--text)", textAlign: "left" }}
      >
        {workoutName}
      </span>
      <span
        className="font-mono text-sm font-semibold"
        style={{ color: "var(--accent)", flexShrink: 0 }}
      >
        {formatDuration(elapsed)}
      </span>
    </button>
  );
}
