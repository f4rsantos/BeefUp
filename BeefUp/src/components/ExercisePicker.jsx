import { useState, useMemo } from "react";
import { Search, Star, Plus } from "lucide-react";
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
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h3 className="display mb-3" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
          {t.addExercise}
        </h3>

        {/* Search */}
        <div className="mb-3" style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }} />
          <input
            className="field"
            style={{ paddingLeft: 36 }}
            type="text"
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tag filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
          {["all", "favourites", ...ALL_TAGS].map((tag) => (
            <button
              key={tag}
              className={`chip ${activeTag === tag ? "active" : ""}`}
              style={{ flexShrink: 0, textTransform: "capitalize" }}
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
        <div className="flex flex-col gap-2" style={{ maxHeight: "52vh", overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>
              {t.noResults}
            </p>
          ) : (
            filtered.map((ex) => {
              const isFav = favouriteExercises.includes(ex.id);
              return (
                <div
                  key={ex.id}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "var(--surface2)" }}
                >
                  <button
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavouriteExercise(ex.id);
                    }}
                    aria-label="favourite"
                  >
                    <Star
                      size={17}
                      style={{
                        color: isFav ? "var(--accent-2)" : "var(--border)",
                        fill: isFav ? "var(--accent-2)" : "none",
                      }}
                    />
                  </button>
                  <button className="flex-1 text-left" style={{ minWidth: 0 }} onClick={() => onSelect(ex)}>
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                      {lang === "pt" ? ex.namePt : ex.name}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)", textTransform: "capitalize" }}>
                      {ex.tags.join(" · ")}
                    </p>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: 8 }}
                    onClick={() => onSelect(ex)}
                    aria-label={t.add}
                  >
                    <Plus size={16} />
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
