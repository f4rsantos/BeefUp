import { useState, useEffect, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, nowISO, lastCompletedSets, lastExerciseNote, sessionVolume, sessionSets, bestE1rmByExercise } from "../lib/planUtils";
import { resolveExercise, normalizeWorkoutExercises } from "../lib/exerciseTree";
import { useAudioCues } from "../hooks/useAudioCues";
import WorkoutTopBar from "../components/WorkoutTopBar";
import ExerciseCard from "../components/ExerciseCard";
import ConfirmModal from "../components/ConfirmModal";
import OneRMModal from "../components/OneRMModal";
import RestModal from "../components/RestModal";
import EndWorkoutModal from "../components/EndWorkoutModal";
import ExercisePicker from "../components/ExercisePicker";
import { localizedName } from "../lib/localizedName"

function timerBelongsTo(timer, exIdx, setIdx) {
  return timer?.exIdx === exIdx && (setIdx === undefined || timer?.setIdx === setIdx);
}

// Priority for weight/reps/note when a set isn't covered by real history:
function buildExerciseEntry(ex, lastSets = [], lastNote = "", workoutItem = null) {
  return {
    id: uid(),
    exerciseId: ex.id,
    name: ex.name,
    namePt: ex.namePt,
    note: lastNote || workoutItem?.note || "",
    sets: Array.from({ length: ex.defaultSets }, (_, i) => {
      const last = lastSets[Math.min(i, lastSets.length - 1)];
      const fallbackWeight = workoutItem?.weight || (ex.defaultWeight > 0 ? String(ex.defaultWeight) : "");
      const fallbackReps = workoutItem?.reps || String(ex.defaultReps);
      return {
        id: uid(),
        weight: last ? last.weight : fallbackWeight,
        reps: last ? last.reps : fallbackReps,
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
    return normalizeWorkoutExercises(sourceWorkout.exercises)
      .map((item) => ({ item, ex: resolveExercise(item.ref) }))
      .filter(({ ex }) => ex)
      .map(({ item, ex }) =>
        buildExerciseEntry(ex, lastCompletedSets(sessions, ex.id), lastExerciseNote(sessions, ex.id), item),
      );
  });

  // Shared with MiniWorkoutBar so the clock survives this component being hidden while the workout stays running.
  const [fallbackStart] = useState(() => Date.now());
  const startedAt = activeWorkout?.startedAt ?? fallbackStart;
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000),);
  const [showOneRM, setShowOneRM] = useState(false);
  const [showExPicker, setShowExPicker] = useState(false);
  const [restState, setRestState] = useState(null);
  const [showRestModal, setShowRestModal] = useState(false);
  const [endModal, setEndModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [pendingRemoveExercise, setPendingRemoveExercise] = useState(null);
  const [setTimer, setSetTimer] = useState(null);
  const { unlock: unlockAudio, play: playAudioCue } = useAudioCues();
  const restAnnouncedRef = useRef(null);
  const setTimerAnnouncedKeyRef = useRef(null);

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (!restState?.running) return;
    restAnnouncedRef.current = null; // fresh rest session starting
    const id = setInterval(() => {
      setRestState((prev) => {
        if (!prev) return prev;
        const nextElapsed = prev.elapsed + 1;
        const remaining = prev.duration - nextElapsed;
        if (remaining >= 0 && remaining <= 3 && restAnnouncedRef.current !== remaining) {
          restAnnouncedRef.current = remaining;
          playAudioCue(remaining === 0 ? "done" : "tick");
        }
        if (nextElapsed >= prev.duration) {
          return { ...prev, elapsed: prev.duration, running: false, done: true };
        }
        return { ...prev, elapsed: nextElapsed };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restState?.running, playAudioCue]);

  useEffect(() => {
    if (!setTimer) return;
    const currentEndsAt = setTimer.endsAt;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((currentEndsAt - Date.now()) / 1000),
      );
      if (remaining <= 3) {
        const key = `${currentEndsAt}:${remaining}`;
        if (setTimerAnnouncedKeyRef.current !== key) {
          setTimerAnnouncedKeyRef.current = key;
          playAudioCue(remaining === 0 ? "done" : "tick");
        }
      }
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
  }, [setTimer, playAudioCue]);

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

  const updateNote = useCallback((exIdx, note) => {
    setExercises((prev) => prev.map((e, i) => (i === exIdx ? { ...e, note } : e)));
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
        setSetTimer((prevTimer) => (timerBelongsTo(prevTimer, exIdx, setIdx) ? null : prevTimer));
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
    setSetTimer((prevTimer) => (timerBelongsTo(prevTimer, exIdx, setIdx) ? null : prevTimer));
  }, []);

  const removeExercise = useCallback((exIdx) => {
    setExercises((prev) => prev.filter((_, i) => i !== exIdx));
    setSetTimer((prevTimer) => (timerBelongsTo(prevTimer, exIdx) ? null : prevTimer));
  }, []);

  const addExercises = useCallback((refs) => {
    const entries = refs
      .map(resolveExercise)
      .filter(Boolean)
      .map((ex) => buildExerciseEntry(ex, lastCompletedSets(sessions, ex.id), lastExerciseNote(sessions, ex.id)));
    if (entries.length === 0) return;
    setExercises((prev) => [...prev, ...entries]);
    setShowExPicker(false);
  }, [sessions]);

  async function handleEnd() {
    const duration = Math.floor((Date.now() - startedAt) / 1000);

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

    // session.exercises[].sets already excludes not-done sets (filtered
    // above), so the shared warmup-excluding helpers can run on it directly
    // instead of a second hand-rolled reduction over the raw `exercises`
    // state — this is also what History/Progress compute for the same
    // session once persisted, so the numbers can't drift apart.
    const totalSets = sessionSets(session);
    const totalVolume = sessionVolume(session);

    const priorBest = bestE1rmByExercise(sessions);
    const currentBest = bestE1rmByExercise([session]);
    const prs = session.exercises
      .filter((e) => currentBest[e.exerciseId] > (priorBest[e.exerciseId] || 0))
      .map((e) => localizedName(e, lang));

    await addSession(session);
    playAudioCue("finish");
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
      onPointerDownCapture={unlockAudio}
    >
      <WorkoutTopBar
        elapsed={elapsed}
        restState={restState}
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
            onRemoveExercise={setPendingRemoveExercise}
            onSetType={setSetType}
            note={ex.note}
            onUpdateNote={updateNote}
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

      {pendingRemoveExercise !== null && (
        <ConfirmModal
          title={t.removeExerciseTitle}
          message={t.removeExerciseConfirm}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingRemoveExercise(null)}
          onConfirm={() => {
            removeExercise(pendingRemoveExercise);
            setPendingRemoveExercise(null);
          }}
        />
      )}
    </div>
  );
}