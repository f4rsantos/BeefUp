import ProgressRing from "./ProgressRing";
import { useState, useRef, useCallback } from "react";
import { Trash2, Plus, Check, X, StickyNote } from "lucide-react";

const SWIPE_THRESHOLD = 90;

function SetRow({ exIdx, setIdx, set, onUpdateSet, onToggleSet, onRemoveSet }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) setDx(Math.max(delta, -140));
  }, []);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (dx < -SWIPE_THRESHOLD) {
      onRemoveSet(exIdx, setIdx);
    } else {
      setDx(0);
    }
  }, [dx, exIdx, setIdx, onRemoveSet]);

  return (
    <div className="relative overflow-hidden rounded-lg mb-0.5">
      <div
        className="absolute inset-0 flex items-center justify-end pr-3 rounded-lg"
        style={{
          background: "var(--danger, #d33)",
          opacity: dx < -10 ? 1 : 0,
          transition: "opacity .15s",
        }}
      >
        <Trash2 size={14} color="#fff" />
      </div>

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="grid items-center gap-0.5 py-1"
        style={{
          gridTemplateColumns: "22px minmax(0,1fr) minmax(0,1fr) 28px",
          opacity: set.done ? 0.5 : 1,
          background: set.done ? "var(--surface2)" : "var(--bg)",
          borderRadius: 8,
          paddingLeft: 2,
          paddingRight: 2,
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform .2s",
        }}
      >
        <span
          className="text-xs font-medium text-center"
          style={{ color: "var(--muted)" }}
        >
          {setIdx + 1}
        </span>
        <input
          className="field text-center text-sm"
          type="number"
          value={set.weight}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
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
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 28,
            height: 28,
            background: set.done ? "var(--accent)" : "var(--surface2)",
            border: "1px solid var(--border)",
          }}
          onClick={() => onToggleSet(exIdx, setIdx)}
        >
          {set.done && <Check size={14} style={{ color: "var(--bg)" }} />}
        </button>
      </div>
    </div>
  );
}

function InlineSetTimer({ remaining, onSkip }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 mb-1 rounded-lg text-xs"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      <span>Descanso: {remaining}s</span>
      <button onClick={onSkip} style={{ color: "var(--muted)" }}>
        <X size={14} />
      </button>
    </div>
  );
}

export default function ExerciseCard({
  exercise,
  exIdx,
  lang,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  note,
  onUpdateNote,
  setTimer,
  onSkipSetTimer,
}) {
  const [showNote, setShowNote] = useState(false);
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

      {showNote && (
        <textarea
          className="field text-sm mb-3"
          rows={2}
          placeholder="Nota para este exercício..."
          value={note}
          onChange={(e) => onUpdateNote(exIdx, e.target.value)}
        />
      )}

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
        <span />
      </div>

      {exercise.sets.map((set, setIdx) => (
        <div key={set.id}>
          <SetRow
            exIdx={exIdx}
            setIdx={setIdx}
            set={set}
            onUpdateSet={onUpdateSet}
            onToggleSet={onToggleSet}
            onRemoveSet={onRemoveSet}
          />
          {setTimer?.exIdx === exIdx && setTimer?.setIdx === setIdx && (
            <InlineSetTimer
              remaining={setTimer.remaining}
              onSkip={onSkipSetTimer}
            />
          )}
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