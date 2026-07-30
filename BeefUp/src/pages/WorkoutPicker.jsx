import { useState, useMemo } from "react";
import { ChevronLeft, Star, Search, Play, Dumbbell } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getLS, setLS } from "../lib/crypto";

export default function WorkoutPicker({ onSelect, onBack }) {
  const { t, lang, workouts } = useApp();
  const [query, setQuery] = useState("");
  const [favIds, setFavIds] = useState(() => getLS("favWorkouts", []));

  function toggleFav(id) {
    setFavIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setLS("favWorkouts", next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = [...workouts];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          (w.namePt || "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const aF = favIds.includes(a.id);
      const bF = favIds.includes(b.id);
      return aF === bF ? 0 : aF ? -1 : 1;
    });
    return list;
  }, [workouts, query, favIds]);

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "34px 12px 14px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>
          {t.startAnother}
        </h1>
      </div>

      <div className="px-4 mb-3" style={{ position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 28, top: 13, color: "var(--muted)" }} />
        <input
          className="field"
          style={{ paddingLeft: 38 }}
          placeholder={t.searchExercises}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-2.5 scrollbar-hide fade-in">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-16">
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noResults}</p>
          </div>
        ) : (
          filtered.map((w) => {
            const isFav = favIds.includes(w.id);
            const name = lang === "pt" ? w.namePt || w.name : w.name;
            return (
              <div key={w.id} className="card flex items-center gap-3" style={{ padding: 14 }}>
                <button
                  className="p-1"
                  onClick={() => toggleFav(w.id)}
                  aria-label="favourite"
                >
                  <Star
                    size={18}
                    style={{
                      color: isFav ? "var(--accent-2)" : "var(--border)",
                      fill: isFav ? "var(--accent-2)" : "none",
                    }}
                  />
                </button>
                <button className="flex-1 text-left" style={{ minWidth: 0 }} onClick={() => onSelect(w)}>
                  <p className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{name}</p>
                  <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--muted)" }}>
                    <Dumbbell size={11} /> {w.exercises?.length ?? 0} {lang === "pt" ? "exercícios" : "exercises"}
                  </p>
                </button>
                <button
                  className="btn btn-primary"
                  style={{ padding: "8px 12px" }}
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
    </div>
  );
}
