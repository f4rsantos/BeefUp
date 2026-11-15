import { lazy, Suspense, useMemo } from "react";
import { useApp } from "../context/useApp";
import { exerciseHistory } from "../lib/exerciseHistory";
import "./ExerciseHistory.css";

const ExerciseHistoryChart = lazy(() => import("./ExerciseHistoryChart"));

export default function ExerciseHistory({ exercise }) {
  const { t, lang, sessions } = useApp();
  const { kind, points } = useMemo(() => exerciseHistory(sessions, exercise.id), [sessions, exercise.id]);

  return (
    <section className="card flex flex-col gap-3" aria-label={kind === "distance" ? t.exerciseHistoryDistance : t.exerciseHistoryWeight}>
      <h2 className="text-sm font-semibold text-body">
        {kind === "distance" ? t.exerciseHistoryDistance : t.exerciseHistoryWeight}
      </h2>
      {points.length === 0 ? (
        <p className="text-xs text-muted">{t.exerciseHistoryEmpty}</p>
      ) : (
        <Suspense fallback={<div className="eh-chart" />}>
          <ExerciseHistoryChart points={points} kind={kind} lang={lang} />
        </Suspense>
      )}
    </section>
  );
}
