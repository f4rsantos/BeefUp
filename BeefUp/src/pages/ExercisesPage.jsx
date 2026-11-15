import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, Image as ImageIcon, Plus } from "lucide-react";
import { useApp } from "../context/useApp";
import {listBaseExercises, filterAndSortExercises, groupExercisesByLetter, getBodyPartLabel, getMuscleLabel, getBaseExercise,} from "../lib/exerciseTree";
import ExerciseDetailPage from "./ExerciseDetailPage";
import ExerciseFilterModal from "../components/ExerciseFilterModal";
import CustomExerciseEditor from "../components/CustomExerciseEditor";
import { localizedName } from "../lib/localizedName"
import NavHeader from "../components/ui/NavHeader"
import "./ExercisesPage.css"

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
    <div className="flex flex-col h-full canvas-bg">
      <div
        className="flex-1 overflow-y-auto pb-4 scrollbar-hide page-pad"
      >
        <div className="ex-head">
          <NavHeader
            title={t.exercisesTitle}
            onBack={onBack}
            backLabel={t.back}
          />
        </div>

        <div className="flex items-center gap-2 ex-tools">
        <div className="relative flex items-center flex-1">
          <Search className="text-muted ex-search-icon" size={16} />
          <input
            className="field w-full ex-search"
            placeholder={t.searchExercises}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="btn btn-ghost relative ex-tool"
          onClick={() => setShowFilters(true)}
          aria-label={t.filters}
        >
          <SlidersHorizontal className="text-body" size={18} />
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center ex-filter-count">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          className="btn btn-ghost ex-tool"
          onClick={() => setViewMode(viewMode === "list" ? "card" : "list")}
          aria-label={viewMode === "list" ? t.toggleCardView : t.toggleListView}
        >
          {viewMode === "list" ? (
            <LayoutGrid className="text-body" size={18} />
          ) : (
            <List className="text-body" size={18} />
          )}
        </button>
      </div>

        {sortedExercises.length === 0 ? (
          <p className="text-sm text-center text-muted ex-empty">
            {t.noResults}
          </p>
        ) : viewMode === "card" ? (
          <div className="grid ex-grid">
            {sortedExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setSelectedId(ex.id)}
                className="flex flex-col ex-tile"
              >
                <div className="flex items-center justify-center text-muted ex-tile-art">
                  <ImageIcon size={28} />
                </div>
                <div className="ex-tile-text">
                  <p className="text-sm font-semibold truncate text-body">
                    {localizedName(ex, lang)}
                  </p>
                  <p className="text-xs mt-0.5 truncate text-muted ex-capitalize">
                    {getMuscleLabel(ex.target, lang)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          groups.map(({ letter, items }) => (
            <div key={letter} className="flex flex-col ex-group">
              <div className="ex-letter-bar">
                <span className="font-bold ex-letter">
                  {letter}
                </span>
              </div>
              <div className="flex flex-col">
                {items.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => setSelectedId(ex.id)}
                    className="ex-row"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-body">
                        {localizedName(ex, lang)}
                      </span>
                      <span className="text-xs text-muted ex-capitalize">
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
          className="flex items-center gap-3 ex-create"
          onClick={() => setCreatingCustom(true)}
        >
          <div
            className="flex items-center justify-center flex-shrink-0 ex-create-icon"
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
