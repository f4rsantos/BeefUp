import ProgressRing from "./ProgressRing";
import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Plus, Check, StickyNote, Timer as TimerIcon } from "lucide-react";
import { localizedName } from "../lib/localizedName"
import { repUnitFor } from "../lib/exerciseTree"

const SWIPE_THRESHOLD = 90;
const SET_ROW_GRID_TEMPLATE = "22px minmax(0,1fr) minmax(0,1fr) 28px";
const SET_TYPES = ["warmup", "dropset", "superset", "failure"];
const TYPE_COLORS = {
  normal: "var(--accent)",
  warmup: "var(--accent-2)",
  dropset: "#9333ea",
  superset: "#3b82f6",
  failure: "var(--danger)",
};

function SetTypeMenu({ exIdx, setIdx, set, onSetType, onClose, coords, t }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleScroll = () => onClose();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  function pick(type) {
    onSetType(exIdx, setIdx, type);
    onClose();
  }

  const options = ["normal", ...SET_TYPES];

  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        minWidth: 160,
        zIndex: 1000,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {options.map((type) => {
        const label = type === "normal" ? t.setTypeNormal : t[`setType_${type}`];
        const active = (set.type ?? "normal") === type;
        return (
          <button
            key={type}
            onClick={() => pick(type)}
            style={{
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              background: active ? "var(--surface2)" : "none",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <span style={{ color: TYPE_COLORS[type], fontWeight: 600 }}>{label}</span>
            <span style={{ color: TYPE_COLORS[type], fontWeight: 700, fontSize: 12 }}>
              {type === "normal" ? setIdx + 1 : label[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SetRow({ exIdx, setIdx, set, onUpdateSet, onToggleSet, onRemoveSet, onSetType, t }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const startX = useRef(0);
  const typeBtnRef = useRef(null);

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

  function openTypeMenu() {
    if (typeBtnRef.current) {
      const rect = typeBtnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setMenuOpen(true);
  }

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
          gridTemplateColumns: SET_ROW_GRID_TEMPLATE,
          opacity: set.done ? 0.5 : 1,
          background: set.done ? "var(--surface2)" : "var(--bg)",
          borderRadius: 8,
          paddingLeft: 2,
          paddingRight: 2,
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform .2s",
        }}
      >
        <button
          ref={typeBtnRef}
          className="text-xs font-bold text-center"
          style={{ color: set.type && set.type !== "normal" ? TYPE_COLORS[set.type] : "var(--muted)" }}
          onClick={openTypeMenu}
        >
          {set.type && set.type !== "normal" ? t[`setType_${set.type}`][0] : setIdx + 1}
        </button>
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

      {menuOpen && (
        <SetTypeMenu
          exIdx={exIdx}
          setIdx={setIdx}
          set={set}
          t={t}
          coords={coords}
          onSetType={onSetType}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}

function InlineSetTimer({ remaining, total, onSkip }) {
  const progress = total > 0 ? (total - remaining) / total : 0;

  return (
    <button
      className="mx-0 mb-1 rounded-xl px-4 py-2 text-xs flex items-center gap-2 w-full"
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        color: "var(--muted)",
      }}
      onClick={onSkip}
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
            background: "var(--grad-accent)",
          }}
        />
      </div>
      <span>{remaining}s</span>
    </button>
  );
}

export default function ExerciseCard({
  exercise,
  exIdx,
  lang,
  t,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onSetType,
  note,
  onUpdateNote,
  setTimer,
  onSkipSetTimer,
}) {
  const [showNote, setShowNote] = useState(() => !!note);
  const exLabel = localizedName(exercise, lang);
  const repUnit = repUnitFor(exercise.exerciseId);
  const addSetLabel = t.setSingular;
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
        <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
          <button
            className="btn btn-ghost p-1.5"
            aria-label="note"
            onClick={() => setShowNote((prev) => !prev)}
          >
            <StickyNote
              size={14}
              style={{ color: note ? "var(--accent)" : "var(--muted)" }}
            />
          </button>
          <button
            className="btn btn-ghost p-1.5"
            onClick={() => onRemoveExercise(exIdx)}
            aria-label={t.delete}
          >
            <Trash2 size={14} style={{ color: "var(--muted)" }} />
          </button>
        </div>
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
        style={{ gridTemplateColumns: SET_ROW_GRID_TEMPLATE }}
      >
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          #
        </span>
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          kg
        </span>
        <span className="text-xs text-center" style={{ color: "var(--muted)" }}>
          {repUnit}
        </span>
        <span />
      </div>

      {exercise.sets.map((set, setIdx) => (
        <div key={set.id}>
          <SetRow
            exIdx={exIdx}
            setIdx={setIdx}
            set={set}
            t={t}
            onUpdateSet={onUpdateSet}
            onToggleSet={onToggleSet}
            onRemoveSet={onRemoveSet}
            onSetType={onSetType}
          />
          {setTimer?.exIdx === exIdx && setTimer?.setIdx === setIdx && (
            <InlineSetTimer
              remaining={setTimer.remaining}
              total={setTimer.total}
              onSkip={onSkipSetTimer}
            />
          )}
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