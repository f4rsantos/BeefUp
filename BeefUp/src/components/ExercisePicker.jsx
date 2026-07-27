import { useMemo, useState } from "react";
import { ChevronLeft, Search, SlidersHorizontal, X, Check, CheckCircle2, Circle, LayoutGrid, List, Image as ImageIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  listBaseExercises,
  getEquipmentOptions,
  getVariantOptions,
  getBodyPartLabel,
  getMuscleLabel,
  listBodyParts,
  listEquipmentUsed,
  getEquipmentLabel,
  buildExerciseRef,
} from "../lib/exerciseTree";

// Full-screen multi-select picker used while a workout is running
export default function AddExercisesPicker({ onConfirm, onClose }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'card'

  const [step, setStep] = useState("list"); // 'list' | 'equipment' | 'variant'
  const [activeBase, setActiveBase] = useState(null);
  const [activeEquipmentId, setActiveEquipmentId] = useState(null);
  const [queue, setQueue] = useState(() => new Map()); // baseId -> ref

  const bodyParts = useMemo(() => listBodyParts(), []);
  const equipmentList = useMemo(() => listEquipmentUsed(), []);
  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const sortedExercises = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = listBaseExercises().filter((ex) => {
      const label = lang === "pt" ? ex.namePt : ex.name;
      if (q && !label.toLowerCase().includes(q)) return false;
      if (bodyPart && ex.bodyPart !== bodyPart) return false;
      if (equipment && !ex.equipment.includes(equipment)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const la = lang === "pt" ? a.namePt : a.name;
      const lb = lang === "pt" ? b.namePt : b.name;
      return la.localeCompare(lb);
    });
  }, [query, lang, bodyPart, equipment]);

  const groups = useMemo(() => {
    const sorted = sortedExercises;
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
  }, [sortedExercises, lang]);

  function addToQueue(baseId, equipmentId, variantId) {
    setQueue((prev) => {
      const next = new Map(prev);
      next.set(baseId, buildExerciseRef(baseId, equipmentId, variantId));
      return next;
    });
    setStep("list");
    setActiveBase(null);
    setActiveEquipmentId(null);
  }

  function toggleRow(base) {
    if (queue.has(base.id)) {
      setQueue((prev) => {
        const next = new Map(prev);
        next.delete(base.id);
        return next;
      });
      return;
    }

    const equipmentOptions = getEquipmentOptions(base.id);
    const variantOptions = getVariantOptions(base.id);
    setActiveBase(base);
    if (equipmentOptions.length > 1) {
      setStep("equipment");
      return;
    }
    const equipmentId = equipmentOptions[0]?.id ?? "";
    if (variantOptions.length > 0) {
      setActiveEquipmentId(equipmentId);
      setStep("variant");
      return;
    }
    addToQueue(base.id, equipmentId, "");
  }

  function pickEquipment(equipmentId) {
    const variantOptions = getVariantOptions(activeBase.id);
    if (variantOptions.length > 0) {
      setActiveEquipmentId(equipmentId);
      setStep("variant");
      return;
    }
    addToQueue(activeBase.id, equipmentId, "");
  }

  function pickVariant(variantId) {
    addToQueue(activeBase.id, activeEquipmentId, variantId);
  }

  function backFromCustomize() {
    if (step === "variant" && getEquipmentOptions(activeBase.id).length > 1) {
      setStep("equipment");
      return;
    }
    cancelCustomize();
  }

  function cancelCustomize() {
    setStep("list");
    setActiveBase(null);
    setActiveEquipmentId(null);
  }

  const equipmentOptions = activeBase ? getEquipmentOptions(activeBase.id) : [];
  const variantOptions = activeBase ? getVariantOptions(activeBase.id) : [];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "var(--bg)" }}>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
          <button className="btn-back" onClick={onClose} aria-label={t.back}>
            <ChevronLeft size={24} style={{ color: "var(--text)" }} />
          </button>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
            {t.addExercise}
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
                  autoFocus
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

            <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
              {sortedExercises.length === 0 ? (
                <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "40px 0" }}>
                  {t.noResults}
                </p>
              ) : viewMode === "card" ? (
                <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {sortedExercises.map((ex) => {
                    const selected = queue.has(ex.id);
                    return (
                      <button
                        key={ex.id}
                        onClick={() => toggleRow(ex)}
                        className="flex flex-col"
                        style={{
                          background: "var(--surface)",
                          border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                          borderRadius: 14,
                          overflow: "hidden",
                          textAlign: "left",
                          position: "relative",
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
                            {lang === "pt" ? ex.namePt : ex.name}
                          </p>
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--muted)", textTransform: "capitalize" }}
                          >
                            {getMuscleLabel(ex.target, lang)}
                          </p>
                        </div>
                        <div style={{ position: "absolute", top: 6, right: 6 }}>
                          {selected ? (
                            <CheckCircle2 size={20} style={{ color: "var(--accent)" }} />
                          ) : (
                            <Circle size={20} style={{ color: "var(--border)" }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
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
                      <span className="font-bold" style={{ fontSize: 13, color: "var(--accent)" }}>
                        {letter}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {items.map((ex) => {
                        const selected = queue.has(ex.id);
                        return (
                          <button
                            key={ex.id}
                            className="flex items-center gap-3"
                            onClick={() => toggleRow(ex)}
                            style={{
                              padding: "10px 4px",
                              borderBottom: "1px solid var(--border)",
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <div className="flex-1" style={{ minWidth: 0 }}>
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                                {lang === "pt" ? ex.namePt : ex.name}
                              </p>
                              <p
                                className="text-xs mt-0.5 truncate"
                                style={{ color: "var(--muted)", textTransform: "capitalize" }}
                              >
                                {getBodyPartLabel(ex.bodyPart, lang)}
                              </p>
                            </div>
                            {selected ? (
                              <CheckCircle2 size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            ) : (
                              <Circle size={20} style={{ color: "var(--border)", flexShrink: 0 }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
      </div>

      {activeBase && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={cancelCustomize}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              {step === "variant" && getEquipmentOptions(activeBase.id).length > 1 && (
                <button className="btn btn-ghost p-1.5" onClick={backFromCustomize} aria-label={t.back}>
                  <ChevronLeft size={18} style={{ color: "var(--text)" }} />
                </button>
              )}
              <span className="font-semibold text-base flex-1" style={{ color: "var(--text)" }}>
                {lang === "pt" ? activeBase.namePt : activeBase.name}
              </span>
              <button className="btn btn-ghost p-2" onClick={cancelCustomize}>
                <X size={18} />
              </button>
            </div>

            {step === "equipment" && (
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((eq) => (
                  <button key={eq.id} className="chip" onClick={() => pickEquipment(eq.id)}>
                    {lang === "pt" ? eq.namePt : eq.name}
                  </button>
                ))}
              </div>
            )}

            {step === "variant" && (
              <div className="flex flex-wrap gap-2">
                {variantOptions.map((v) => (
                  <button key={v.id} className="chip" onClick={() => pickVariant(v.id)}>
                    {lang === "pt" ? v.namePt : v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {queue.size > 0 && (
        <button
          className="btn btn-primary flex items-center justify-center"
          onClick={() => onConfirm([...queue.values()])}
          aria-label={t.confirm}
          style={{
            position: "absolute",
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 999,
            boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,0.25))",
          }}
        >
          <Check size={22} />
          <span
            className="flex items-center justify-center"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "var(--bg)",
              color: "var(--accent)",
              fontSize: 11,
              fontWeight: 800,
              border: "1px solid var(--border)",
            }}
          >
            {queue.size}
          </span>
        </button>
      )}

      {showFilters && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowFilters(false)}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
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
