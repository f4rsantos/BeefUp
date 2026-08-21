import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { resolvedExerciseName } from "../lib/exerciseTree";

export default function WorkoutPreview({ workout, lang, t, onClose }) {
  const items = (workout.exercises || []).map((e) => (typeof e === "string" ? { exerciseId: e, sets: 3, reps: 10, rest: 90, weight: "" } : e));
  const [i, setI] = useState(0);
  const [rest, setRest] = useState(0);

  useEffect(() => {
    if (rest <= 0) return;
    const id = setInterval(() => setRest((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [rest]);

  if (items.length === 0) {
    return (
      <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
        <div className="modal-center" onClick={(e) => e.stopPropagation()}>
          <p style={{ color: "var(--muted)" }}>{t.noExercises}</p>
        </div>
      </div>
    );
  }

  const cur = items[i];

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm" style={{ color: "var(--muted)" }}>{i + 1} / {items.length}</span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}><X size={18} /></button>
        </div>

        <h2 className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", marginBottom: 16 }}>
          {resolvedExerciseName(cur.exerciseId, lang)}
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label={t.sets} value={cur.sets} />
          <Stat label={t.reps} value={cur.reps} />
          <Stat label={t.weight} value={cur.weight ? `${cur.weight}` : "—"} />
        </div>

        <button className="btn btn-energy w-full flex items-center justify-center gap-2 mb-4" onClick={() => setRest(cur.rest || 90)}>
          <Timer size={16} /> {rest > 0 ? `${rest}${t.seconds}` : `${t.startRest} (${cur.rest || 90}${t.seconds})`}
        </button>

        <div className="flex gap-2">
          <button className="btn btn-ghost flex-1 flex items-center justify-center gap-1" disabled={i === 0} onClick={() => { setI(i - 1); setRest(0); }}>
            <ChevronLeft size={16} /> {t.back}
          </button>
          <button className="btn btn-primary flex-1 flex items-center justify-center gap-1" disabled={i === items.length - 1} onClick={() => { setI(i + 1); setRest(0); }}>
            {t.obNext} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "12px 8px" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
