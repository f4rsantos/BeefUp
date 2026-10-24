import { useApp } from "../context/useApp";
import { useEscapeKey } from "../lib/useEscapeKey";
import WorkoutIconGrid from "./WorkoutIconGrid";

// Picks the symbol shown on a workout's card; kept on this device only.
export default function WorkoutIconModal({ workout, current, color, onPick, onClose }) {
  const { t } = useApp();
  useEscapeKey(onClose);

  return (
    <div role="dialog" aria-modal="true" aria-label={t.workoutIconTitle} className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold" style={{ color: "var(--text)" }}>{t.workoutIconTitle}</p>
        <p className="text-sm truncate mb-3" style={{ color: "var(--muted)" }}>{workout.name}</p>
        <WorkoutIconGrid current={current} color={color} onPick={onPick} />
        <div className="flex gap-3" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost flex-1" onClick={() => onPick(null)}>{t.workoutIconReset}</button>
          <button className="btn btn-primary flex-1" onClick={onClose}>{t.done}</button>
        </div>
      </div>
    </div>
  );
}
