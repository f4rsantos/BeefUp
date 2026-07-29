import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, nowISO, lastCompletedSets, epley } from "../lib/planUtils";
import { resolveExercise } from "../lib/exerciseTree";
import WorkoutTopBar from "../components/WorkoutTopBar";
import RestBar from "../components/RestBar";
import ExerciseCard from "../components/ExerciseCard";
import ConfirmModal from "../components/ConfirmModal";
import OneRMModal from "../components/OneRMModal";
import RestModal from "../components/RestModal";
import EndWorkoutModal from "../components/EndWorkoutModal";
import ExercisePicker from "../components/ExercisePicker";

function buildExerciseEntry(ex, lastSets = []) {
  return {
    id: uid(),
    exerciseId: ex.id,
    name: ex.name,
    namePt: ex.namePt,
    note: "",
    sets: Array.from({ length: ex.defaultSets }, (_, i) => {
      const last = lastSets[Math.min(i, lastSets.length - 1)];
      return {
        id: uid(),
        weight: last ? last.weight : (ex.defaultWeight > 0 ? String(ex.defaultWeight) : ""),
        reps: last ? last.reps : String(ex.defaultReps),
        done: false,
      };
    }),
  };
}

export default function ActiveWorkout({ onEnd, onMinimize }) {
  const { t, lang, activeWorkout, workouts, addSession, sessions } = useApp();
  const sourceWorkout =
    workouts.find((w) => w.id === activeWorkout?.workoutId) ?? null;
  const restAfterSet = sourceWorkout?.restAfterSet ?? 120;
  const [exercises, setExercises] = useState(() => {
    if (!sourceWorkout) return [];
    return sourceWorkout.exercises
      .map((ref) => resolveExercise(ref))
      .filter(Boolean)
      .map((ex) => buildExerciseEntry(ex, lastCompletedSets(sessions, ex.id)));
  });

  // Shared with MiniWorkoutBar so the clock survives this component being hidden while the workout stays running.
  const [fallbackStart] = useState(() => Date.now());
  const startedAt = activeWorkout?.startedAt ?? fallbackStart;
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startedAt) / 1000),
  );
  const [showOneRM, setShowOneRM] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [restState, setRestState] = useState(null);
  const [showRestModal, setShowRestModal] = useState(false);
  const [endModal, setEndModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [setTimer, setSetTimer] = useState(null);

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (!setTimer) return;
    const currentEndsAt = setTimer.endsAt;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((currentEndsAt - Date.now()) / 1000),
      );
      if (remaining <= 0) {
        setSetTimer(null);
        return;
      }
      setSetTimer((prev) =>
        prev && prev.endsAt === currentEndsAt
          ? { ...prev, remaining }
          : prev,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [setTimer]);

  const updateSet = useCallback((exIdx, setIdx, field, val) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        return {
          ...e,
          sets: e.sets.map((s, j) => {
            if (j < setIdx || s.done) return s;
            return { ...s, [field]: val };
          }),
        };
      }),
    );
  }, []);

  const setSetType = useCallback((exIdx, setIdx, type) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        return { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, type } : s)) };
      }),
    );
  }, []);

  const toggleSet = useCallback(
    (exIdx, setIdx) => {
      const wasDone = exercises[exIdx]?.sets[setIdx]?.done;

      setExercises((prev) =>
        prev.map((e, i) => {
          if (i !== exIdx) return e;
          return {
            ...e,
            sets: e.sets.map((s, j) =>
              j === setIdx ? { ...s, done: !s.done } : s,
            ),
          };
        }),
      );

      if (!wasDone) {
        const now = Date.now();
        setSetTimer({
          exIdx,
          setIdx,
          endsAt: now + restAfterSet * 1000,
          remaining: restAfterSet,
          total: restAfterSet,
        });
      } else {
        setSetTimer((prevTimer) =>
          prevTimer?.exIdx === exIdx && prevTimer?.setIdx === setIdx
            ? null
            : prevTimer,
        );
      }
    },
    [exercises, restAfterSet],
  );

  const dismissSetTimer = useCallback(() => setSetTimer(null), []);

  const addSet = useCallback((exIdx) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        const last = e.sets[e.sets.length - 1];
        return {
          ...e,
          sets: [
            ...e.sets,
            {
              id: uid(),
              weight: last?.weight ?? "",
              reps: last?.reps ?? "10",
              done: false,
            },
          ],
        };
      }),
    );
  }, []);

  const removeSet = useCallback((exIdx, setIdx) => {
    setExercises((prev) =>
      prev.map((e, i) => {
        if (i !== exIdx) return e;
        return { ...e, sets: e.sets.filter((_, j) => j !== setIdx) };
      }),
    );
    setSetTimer((prevTimer) =>
      prevTimer?.exIdx === exIdx && prevTimer?.setIdx === setIdx
        ? null
        : prevTimer,
    );
  }, []);

  const removeExercise = useCallback((exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
    setSetTimer((prevTimer) =>
      prevTimer?.exIdx === exIdx ? null : prevTimer,
    );
  }, []);

  const addExercises = useCallback((refs) => {
    const entries = refs
      .map(resolveExercise)
      .filter(Boolean)
      .map((ex) => buildExerciseEntry(ex, lastCompletedSets(sessions, ex.id)));
    if (entries.length === 0) return;
    setExercises((prev) => [...prev, ...entries]);
    setShowExPicker(false);
  }, [sessions]);

  async function handleEnd() {
    const duration = Math.floor((Date.now() - startedAt) / 1000);
    let totalSets = 0;
    let totalVolume = 0;
    exercises.forEach((e) => {
      e.sets.forEach((s) => {
        if (s.done && s.type !== "warmup") {
          totalSets++;
          totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
        }
      });
    });

    const session = {
      id: uid(),
      date: nowISO(),
      workoutId: activeWorkout?.workoutId ?? null,
      workoutName: activeWorkout?.workoutName ?? "",
      duration,
      exercises: exercises
        .map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          namePt: e.namePt,
          note: e.note?.trim() ?? "",
          sets: e.sets
            .filter((s) => s.done)
            .map((s) => ({ weight: s.weight, reps: s.reps, type: s.type })),
        }))
        .filter((e) => e.sets.length > 0),
    };

    const priorBest = {};
    sessions.forEach((s) =>
      s.exercises?.forEach((e) =>
        e.sets?.forEach((set) => {
          if (set.type === "warmup") return;
          const rm = epley(set.weight, set.reps);
          if (rm > (priorBest[e.exerciseId] || 0)) priorBest[e.exerciseId] = rm;
        }),
      ),
    );
    const prs = [];
    exercises.forEach((e) => {
      let best = 0;
      e.sets.forEach((set) => {
        if (set.done && set.type !== "warmup") {
          const rm = epley(set.weight, set.reps);
          if (rm > best) best = rm;
        }
      });
      if (best > 0 && best > (priorBest[e.exerciseId] || 0)) {
        prs.push(lang === "pt" ? e.namePt : e.name);
      }
    });

    await addSession(session);
    setEndModal({ stats: { duration, totalSets, totalVolume, prs } });
  }

  const workoutName = activeWorkout?.workoutName ?? "";

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{
        background: "var(--bg)",
        touchAction: "pan-x pan-y pinch-zoom",
      }}
    >
      <WorkoutTopBar
        elapsed={elapsed}
        onOneRM={() => setShowOneRM(true)}
        onRest={() => setShowRestModal(true)}
        onEnd={() => setEndModal("confirm")}
        onMinimize={onMinimize}
        minimizeLabel={t.minimize}
      />

      {workoutName && (
        <p
          className="text-center text-lg font-semibold mt-1 mb-2"
          style={{ color: "var(--text)" }}
        >
          {workoutName}
        </p>
      )}

      <RestBar
        restState={restState}
        onOpenRest={() => setShowRestModal(true)}
      />

      <div className="px-4 pb-8 flex flex-col gap-3">
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            exIdx={exIdx}
            lang={lang}
            t={t}
            onUpdateSet={updateSet}
            onToggleSet={toggleSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
            onSetType={setSetType}
            note={ex.note}
            setTimer={setTimer}
            onSkipSetTimer={dismissSetTimer}
          />
        ))}

        <button
          className="btn btn-ghost w-full py-3.5 text-sm"
          style={{ borderStyle: "dashed" }}
          onClick={() => setShowExPicker(true)}
        >
          <Plus size={16} /> {t.addExercise}
        </button>
      </div>

      {showOneRM && <OneRMModal onClose={() => setShowOneRM(false)} />}
      {showRestModal && (
        <RestModal
          restState={restState}
          setRestState={setRestState}
          onClose={() => setShowRestModal(false)}
        />
      )}
      {showExPicker && (
        <ExercisePicker
          onConfirm={addExercises}
          onClose={() => setShowExPicker(false)}
        />
      )}

      {endModal === "confirm" && (
        <ConfirmModal
          title={t.endWorkout}
          message={t.endConfirm}
          cancelLabel={t.cancelWorkout}
          confirmLabel={t.end}
          onCancel={() => {
            setCancelModal(true);
            setEndModal(null);
          }}
          onConfirm={() => {
            setEndModal(null);
            handleEnd();
          }}
        />
      )}

      {cancelModal && (
        <ConfirmModal
          title={t.cancelWorkout}
          message={t.cancelConfirm}
          cancelLabel={t.back}
          confirmLabel={t.confirm}
          onCancel={() => setCancelModal(false)}
          onConfirm={onEnd}
        />
      )}

      {endModal && endModal !== "confirm" && (
        <EndWorkoutModal stats={endModal.stats} onClose={onEnd} />
      )}
    </div>
  );
}