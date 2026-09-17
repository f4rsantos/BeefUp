import { useMemo, useState } from "react";
import { ChevronLeft, Search, SlidersHorizontal, X, Check, CheckCircle2, Circle, LayoutGrid, List, Image as ImageIcon, Plus, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  listBaseExercises,
  filterAndSortExercises,
  groupExercisesByLetter,
  getEquipmentOptions,
  getVariantOptions,
  getBodyPartLabel,
  getMuscleLabel,
  listBodyParts,
  listEquipmentUsed,
  getEquipmentLabel,
  buildExerciseRef,
  BAR_TYPES,
} from "../lib/exerciseTree";
import { localizedName } from "../lib/localizedName";
import CustomExerciseEditor from "./CustomExerciseEditor";

export default function AddExercisesPicker({ onConfirm, onClose }) {
  const { t, lang } = useApp();
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'card'

  const [step, setStep] = useState("list"); // 'list' | 'equipment' | 'bartype' | 'variant' | 'custom'
  const [activeBase, setActiveBase] = useState(null);
  const [activeEquipmentId, setActiveEquipmentId] = useState(null);
  const [activeBarType, setActiveBarType] = useState("");
  const [selectedVariantIds, setSelectedVariantIds] = useState([]);
  const [queue, setQueue] = useState([]); // Array of { instanceId, baseId, equipmentId, variantId, barType, ref }
  const [isEditingInstanceId, setIsEditingInstanceId] = useState(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);

  const bodyParts = useMemo(() => listBodyParts(), []);
  const equipmentList = useMemo(() => listEquipmentUsed(), []);
  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const sortedExercises = useMemo(
    () => filterAndSortExercises(listBaseExercises(), { query, bodyPart, equipment, lang }),
    [query, lang, bodyPart, equipment],
  );

  const groups = useMemo(
    () => groupExercisesByLetter(sortedExercises, lang),
    [sortedExercises, lang],
  );

  function addToQueue(baseId, equipmentId, variantId, barType = "") {
    const ref = buildExerciseRef(baseId, equipmentId, variantId);
    setQueue((prev) => {
      if (isEditingInstanceId) {
        return prev.map(item => item.instanceId === isEditingInstanceId 
          ? { ...item, baseId, equipmentId, variantId, barType, ref } 
          : item);
      }
      return [...prev, { instanceId: crypto.randomUUID(), baseId, equipmentId, variantId, barType, ref }];
    });
    setIsBottomSheetExpanded(true);
    setStep("list");
    setActiveBase(null);
    setActiveEquipmentId(null);
    setActiveBarType("");
    setSelectedVariantIds([]);
    setIsEditingInstanceId(null);
  }

  function proceedAfterEquipment(baseId, equipmentId) {
    setSelectedVariantIds([]);
    if (equipmentId === "barbell") {
      setActiveEquipmentId(equipmentId);
      setStep("bartype");
      return;
    }
    const variantOptions = getVariantOptions(baseId, equipmentId);
    if (variantOptions.length > 0) {
      setActiveEquipmentId(equipmentId);
      setStep("variant");
      return;
    }
    addToQueue(baseId, equipmentId, "");
  }

  function handleAddClick(base) {
    setIsEditingInstanceId(null);
    const equipmentOptions = getEquipmentOptions(base.id);
    setActiveBase(base);
    if (equipmentOptions.length > 1) {
      setStep("equipment");
      return;
    }
    proceedAfterEquipment(base.id, equipmentOptions[0]?.id ?? "");
  }

  function handleEditQueueItem(item) {
    const base = listBaseExercises().find(ex => ex.id === item.baseId);
    if (!base) return;
    setActiveBase(base);
    setActiveEquipmentId(item.equipmentId);
    setActiveBarType(item.barType);
    setSelectedVariantIds(item.variantId ? item.variantId.split("+") : []);
    setIsEditingInstanceId(item.instanceId);
    
    const equipOpts = getEquipmentOptions(item.baseId);
    if (equipOpts.length > 1) {
      setStep("equipment");
    } else {
      const variantOpts = getVariantOptions(item.baseId, item.equipmentId);
      if (variantOpts.length > 0) {
        setStep("variant");
      }
    }
  }

  function handleRemoveQueueItem(instanceId) {
    setQueue((prev) => {
      const next = prev.filter(item => item.instanceId !== instanceId);
      if (next.length === 0) setIsBottomSheetExpanded(false);
      return next;
    });
  }

  function handleCustomCreated(exercise) {
    setStep("list");
    handleAddClick(exercise);
  }

  function pickEquipment(equipmentId) {
    proceedAfterEquipment(activeBase.id, equipmentId);
  }

  function pickBarType(barType) {
    setActiveBarType(barType);
    setSelectedVariantIds([]);
    const variantOptions = getVariantOptions(activeBase.id, activeEquipmentId);
    if (variantOptions.length > 0) {
      setStep("variant");
      return;
    }
    addToQueue(activeBase.id, activeEquipmentId, "", barType);
  }

  function toggleVariant(variantId) {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }

  function confirmVariants() {
    addToQueue(activeBase.id, activeEquipmentId, selectedVariantIds.join("+"), activeBarType);
  }

  function backFromCustomize() {
    if (step === "variant" && activeEquipmentId === "barbell") {
      setStep("bartype");
      return;
    }
    if ((step === "variant" || step === "bartype") && getEquipmentOptions(activeBase.id).length > 1) {
      setStep("equipment");
      return;
    }
    cancelCustomize();
  }

  function cancelCustomize() {
    setStep("list");
    setActiveBase(null);
    setActiveEquipmentId(null);
    setActiveBarType("");
    setIsEditingInstanceId(null);
  }

  const equipmentOptions = activeBase ? getEquipmentOptions(activeBase.id) : [];
  const variantOptions = activeBase ? getVariantOptions(activeBase.id, activeEquipmentId) : [];

  if (step === "custom") {
    return <CustomExerciseEditor onClose={() => setStep("list")} onCreated={handleCustomCreated} />;
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "var(--bg)" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col h-full">
        <div
          className="flex-1 overflow-y-auto scrollbar-hide"
          style={{ 
            paddingTop: "var(--page-py-top)", 
            paddingLeft: "var(--page-px)", 
            paddingRight: "var(--page-px)",
            paddingBottom: queue.length > 0 ? (isBottomSheetExpanded ? "45vh" : 140) : 24
          }}
        >
          <div className="flex items-center gap-1" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={onClose} aria-label={t.back}>
              <ChevronLeft size={24} style={{ color: "var(--text)" }} />
            </button>
            <h1 className="display" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
              {t.addExercise}
            </h1>
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

              {sortedExercises.length === 0 ? (
                <p className="text-sm text-center" style={{ color: "var(--muted)", padding: "40px 0" }}>
                  {t.noResults}
                </p>
              ) : viewMode === "card" ? (
                <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {sortedExercises.map((ex) => {
                    const count = queue.filter(q => q.baseId === ex.id).length;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleAddClick(ex)}
                        className="flex flex-col"
                        style={{
                          background: "var(--surface)",
                          border: count > 0 ? "1px solid var(--accent)" : "1px solid var(--border)",
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
                            {localizedName(ex, lang)}
                          </p>
                          <p
                            className="text-xs mt-0.5 truncate"
                            style={{ color: "var(--muted)", textTransform: "capitalize" }}
                          >
                            {getMuscleLabel(ex.target, lang)}
                          </p>
                        </div>
                        <div style={{ position: "absolute", top: 6, right: 6 }}>
                          {count > 0 ? (
                            <div className="flex items-center justify-center" style={{ width: 20, height: 20, borderRadius: 999, background: "var(--accent)", color: "var(--bg)", fontSize: 11, fontWeight: 800 }}>
                              {count}
                            </div>
                          ) : (
                            <Plus size={20} style={{ color: "var(--border)" }} />
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
                        const count = queue.filter(q => q.baseId === ex.id).length;
                        return (
                          <button
                            key={ex.id}
                            className="flex items-center gap-3"
                            onClick={() => handleAddClick(ex)}
                            style={{
                              padding: "10px 4px",
                              borderBottom: "1px solid var(--border)",
                              textAlign: "left",
                              width: "100%",
                            }}
                          >
                            <div className="flex-1" style={{ minWidth: 0 }}>
                              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                                {localizedName(ex, lang)}
                              </p>
                              <p
                                className="text-xs mt-0.5 truncate"
                                style={{ color: "var(--muted)", textTransform: "capitalize" }}
                              >
                                {getBodyPartLabel(ex.bodyPart, lang)}
                              </p>
                            </div>
                            {count > 0 ? (
                              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 22, height: 22, borderRadius: 999, background: "var(--accent)", color: "var(--bg)", fontSize: 12, fontWeight: 800 }}>
                                {count}
                              </div>
                            ) : (
                              <Plus size={20} style={{ color: "var(--border)", flexShrink: 0 }} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <button
                className="flex items-center gap-3"
                onClick={() => setStep("custom")}
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
      </div>

      {activeBase && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={cancelCustomize}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              {(step === "bartype" || step === "variant") &&
                (activeEquipmentId === "barbell" || getEquipmentOptions(activeBase.id).length > 1) && (
                <button className="btn btn-ghost p-1.5" onClick={backFromCustomize} aria-label={t.back}>
                  <ChevronLeft size={18} style={{ color: "var(--text)" }} />
                </button>
              )}
              <span className="font-semibold text-base flex-1" style={{ color: "var(--text)" }}>
                {localizedName(activeBase, lang)}
              </span>
              <button className="btn btn-ghost p-2" onClick={cancelCustomize} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>

            {step === "equipment" && (
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((eq) => (
                  <button key={eq.id} className="chip" onClick={() => pickEquipment(eq.id)}>
                    {localizedName(eq, lang)}
                  </button>
                ))}
              </div>
            )}

            {step === "bartype" && (
              <div className="flex flex-wrap gap-2">
                {BAR_TYPES.map((bt) => (
                  <button key={bt.id} className="chip" onClick={() => pickBarType(bt.id)}>
                    {localizedName(bt, lang)}
                  </button>
                ))}
              </div>
            )}

            {step === "variant" && (
              <>
                <div className="flex flex-wrap gap-2">
                  {variantOptions.map((v) => (
                    <button
                      key={v.id}
                      className={`chip ${selectedVariantIds.includes(v.id) ? "active" : ""}`}
                      onClick={() => toggleVariant(v.id)}
                    >
                      {localizedName(v, lang)}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-primary w-full mt-4"
                  style={{ marginTop: 16 }}
                  disabled={selectedVariantIds.length === 0}
                  onClick={confirmVariants}
                >
                  {t.confirm}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--surface)",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: "0 -4px 16px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            zIndex: 10,
            paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          }}
        >
          <div className="flex flex-col w-full">
            <button
              className="flex items-center justify-between"
              style={{ padding: "16px 20px" }}
              onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-base" style={{ color: "var(--text)" }}>
                  {t.addedExercises}
                </span>
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {queue.length}
                </span>
              </div>
              {isBottomSheetExpanded ? <ChevronDown size={20} style={{ color: "var(--text)" }} /> : <ChevronUp size={20} style={{ color: "var(--text)" }} />}
            </button>
            
            {isBottomSheetExpanded && (
              <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "40vh" }}>
                {queue.map((item) => {
                  const base = listBaseExercises().find(ex => ex.id === item.baseId);
                  const equipmentLabel = item.equipmentId && item.equipmentId !== "bodyweight" ? getEquipmentLabel(item.equipmentId, lang) : "";
                  const variantLabel = item.variantId ? item.variantId.split("+").map(v => localizedName(getVariantOptions(item.baseId, item.equipmentId).find(opt => opt.id === v), lang)).join(" + ") : "";
                  
                  let subtitle = [];
                  if (equipmentLabel) subtitle.push(equipmentLabel);
                  if (item.barType) subtitle.push(localizedName(BAR_TYPES.find(b => b.id === item.barType), lang));
                  if (variantLabel) subtitle.push(variantLabel);
                  
                  return (
                    <div key={item.instanceId} className="flex items-center justify-between" style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
                      <div className="flex flex-col flex-1" style={{ minWidth: 0, paddingRight: 12 }}>
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                          {base ? localizedName(base, lang) : ""}
                        </span>
                        {subtitle.length > 0 && (
                          <span className="text-xs truncate" style={{ color: "var(--muted)", marginTop: 2 }}>
                            {subtitle.join(" • ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button className="btn btn-ghost p-2" onClick={() => handleEditQueueItem(item)} aria-label={t.edit}>
                          <Pencil size={18} style={{ color: "var(--text)" }} />
                        </button>
                        <button className="btn btn-ghost p-2" onClick={() => handleRemoveQueueItem(item.instanceId)} aria-label={t.delete}>
                          <Trash2 size={18} style={{ color: "var(--error)" }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ padding: "12px 20px 0 20px" }}>
              <button
                className="btn btn-primary w-full py-3"
                onClick={() => onConfirm(queue.map(q => q.ref))}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilters && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowFilters(false)}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.filters}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowFilters(false)} aria-label={t.cancel}>
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
