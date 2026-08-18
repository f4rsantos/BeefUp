import { useMemo, useState } from "react";
import { ChevronLeft, Search, SlidersHorizontal, X, LayoutGrid, List, Image as ImageIcon, Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
import {listBaseExercises, matchesExerciseQuery, getEquipmentOptions, getVariantOptions,getBodyPartLabel, getMuscleLabel, listEquipmentUsed, getEquipmentLabel, getBaseExercise,} from "../lib/exerciseTree";
import ExerciseDetailPage from "./ExerciseDetailPage";
import BodyPartFilter from "../components/BodyPartFilter";
import CustomExerciseEditor from "../components/CustomExerciseEditor";
import { localizedName } from "../lib/localizedName"

export default function ExercisesPage({ onBack }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterTab, setFilterTab] = useState("body");
  const [bodyView, setBodyView] = useState("front");
  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'card'
  const [creatingCustom, setCreatingCustom] = useState(false);

  const equipmentList = useMemo(() => listEquipmentUsed(), []);
  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const sortedExercises = useMemo(() => {
    const q = query.trim();
    const filtered = listBaseExercises().filter((ex) => {
      if (!matchesExerciseQuery(ex, q)) return false;
      if (bodyPart && ex.bodyPart !== bodyPart) return false;
      if (equipment && !ex.equipment.includes(equipment)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const la = localizedName(a, lang);
      const lb = localizedName(b, lang);
      return la.localeCompare(lb);
    });
  }, [query, lang, bodyPart, equipment]);

  const groups = useMemo(() => {
    const sorted = sortedExercises;
    const byLetter = {};
    sorted.forEach((ex) => {
      const label = localizedName(ex, lang);
      const letter = label[0]?.toUpperCase() ?? "#";
      if (!byLetter[letter]) byLetter[letter] = [];
      byLetter[letter].push(ex);
    });

    return Object.keys(byLetter)
      .sort()
      .map((letter) => ({ letter, items: byLetter[letter] }));
  }, [sortedExercises, lang]);

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
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 900, color: "var(--text)" }}>
          {t.exercisesTitle}
        </h1>
      </div>

      <div className="px-4 flex items-center gap-2" style={{ marginBottom: 8 }}>
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

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
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
                  background: "var(--bg)",
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
                {items.map((ex) => {
                  const equipmentOptions = getEquipmentOptions(ex.id);
                  const variantOptions = getVariantOptions(ex.id);
                  return (
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
                      {(equipmentOptions.length > 0 || variantOptions.length > 0) && (
                        <div className="flex flex-wrap" style={{ gap: 4, marginTop: 4 }}>
                          {equipmentOptions.map((eq) => (
                            <span
                              key={eq.id}
                              className="text-xs"
                              style={{
                                color: "var(--muted)",
                                background: "var(--surface2)",
                                borderRadius: 6,
                                padding: "1px 6px",
                              }}
                            >
                              {localizedName(eq, lang)}
                            </span>
                          ))}
                          {variantOptions.map((v) => (
                            <span
                              key={v.id}
                              className="text-xs"
                              style={{
                                color: "var(--accent)",
                                background: "var(--accent-soft)",
                                borderRadius: 6,
                                padding: "1px 6px",
                              }}
                            >
                              {localizedName(v, lang)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowFilters(false)}>
          <div
            className="modal-center"
            style={{ maxWidth: filterTab === "body" ? 420 : 380 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.filters}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowFilters(false)} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>

            <div className="pill-toggle" style={{ marginBottom: 16 }}>
              <button
                className={`pill-option ${filterTab === "body" ? "active" : ""}`}
                onClick={() => setFilterTab("body")}
              >
                {t.filterBodyPart}
              </button>
              <button
                className={`pill-option ${filterTab === "equipment" ? "active" : ""}`}
                onClick={() => setFilterTab("equipment")}
              >
                {t.filterEquipment}
              </button>
            </div>

            {filterTab === "body" ? (
              <div style={{ marginBottom: 20 }}>
                <BodyPartFilter
                  bodyPart={bodyPart}
                  setBodyPart={setBodyPart}
                  bodyView={bodyView}
                  setBodyView={setBodyView}
                  lang={lang}
                  t={t}
                />
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: 6, marginBottom: 20 }}>
                <div className="flex flex-wrap" style={{ gap: 6 }}>
                  <button
                    className={`chip ${equipment === null ? "active" : ""}`}
                    onClick={() => setEquipment(null)}
                  >
                    {t.allTags}
                  </button>
                  {equipmentList.map((eq) => (
                    <button
                      key={eq.id}
                      className={`chip ${equipment === eq.id ? "active" : ""}`}
                      onClick={() => setEquipment(equipment === eq.id ? null : eq.id)}
                    >
                      {getEquipmentLabel(eq.id, lang)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1 py-3 text-sm"
                onClick={() => {
                  setBodyPart(null);
                  setEquipment(null);
                }}
              >
                {t.clearFilters}
              </button>
              <button
                className="btn btn-primary flex-1 py-3 text-sm"
                onClick={() => setShowFilters(false)}
              >
                {t.applyFilters}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
