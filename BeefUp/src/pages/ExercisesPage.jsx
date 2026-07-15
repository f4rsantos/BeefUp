import { useMemo, useState } from "react";
import { ChevronLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import {listBaseExercises, getEquipmentOptions, getVariantOptions,getBodyPartLabel, listBodyParts, listEquipmentUsed, getEquipmentLabel, getBaseExercise,} from "../lib/exerciseTree";
import ExerciseDetailPage from "./ExerciseDetailPage";

export default function ExercisesPage({ onBack }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const bodyParts = useMemo(() => listBodyParts(), []);
  const equipmentList = useMemo(() => listEquipmentUsed(), []);
  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listBaseExercises().filter((ex) => {
      const label = lang === "pt" ? ex.namePt : ex.name;
      if (q && !label.toLowerCase().includes(q)) return false;
      if (bodyPart && ex.bodyPart !== bodyPart) return false;
      if (equipment && !ex.equipment.includes(equipment)) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const la = lang === "pt" ? a.namePt : a.name;
      const lb = lang === "pt" ? b.namePt : b.name;
      return la.localeCompare(lb);
    });

    const byLetter = {};
    sorted.forEach((ex) => {
      const label = lang === "pt" ? ex.namePt : ex.name;
      const letter = label[0]?.toUpperCase() ?? "#";
      if (!byLetter[letter]) byLetter[letter] = [];
      byLetter[letter].push(ex);
    });

    return Object.keys(byLetter)
      .sort()
      .map((letter) => ({ letter, items: byLetter[letter] }));
  }, [query, lang, bodyPart, equipment]);

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
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        {groups.length === 0 ? (
          <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "40px 0" }}>
            {t.noResults}
          </p>
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
                          {lang === "pt" ? ex.namePt : ex.name}
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
                              {lang === "pt" ? eq.namePt : eq.name}
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
                              {lang === "pt" ? v.namePt : v.name}
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
      </div>

      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-sheet fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.filters}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowFilters(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col" style={{ gap: 6, marginBottom: 16 }}>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                {t.filterBodyPart}
              </span>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                <button
                  className={`chip ${bodyPart === null ? "active" : ""}`}
                  onClick={() => setBodyPart(null)}
                >
                  {t.allTags}
                </button>
                {bodyParts.map((bp) => (
                  <button
                    key={bp}
                    className={`chip ${bodyPart === bp ? "active" : ""}`}
                    onClick={() => setBodyPart(bodyPart === bp ? null : bp)}
                  >
                    {getBodyPartLabel(bp, lang)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: 6, marginBottom: 20 }}>
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                {t.filterEquipment}
              </span>
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
