import NumberField from "./NumberField";
import TimeField from "./TimeField";
import { useState, useRef, useCallback, useEffect, memo } from "react";
import { Trash2, Plus, Check, MoreHorizontal, StickyNote } from "lucide-react";
import { localizedName } from "../lib/localizedName"
import { repUnitFor, isCardioExercise, getBarTypeLabel } from "../lib/exerciseTree"
import { formatSet } from "../lib/setFormat"
import { useEscapeKey } from "../lib/useEscapeKey";

const SWIPE_THRESHOLD = 90;
const SET_TYPES = ["warmup", "dropset", "superset", "failure"];
// Badge fills: white text reads on each at 4.5:1 or more.
const TYPE_COLORS = {
  warmup: "#94660f",
  dropset: "#9333ea",
  superset: "#2461e6",
  failure: "#cf1b42",
};

function PopoverMenu({ anchor, onClose, children }) {
  const menuRef = useRef(null);
  useEscapeKey(onClose);

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

  return (
    <div
      ref={menuRef}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: anchor.top,
        ...(anchor.right !== undefined ? { right: anchor.right } : { left: anchor.left }),
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        minWidth: 180,
        zIndex: 1000,
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function MenuItem({ onClick, children, color }) {
  return (
    <button
      role="menuitem"
      className="tap"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        textAlign: "left",
        color: color || "var(--text)",
      }}
    >
      {children}
    </button>
  );
}

function SetBadge({ set, setIdx, t, onOpenType }) {
  const typed = set.type && set.type !== "normal";
  return (
    <button
      className="tap flex items-center justify-center"
      onClick={onOpenType}
      aria-label={`${t.setSingular} ${setIdx + 1}${typed ? `, ${t[`setType_${set.type}`]}` : ""}`}
      style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, width: 44 }}
    >
      <span
        className="tabular-nums"
        style={{
          minWidth: 26,
          height: 26,
          borderRadius: 8,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          background: typed ? TYPE_COLORS[set.type] : "transparent",
          color: typed ? "#fff" : "var(--muted)",
        }}
      >
        {typed ? t[`setType_${set.type}`][0] : setIdx + 1}
      </span>
    </button>
  );
}

