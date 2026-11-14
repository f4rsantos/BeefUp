import NumberField from "./NumberField";
import TimeField from "./TimeField";
import { useState, useRef, useCallback, useEffect, useLayoutEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Trash2, Plus, Check, MoreHorizontal, StickyNote, ArrowLeftRight, ArrowUp, ArrowDown } from "lucide-react";
import { localizedName } from "../lib/localizedName"
import { repUnitFor, isCardioExercise, getBarTypeLabel, resolveExercise } from "../lib/exerciseTree"
import { formatSet } from "../lib/setFormat"
import { useEscapeKey } from "../lib/useEscapeKey";
import { lockAxis } from "../lib/swipeAxis";
import "./ExerciseCard.css";

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

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const viewportBottom = window.visualViewport?.height ?? window.innerHeight;
    const restBar = document.querySelector('[role="timer"]');
    const limit = Math.min(viewportBottom, restBar ? restBar.getBoundingClientRect().top : Infinity) - 8;
    const h = el.offsetHeight;
    if (anchor.top + h > limit) el.style.top = `${Math.max(8, anchor.above - h)}px`;
  }, [anchor]);

  // Portalled out of the card: its stacking context would trap the glass.
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      className="glass-menu fade-in ec-menu"
      style={{
        top: anchor.top,
        ...(anchor.right !== undefined ? { right: anchor.right } : { left: anchor.left }),
      }}
    >
      {children}
    </div>,
    document.querySelector(".app-shell") ?? document.body
  );
}

