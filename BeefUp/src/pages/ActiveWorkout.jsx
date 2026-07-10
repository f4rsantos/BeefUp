import { useState, useEffect, useRef, useCallback } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, nowISO } from "../lib/planUtils";
import exercisesData from "../data/exercises.json";
import WorkoutTopBar from "../components/WorkoutTopBar";
import RestBar from "../components/RestBar";
import ExerciseCard from "../components/ExerciseCard";
import ConfirmModal from "../components/ConfirmModal";
import OneRMModal from "../components/OneRMModal";
import RestModal from "../components/RestModal";
import EndWorkoutModal from "../components/EndWorkoutModal";
import ExercisePicker from "../components/ExercisePicker";

function buildExerciseEntry(ex) {
  return {
    id: uid(),
    exerciseId: ex.id,
    name: ex.name,
    namePt: ex.namePt,
    note: "",
    sets: Array.from({ length: ex.defaultSets }, () => ({
      id: uid(),
      weight: ex.defaultWeight > 0 ? String(ex.defaultWeight) : "",
      reps: String(ex.defaultReps),
      done: false,
    })),
  };
}

export default function ActiveWorkout({ onEnd }) {
  const { t, lang, activeWorkout, workouts, addSession } = useApp();
  const sourceWorkout =
    workouts.find((w) => w.id === activeWorkout?.workoutId) ?? null;
  const restAfterSet = sourceWorkout?.restAfterSet ?? 120;
  const [exercises, setExercises] = useState(() => {
    if (!sourceWorkout) return [];
    return sourceWorkout.exercises
      .map((exId) => {
        const ex = exercisesData.find((e) => e.id === exId);
        return ex ? buildExerciseEntry(ex) : null;
      })
      .filter(Boolean);
  });

  const startTime = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [showOneRM, setShowOneRM] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [restState, setRestState] = useState(null);
  const [showRestModal, setShowRestModal] = useState(false);
  const [endModal, setEndModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [setTimer, setSetTimer] = useState(null);

  useEffect(() => {
    startTime.current = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

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
          sets: e.sets.map((s, j) =>
            j === setIdx ? { ...s, [field]: val } : s,
          ),
        };
      }),
    );
  }, []);

  const updateExerciseNote = useCallback((exIdx, val) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === exIdx ? { ...e, note: val } : e)),
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

  const addExercise = useCallback((ex) => {
    setExercises((prev) => [...prev, buildExerciseEntry(ex)]);
    setShowExPicker(false);
  }, []);

  async function handleEnd() {
    const duration = Math.floor((Date.now() - startTime.current) / 1000);
    let totalSets = 0;
    let totalVolume = 0;
    exercises.forEach((e) => {
      e.sets.forEach((s) => {
        if (s.done) {
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
            .map((s) => ({ weight: s.weight, reps: s.reps })),
        }))
        .filter((e) => e.sets.length > 0),
    };

    await addSession(session);
    setEndModal({ stats: { duration, totalSets, totalVolume } });
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
      />

      {workoutName && (
        <p
          className="text-center text-lg font-semibold mt-1 mb-2"
          style={{ color: "var(--fg)" }}
        >
          {workoutName}
        </p>
      )}

      <RestBar
        restState={restState}
        onOpenRest={() => setShowRestModal(true)}
      />

      <div className="px-4 pb-6 flex flex-col gap-4">
        {exercises.map((ex, exIdx) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            exIdx={exIdx}
            lang={lang}
            onUpdateSet={updateSet}
            onToggleSet={toggleSet}
            onAddSet={addSet}
            onRemoveSet={removeSet}
            onRemoveExercise={removeExercise}
            note={ex.note}
            onUpdateNote={updateExerciseNote}
            setTimer={setTimer}
            onSkipSetTimer={dismissSetTimer}
          />
        ))}

        <button
          className="btn btn-ghost w-full py-3 text-sm"
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
          onSelect={addExercise}
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