function DoneToggle({ done, onClick, t, large }) {
  const size = large ? 34 : 30;
  return (
    <button
      className="tap flex items-center justify-center"
      style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, width: 44 }}
      onClick={onClick}
      aria-pressed={!!done}
      aria-label={t.markSetDone}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: done ? "var(--grad-accent)" : "var(--surface)",
          border: done ? "none" : `2px solid ${large ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {done && <Check size={large ? 18 : 16} strokeWidth={3} style={{ color: "#fff" }} />}
      </span>
    </button>
  );
}

// Swipe left to delete, shared by every row shape.
function Swipeable({ onDelete, children }) {
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
    if (dx < -SWIPE_THRESHOLD) onDelete();
    else setDx(0);
  }, [dx, onDelete]);

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 14 }}>
      <div
        className="absolute inset-0 flex items-center justify-end pr-4"
        style={{ background: "var(--danger)", opacity: dx < -10 ? 1 : 0, transition: "opacity .15s" }}
      >
        <Trash2 size={16} style={{ color: "var(--bg)" }} />
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? "none" : "transform .2s" }}
      >
        {children}
      </div>
    </div>
  );
}

const SET_GRID = "44px minmax(0,1fr) minmax(0,1fr) 44px";

// Every set is editable; the next one to do is slightly larger.
function SetRow({ exIdx, setIdx, set, isNext, previous, exerciseRef, repUnit, cardio, onOpenType, onUpdateSet, onToggle, t }) {
  const fieldStyle = {
    padding: "6px 8px",
    fontSize: isNext ? 17 : 15,
    fontWeight: isNext ? 800 : 600,
    minHeight: isNext ? 46 : 40,
    background: set.done ? "var(--surface2)" : "var(--surface)",
    color: "var(--text)",
  };
  return (
    <div
      style={{
        background: isNext ? "var(--accent-soft)" : "var(--surface)",
        border: `1.5px solid ${isNext ? "var(--accent)" : "transparent"}`,
        borderRadius: 12,
        padding: "4px 0",
      }}
    >
      <div className="grid items-center" style={{ gridTemplateColumns: SET_GRID, gap: 6 }}>
        <SetBadge set={set} setIdx={setIdx} t={t} onOpenType={onOpenType} />
        {!cardio && (
          <NumberField
            className="field text-center tabular-nums"
            value={set.weight}
            onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
            placeholder="kg"
            aria-label="kg"
            disabled={set.done}
            style={fieldStyle}
          />
        )}
        <NumberField
          className="field text-center tabular-nums"
          allowDecimal={false}
          value={set.reps}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
          placeholder={cardio ? "m" : "–"}
          aria-label={repUnit}
          disabled={set.done}
          style={fieldStyle}
        />
        {cardio && (
          <TimeField
            className="field text-center tabular-nums"
            value={set.time}
            onChange={(value) => onUpdateSet(exIdx, setIdx, "time", value)}
            aria-label={t.cardioTime}
            disabled={set.done}
            style={fieldStyle}
          />
        )}
        <DoneToggle done={set.done} onClick={onToggle} t={t} large={isNext} />
      </div>
      {isNext && previous && (
        <p className="text-xs tabular-nums" style={{ color: "var(--muted)", margin: "4px 0 2px 50px" }}>
          {t.lastTime}: {formatSet(previous, exerciseRef)}
        </p>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  exIdx,
  lang,
  t,
  previousSets,
  isCurrent,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onSetType,
  note,
  onUpdateNote,
  onOpenInfo,
}) {
  const [showNote, setShowNote] = useState(() => !!note);
  const [menu, setMenu] = useState(null);
  const exLabel = localizedName(exercise, lang);
  const barTypeLabel = exercise.barType ? getBarTypeLabel(exercise.barType, lang) : null;
  const repUnit = repUnitFor(exercise.exerciseId);
  const cardio = isCardioExercise(exercise.exerciseId);
  const sets = exercise.sets;
  const doneCount = sets.filter((s) => s.done).length;
  const allDone = doneCount === sets.length && sets.length > 0;
  // Only the current exercise lights up its next set.
  const nextIdx = isCurrent ? sets.findIndex((s) => !s.done) : -1;

  const closeMenu = useCallback(() => setMenu(null), []);

  function openMenu(e, kind, setIdx) {
    const r = e.currentTarget.getBoundingClientRect();
    const anchor = kind === "exercise"
      ? { top: r.bottom + 4, right: window.innerWidth - r.right }
      : { top: r.bottom + 4, left: r.left };
    setMenu({ kind, setIdx, anchor });
  }

  return (
    <section
      className="card"
      aria-label={exLabel}
      style={{ padding: "14px 12px 12px 16px", ...(allDone ? { borderColor: "var(--accent)" } : {}) }}
    >
      <div className="flex items-center gap-2">
        <button
          className="tap flex-1"
          style={{ minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}
          onClick={() => onOpenInfo(exercise.exerciseId)}
        >
          <span
            className="display"
            style={{ display: "block", fontSize: 17, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}
          >
            {exLabel}
            {barTypeLabel && (
              <span style={{ fontWeight: 500, color: "var(--muted)" }}> ({barTypeLabel})</span>
            )}
          </span>
        </button>
        <span
          className="tabular-nums flex items-center gap-1"
          style={{ fontSize: 14, fontWeight: 700, color: allDone ? "var(--accent)" : "var(--muted)", flexShrink: 0 }}
        >
          {allDone && <Check size={15} strokeWidth={3} />}
          {doneCount}/{sets.length}
        </span>
        <button
          className="tap flex items-center justify-center"
          onClick={(e) => openMenu(e, "exercise")}
          aria-label={t.exerciseOptions}
          aria-haspopup="menu"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", flexShrink: 0 }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {showNote && (
        <textarea
          className="field text-sm"
          style={{ marginTop: 8 }}
          rows={2}
          placeholder={t.exerciseNotePlaceholder}
          aria-label={t.exerciseNote}
          value={note}
          onChange={(e) => onUpdateNote(exIdx, e.target.value)}
        />
      )}

      <div
        className="grid items-center text-xs"
        style={{ gridTemplateColumns: SET_GRID, gap: 6, color: "var(--muted)", marginTop: 10, marginBottom: 2 }}
        aria-hidden="true"
      >
        <span className="text-center">#</span>
        <span className="text-center">{cardio ? repUnit : "kg"}</span>
        <span className="text-center">{cardio ? "mm:ss" : repUnit}</span>
        <span />
      </div>

      <div className="flex flex-col" style={{ gap: 4 }}>
        {sets.map((set, setIdx) => (
          <Swipeable key={set.id} onDelete={() => onRemoveSet(exIdx, setIdx)}>
            <SetRow
              exIdx={exIdx}
              setIdx={setIdx}
              set={set}
              isNext={setIdx === nextIdx}
              previous={previousSets?.[setIdx]}
              exerciseRef={exercise.exerciseId}
              repUnit={repUnit}
              cardio={cardio}
              t={t}
              onOpenType={(e) => openMenu(e, "type", setIdx)}
              onUpdateSet={onUpdateSet}
              onToggle={() => onToggleSet(exIdx, setIdx)}
            />
          </Swipeable>
        ))}
      </div>

      <button
        className="tap flex items-center gap-1"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: 14, fontWeight: 700, marginTop: 4, paddingLeft: 12 }}
        onClick={() => onAddSet(exIdx)}
      >
        <Plus size={16} /> {t.setSingular}
      </button>

      {menu?.kind === "exercise" && (
        <PopoverMenu anchor={menu.anchor} onClose={closeMenu}>
          <MenuItem onClick={() => { setShowNote((v) => !v); closeMenu(); }}>
            <span className="flex items-center gap-2"><StickyNote size={15} /> {t.exerciseNote}</span>
          </MenuItem>
          <MenuItem color="var(--danger)" onClick={() => { closeMenu(); onRemoveExercise(exIdx); }}>
            <span className="flex items-center gap-2"><Trash2 size={15} /> {t.removeExercise}</span>
          </MenuItem>
        </PopoverMenu>
      )}

      {menu?.kind === "type" && (
        <PopoverMenu anchor={menu.anchor} onClose={closeMenu}>
          {["normal", ...SET_TYPES].map((type) => {
            const label = type === "normal" ? t.setTypeNormal : t[`setType_${type}`];
            const current = (sets[menu.setIdx]?.type ?? "normal") === type;
            return (
              <MenuItem key={type} onClick={() => { onSetType(exIdx, menu.setIdx, type); closeMenu(); }}>
                <span style={{ fontWeight: current ? 800 : 500 }}>{label}</span>
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 800,
                    background: type === "normal" ? "var(--surface2)" : TYPE_COLORS[type],
                    color: type === "normal" ? "var(--muted)" : "#fff",
                  }}
                >
                  {type === "normal" ? menu.setIdx + 1 : label[0]}
                </span>
              </MenuItem>
            );
          })}
        </PopoverMenu>
      )}
    </section>
  );
}

export default memo(ExerciseCard);
