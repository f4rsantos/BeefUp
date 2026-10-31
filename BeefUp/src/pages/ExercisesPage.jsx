import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, Image as ImageIcon, Plus } from "lucide-react";
import { useApp } from "../context/useApp";
import {listBaseExercises, filterAndSortExercises, groupExercisesByLetter, getBodyPartLabel, getMuscleLabel, getBaseExercise,} from "../lib/exerciseTree";
import ExerciseDetailPage from "./ExerciseDetailPage";
import ExerciseFilterModal from "../components/ExerciseFilterModal";
import CustomExerciseEditor from "../components/CustomExerciseEditor";
import { localizedName } from "../lib/localizedName"
import NavHeader from "../components/ui/NavHeader"

export default function ExercisesPage({ onBack }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'card'
  const [creatingCustom, setCreatingCustom] = useState(false);

  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const sortedExercises = useMemo(
    () => filterAndSortExercises(listBaseExercises(), { query, bodyPart, equipment, lang }),
    [query, lang, bodyPart, equipment],
  );

  const groups = useMemo(
    () => groupExercisesByLetter(sortedExercises, lang),
    [sortedExercises, lang],
  );

  if (creatingCustom) {
    return (
      <CustomExerciseEditor
        onClose={() => setCreatingCustom(false)}
        onCreated={(exercise) => {
          setCreatingCustom(false);
          setSelectedId(exercise.id);
        }}
      />
    );
  }

  if (selectedId) {
    const selected = getBaseExercise(selectedId);
    return <ExerciseDetailPage exercise={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--canvas, var(--bg))" }}>
      <div
        className="flex-1 overflow-y-auto pb-4 scrollbar-hide"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <div style={{ marginBottom: 16 }}>
          <NavHeader
            title={t.exercisesTitle}
            onBack={onBack}
            backLabel={t.back}
          />
        </div>

        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <div className="relative flex items-center flex-1">
          <Search size={16} style={{ position: "absolute", left: 12, color: "var(--muted)" }} />
          <input
            className="field w-full"
            style={{ paddingLeft: 36 }}
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="btn btn-ghost relative"
          style={{ padding: 10 }}
          onClick={() => setShowFilters(true)}
          aria-label={t.filters}
        >
          <SlidersHorizontal size={18} style={{ color: "var(--text)" }} />
          {activeFilterCount > 0 && (
            <span
              className="flex items-center justify-center"
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "var(--accent)",
                color: "var(--bg)",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: 10 }}
          onClick={() => setViewMode(viewMode === "list" ? "card" : "list")}
          aria-label={viewMode === "list" ? t.toggleCardView : t.toggleListView}
        >
          {viewMode === "list" ? (
            <LayoutGrid size={18} style={{ color: "var(--text)" }} />
          ) : (
            <List size={18} style={{ color: "var(--text)" }} />
          )}
        </button>
      </div>

        {sortedExercises.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "40px 0" }}>
            {t.noResults}
          </p>
        ) : viewMode === "card" ? (
          <div
            className="grid"
            style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
          >
            {sortedExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className="flex flex-col"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  overflow: "hidden",
                  textAlign: "left",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    aspectRatio: "1 / 1",
                    background: "var(--surface2)",
                    color: "var(--muted)",
                  }}
                >
                  <ImageIcon size={28} />
                </div>
                <div style={{ padding: "8px 10px 10px" }}>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {localizedName(ex, lang)}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--muted)", textTransform: "capitalize" }}
                  >
                    {getMuscleLabel(ex.target, lang)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          groups.map(({ letter, items }) => (
            <div key={letter} className="flex flex-col" style={{ marginBottom: 4 }}>
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  background: "var(--bar, var(--bg))", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
                  padding: "10px 4px 6px",
                }}
              >
                <span
                  className="font-bold"
                  style={{ fontSize: 13, color: "var(--accent)" }}
                >
                  {letter}
                </span>
              </div>
              <div className="flex flex-col">
                {items.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedId(ex.id)}
                    style={{
                      padding: "10px 4px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {localizedName(ex, lang)}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--muted)", textTransform: "capitalize" }}
                      >
                        {getBodyPartLabel(ex.bodyPart, lang)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <button
          className="flex items-center gap-3"
          onClick={() => setCreatingCustom(true)}
          style={{ padding: "12px 4px", textAlign: "left", width: "100%", color: "var(--accent)" }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: 999, border: "1px dashed var(--accent)" }}
          >
            <Plus size={16} />
          </div>
          <span className="text-sm font-semibold">{t.createCustomExercise}</span>
        </button>
      </div>

      {showFilters && (
        <ExerciseFilterModal
          bodyPart={bodyPart}
          setBodyPart={setBodyPart}
          equipment={equipment}
          setEquipment={setEquipment}
          onClose={() => setShowFilters(false)}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}