function MenuItem({ onClick, children, danger }) {
  return (
    <button
      role="menuitem"
      className={`tap glass-menu-item ec-menu-item${danger ? " danger" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function SetBadge({ set, setIdx, t, onOpenType }) {
  const typed = set.type && set.type !== "normal";
  return (
    <button
      className="tap flex items-center justify-center ec-tap"
      onClick={onOpenType}
      aria-haspopup="menu"
      aria-label={`${t.setSingular} ${setIdx + 1}${typed ? `, ${t[`setType_${set.type}`]}` : ""}`}
    >
      <span
        className={`tabular-nums ec-badge${typed ? " typed" : ""}`}
        style={typed ? { background: TYPE_COLORS[set.type] } : undefined}
      >
        {typed ? t[`setType_${set.type}`][0] : setIdx + 1}
      </span>
    </button>
  );
}

function DoneToggle({ done, onClick, t, large }) {
  return (
    <button
      className="tap flex items-center justify-center ec-tap"
      onClick={onClick}
      aria-pressed={!!done}
      aria-label={t.markSetDone}
    >
      <span className={`flex items-center justify-center ec-done${large ? " large" : ""}${done ? " on" : ""}`}>
        {done && <Check size={large ? 18 : 16} strokeWidth={3} />}
      </span>
    </button>
  );
}

// Swipe left to delete, shared by every row shape.
function Swipeable({ onDelete, children }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const axis = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axis.current= null;
  }, []);
  const onTouchMove = useCallback((e) => {
    const delta = e.touches[0].clientX - startX.current;
    axis.current= lockAxis(axis.current, delta, e.touches[0].clientY - startY.current);
    if (axis.current !== "x") return;
    setDragging(true);
    if (delta < 0) setDx(Math.max(delta, -140));
  }, []);
  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (axis.current === "x" && dx < -SWIPE_THRESHOLD) onDelete();
    else setDx(0);
    axis.current= null;
  }, [dx, onDelete]);

  return (
    <div className="relative overflow-hidden ec-swipe">
      <div className={`absolute inset-0 flex items-center justify-end pr-4 ec-swipe-bg${dx < -10 ? " show" : ""}`}>
        <Trash2 size={16} />
      </div>
      <div
        className={`ec-swipe-row${dragging ? " dragging" : ""}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

// Every set is editable; the next one to do is slightly larger.
function SetRow({ exIdx, setIdx, set, isNext, previous, similar, exerciseRef, repUnit, cardio, onOpenType, onUpdateSet, onToggle, t }) {
  const fieldClass= `field text-center tabular-nums ec-field${isNext ? " next" : ""}`;
  return (
    <div className={`ec-set${isNext ? " next" : ""}`}>
      <div className="grid items-center ec-grid">
        <SetBadge set={set} setIdx={setIdx} t={t} onOpenType={onOpenType} />
        {!cardio && (
          <NumberField
            className={fieldClass}
            value={set.weight}
            onChange={(e) => onUpdateSet(exIdx, setIdx, "weight", e.target.value)}
            placeholder="kg"
            aria-label="kg"
            disabled={set.done}
          />
        )}
        <NumberField
          className={fieldClass}
          allowDecimal={false}
          value={set.reps}
          onChange={(e) => onUpdateSet(exIdx, setIdx, "reps", e.target.value)}
          placeholder={cardio ? "m" : "–"}
          aria-label={repUnit}
          disabled={set.done}
        />
        {cardio && (
          <TimeField
            className={fieldClass}
            value={set.time}
            onChange={(value) => onUpdateSet(exIdx, setIdx, "time", value)}
            aria-label={t.cardioTime}
            disabled={set.done}
          />
        )}
        <DoneToggle done={set.done} onClick={onToggle} t={t} large={isNext} />
      </div>
      {isNext && previous && (
        <p className="text-xs tabular-nums text-muted ec-hint">
          {t.lastTime}: {formatSet(previous, exerciseRef)}
        </p>
      )}
      {isNext && !previous && similar && (
        <p className="text-xs tabular-nums text-muted ec-hint">
          {t.lastTimeIn} {similar.name}: {formatSet(similar.set, exerciseRef)}
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
  similarSets,
  isCurrent,
  onActivate,
  isFirst,
  isLast,
  onMoveExercise,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  onReplaceExercise,
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
  const similarExercise= similarSets ? resolveExercise(similarSets.ref) : null;
  const similarName= similarExercise ? localizedName(similarExercise, lang) : "";

  const closeMenu = useCallback(() => setMenu(null), []);
  // Menu openers wait: the layout shift would close the menu.
  const activate = (e) => {
    if (!e.target.closest('[aria-haspopup="menu"]')) onActivate(exercise.id);
  };

  function openMenu(e, kind, setIdx) {
    const r = e.currentTarget.getBoundingClientRect();
    const anchor = kind === "exercise"
      ? { top: r.bottom + 4, above: r.top - 4, right: window.innerWidth - r.right }
      : { top: r.bottom + 4, above: r.top - 4, left: r.left };
    setMenu({ kind, setIdx, anchor });
  }

  return (
    <section
      className={`card ec-card${allDone ? " done" : ""}`}
      aria-label={exLabel}
      onClickCapture={activate}
      onFocusCapture={activate}
    >
      <div className="flex items-center gap-2">
        <button
          className="tap flex-1 ec-name-btn"
          onClick={() => onOpenInfo(exercise.exerciseId)}
        >
          <span className="display text-body ec-name">
            {exLabel}
            {barTypeLabel && (
              <span className="text-muted ec-bar"> ({barTypeLabel})</span>
            )}
          </span>
        </button>
        <span className={`tabular-nums flex items-center gap-1 ec-count${allDone ? " done" : ""}`}>
          {allDone && <Check size={15} strokeWidth={3} />}
          {doneCount}/{sets.length}
        </span>
        <button
          className="tap flex items-center justify-center text-muted ec-icon-btn"
          onClick={(e) => openMenu(e, "exercise")}
          aria-label={t.exerciseOptions}
          aria-haspopup="menu"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {showNote && (
        <textarea
          className="field text-sm ec-note"
          rows={2}
          placeholder={t.exerciseNotePlaceholder}
          aria-label={t.exerciseNote}
          value={note}
          onChange={(e) => onUpdateNote(exIdx, e.target.value)}
        />
      )}

      <div
        className="grid items-center text-xs text-muted ec-grid ec-grid-head"
        aria-hidden="true"
      >
        <span className="text-center">#</span>
        <span className="text-center">{cardio ? repUnit : "kg"}</span>
        <span className="text-center">{cardio ? "mm:ss" : repUnit}</span>
        <span />
      </div>

      <div className="flex flex-col gap-1">
        {sets.map((set, setIdx) => (
          <Swipeable key={set.id} onDelete={() => onRemoveSet(exIdx, setIdx)}>
            <SetRow
              exIdx={exIdx}
              setIdx={setIdx}
              set={set}
              isNext={setIdx === nextIdx}
              previous={previousSets?.[setIdx]}
              similar={similarName ? { name: similarName, set: similarSets.sets[Math.min(setIdx, similarSets.sets.length - 1)] } : undefined}
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
        className="tap flex items-center gap-1 ec-add"
        onClick={() => onAddSet(exIdx)}
      >
        <Plus size={16} /> {t.setSingular}
      </button>

      {menu?.kind === "exercise" && (
        <PopoverMenu anchor={menu.anchor} onClose={closeMenu}>
          <MenuItem onClick={() => { setShowNote((v) => !v); closeMenu(); }}>
            <span className="flex items-center gap-2"><StickyNote size={15} /> {t.exerciseNote}</span>
          </MenuItem>
          {!isFirst && (
            <MenuItem onClick={() => { closeMenu(); onMoveExercise(exIdx, -1); }}>
              <span className="flex items-center gap-2"><ArrowUp size={15} /> {t.moveExerciseUp}</span>
            </MenuItem>
          )}
          {!isLast && (
            <MenuItem onClick={() => { closeMenu(); onMoveExercise(exIdx, 1); }}>
              <span className="flex items-center gap-2"><ArrowDown size={15} /> {t.moveExerciseDown}</span>
            </MenuItem>
          )}
          <MenuItem onClick={() => { closeMenu(); onReplaceExercise(exIdx); }}>
            <span className="flex items-center gap-2"><ArrowLeftRight size={15} /> {t.replaceExercise}</span>
          </MenuItem>
          <MenuItem danger onClick={() => { closeMenu(); onRemoveExercise(exIdx); }}>
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
                <span className={`ec-type-label${current ? " current" : ""}`}>{label}</span>
                <span
                  className={`ec-type-chip${type === "normal" ? "" : " typed"}`}
                  style={type === "normal" ? undefined : { background: TYPE_COLORS[type] }}
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
