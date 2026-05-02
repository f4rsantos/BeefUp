import { Timer as TimerIcon } from "lucide-react";

export default function RestBar({ restState, onOpenRest }) {
  if (!restState?.running) return null;

  const remaining = Math.max(0, restState.duration - restState.elapsed);
  const progress =
    restState.duration > 0 ? restState.elapsed / restState.duration : 0;

  return (
    <button
      className="mx-4 mb-2 rounded-xl px-4 py-2 text-xs flex items-center gap-2"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
      }}
      onClick={onOpenRest}
    >
      <TimerIcon size={12} />
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            background: "var(--accent)",
          }}
        />
      </div>
      <span>{remaining}s</span>
    </button>
  );
}
