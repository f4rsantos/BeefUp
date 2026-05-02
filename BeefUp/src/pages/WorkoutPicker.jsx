import { useState, useMemo } from "react";
import { ArrowLeft, Star, Search } from "lucide-react";
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
      <div className="flex items-center gap-3 px-5 pt-7 pb-4">
        <button className="btn btn-ghost p-2" onClick={onBack}>
          <ArrowLeft size={18} />
        </button>
        <span
          className="font-semibold text-base"
          style={{ color: "var(--text)" }}
        >
          {t.startAnother}
        </span>
      </div>

      <div className="px-4 mb-4 relative">
        <Search
          size={14}
          className="absolute left-7 top-1/2 -translate-y-1/2"
          style={{ color: "var(--muted)" }}
        />
        <input
          className="field w-full pl-8"
          placeholder={t.searchExercises}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3 scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center flex-1 py-16">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t.noResults}
            </p>
          </div>
        ) : (
          filtered.map((w) => {
            const isFav = favIds.includes(w.id);
            const name = lang === "pt" ? w.namePt || w.name : w.name;
            return (
              <div
                key={w.id}
                className="card flex items-center justify-between"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() => onSelect(w)}
                >
                  <p
                    className="font-semibold text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    {name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                    {w.exercises?.length ?? 0} exercícios
                  </p>
                </button>
                <button className="p-2.5 ml-2" onClick={() => toggleFav(w.id)}>
                  <Star
                    size={16}
                    style={{
                      color: isFav ? "var(--text)" : "var(--border)",
                      fill: isFav ? "var(--text)" : "none",
                    }}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
