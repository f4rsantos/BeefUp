import { Trash2, Plus, Check } from "lucide-react";
import ProgressRing from "./ProgressRing";

export default function ExerciseCard({
  exercise,
  exIdx,
  lang,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}) {
  const exLabel = lang === "pt" ? exercise.namePt : exercise.name;
  const addSetLabel = lang === "pt" ? "Série" : "Set";
  const doneCount = exercise.sets.filter((s) => s.done).length;
  const allDone = doneCount === exercise.sets.length && exercise.sets.length > 0;

  return (
    <div className="card" style={allDone ? { borderColor: "var(--accent)" } : undefined}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
          <ProgressRing
            value={doneCount}
            max={exercise.sets.length}
            size={34}
            stroke={4}
            color="var(--accent)"
          >
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text)" }}>
              {doneCount}/{exercise.sets.length}
            </span>
          </ProgressRing>
          <p
            className="font-bold text-sm truncate"
            style={{
              color: allDone ? "var(--muted)" : "var(--text)",
              textDecoration: allDone ? "line-through" : "none",
            }}
          >
            {exLabel}
          </p>
        </div>
        <button
          className="btn btn-ghost p-1.5"
          onClick={() => onRemoveExercise(exIdx)}
        >
          <Trash2 size={14} style={{ color: "var(--muted)" }} />
        </button>
      </div>

      <div
        className="grid items-center mb-1"
        style={{
          gridTemplateColumns: "22px minmax(0,1fr) minmax(0,1fr) 28px",
        }}
      >
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          #
        </span>
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          kg
        </span>
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          reps
        </span>
      </div>

      {exercise.sets.map((set, setIdx) => (
        <div
          key={set.id}
          className="grid items-center gap-0.5 py-1"
          style={{
            gridTemplateColumns: "22px minmax(0,1fr) minmax(0,1fr) 28px",
            opacity: set.done ? 0.5 : 1,
            background: set.done ? "var(--surface2)" : "transparent",
            borderRadius: 8,
            paddingLeft: 2,
            paddingRight: 2,
          }}
        >
          <button
            className="text-xs font-medium text-center"
            style={{ color: "var(--muted)" }}
            onClick={() => onRemoveSet(exIdx, setIdx)}
          >
            {setIdx + 1}
          </button>
          <input
            className="field text-center text-sm"
            type="number"
            value={set.weight}
            onChange={(e) =>
              onUpdateSet(exIdx, setIdx, "weight", e.target.value)
            }
            placeholder="kg"
            disabled={set.done}
            style={{ padding: "6px 8px" }}
          />
          <input
            className="field text-center text-sm"
            type="number"
            value={set.reps}
            onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
            placeholder="—"
            disabled={set.done}
            style={{ padding: "6px 8px" }}
          />
          <button
            className={set.done ? "flex items-center justify-center rounded-lg pop" : "flex items-center justify-center rounded-lg"}
            style={{
              width: 28,
              height: 28,
              background: set.done ? "var(--grad-accent)" : "var(--surface2)",
              border: set.done ? "none" : "1px solid var(--border)",
            }}
            onClick={() => onToggleSet(exIdx, setIdx)}
          >
            {set.done && <Check size={15} strokeWidth={3} style={{ color: "#fff" }} />}
          </button>
        </div>
      ))}

      <button
        className="btn btn-ghost w-full mt-2 text-xs py-2"
        style={{ borderStyle: "dashed" }}
        onClick={() => onAddSet(exIdx)}
      >
        <Plus size={13} /> {addSetLabel}
      </button>
    </div>
  );
}
