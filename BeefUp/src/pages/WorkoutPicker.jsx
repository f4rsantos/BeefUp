import { useState, useMemo, useEffect } from "react";
import { Star, Search, Play, Dumbbell } from "lucide-react";
import { useApp } from "../context/useApp";
import { getPref, setPref } from "../lib/prefs";
import NavHeader from "../components/ui/NavHeader";
import "./WorkoutPicker.css";

export default function WorkoutPicker({ onSelect, onBack }) {
  const { t, lang, workouts } = useApp();
  const [query, setQuery] = useState("");
  // Favourites come from IndexedDB, so the list renders unsorted for the first
  // frame and re-sorts once they arrive.
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getPref("favWorkouts").then((ids) => {
      if (!cancelled) setFavIds(ids ?? []);
    });
    return () => { cancelled = true; };
  }, []);

  function toggleFav(id) {
    setFavIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setPref("favWorkouts", next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = [...workouts];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const aF = favIds.includes(a.id);
      const bF = favIds.includes(b.id);
      return aF === bF ? 0 : aF ? -1 : 1;
    });
    return list;
  }, [workouts, query, favIds]);

  return (
    <div className="flex flex-col h-full canvas-bg wk-root">
      <div
        className="flex-1 overflow-y-auto pb-24 flex flex-col gap-2.5 scrollbar-hide fade-in page-pad"
      >
        <NavHeader
          title={t.startAnother}
          onBack={onBack}
          backLabel={t.back}
        />

        <div className="wk-search-box">
          <Search className="text-muted wk-search-icon" size={16} />
          <input
            className="field wk-search"
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-16">
            <p className="text-sm text-muted">{t.noResults}</p>
          </div>
        ) : (
          filtered.map((w) => {
            const isFav = favIds.includes(w.id);
            const name = w.name;
            return (
              <div key={w.id} className="card flex items-center gap-3 wk-row">
                <button
                  className="p-1"
                  onClick={() => toggleFav(w.id)}
                  aria-label="favourite"
                >
                  <Star size={18} className={`wk-star${isFav ? " on" : ""}`} />
                </button>
                <button className="flex-1 text-left wk-name" onClick={() => onSelect(w)}>
                  <p className="font-bold text-sm truncate text-body">{name}</p>
                  <p className="text-xs mt-0.5 flex items-center gap-1 text-muted">
                    <Dumbbell size={11} /> {w.exercises?.length ?? 0} {t.exercises}
                  </p>
                </button>
                <button
                  className="btn btn-primary wk-play"
                  onClick={() => onSelect(w)}
                  aria-label={t.startWorkout}
                >
                  <Play size={16} fill="currentColor" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <button
        className="btn btn-primary wk-free"
        onClick={() => onSelect({ id: null, name: lang === "pt" ? "Treino Livre" : "Empty Workout", exercises: [] })}
      >
        {lang === "pt" ? "Treino Livre" : "Empty Workout"}
        <Play size={24} fill="currentColor" />
      </button>
    </div>
  );
}
