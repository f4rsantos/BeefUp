import { useState, useMemo } from "react";
import { X, Search, Star } from "lucide-react";
import { useApp } from "../context/AppContext";
import exercisesData from "../data/exercises.json";

const ALL_TAGS = [...new Set(exercisesData.flatMap((e) => e.tags))].sort();

export default function ExercisePicker({ onSelect, onClose }) {
  const { t, lang, favouriteExercises, toggleFavouriteExercise } = useApp();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("all");

  const filtered = useMemo(() => {
    let list = [...exercisesData];
    if (activeTag === "favourites") {
      list = list.filter((e) => favouriteExercises.includes(e.id));
    } else if (activeTag !== "all") {
      list = list.filter((e) => e.tags.includes(activeTag));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.namePt.toLowerCase().includes(q),
      );
    }
    // Favourites first
    list.sort((a, b) => {
      const aF = favouriteExercises.includes(a.id);
      const bF = favouriteExercises.includes(b.id);
      return aF === bF ? 0 : aF ? -1 : 1;
    });
    return list;
  }, [query, activeTag, favouriteExercises]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span
            className="font-semibold text-base"
            style={{ color: "var(--text)" }}
          >
            {t.addExercise}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--muted)" }}
          />
          <input
            className="field w-full pl-8"
            type="text"
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
          {["all", "favourites", ...ALL_TAGS].map((tag) => (
            <button
              key={tag}
              className="btn text-xs px-3 py-1.5 whitespace-nowrap"
              style={{
                background:
                  activeTag === tag ? "var(--text)" : "var(--surface2)",
                color: activeTag === tag ? "var(--bg)" : "var(--muted)",
                flexShrink: 0,
              }}
              onClick={() => setActiveTag(tag)}
            >
              {tag === "all"
                ? t.allTags
                : tag === "favourites"
                  ? t.favourites
                  : tag}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto scrollbar-hide">
          {filtered.length === 0 ? (
            <p
              className="text-center py-6 text-sm"
              style={{ color: "var(--muted)" }}
            >
              {t.noResults}
            </p>
          ) : (
            filtered.map((ex) => {
              const isFav = favouriteExercises.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ background: "var(--surface)" }}
                >
                  <button
                    className="flex-1 text-left"
                    onClick={() => onSelect(ex)}
                  >
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--text)" }}
                    >
                      {lang === "pt" ? ex.namePt : ex.name}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--muted)" }}
                    >
                      {ex.tags.join(" · ")}
                    </p>
                  </button>
                  <button
                    className="p-2.5 ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavouriteExercise(ex.id);
                    }}
                  >
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
    </div>
  );
}
