import { useMemo, useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { ChevronLeft, Search, SlidersHorizontal, X, LayoutGrid, List, Image as ImageIcon, Plus, ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useApp } from "../context/useApp";
import {
  listBaseExercises,
  filterAndSortExercises,
  groupExercisesByLetter,
  getEquipmentOptions,
  getVariantOptions,
  getVariantGroups,
  canonicalRef,
  parseExerciseRef,
  getBodyPartLabel,
  getMuscleLabel,
  getEquipmentLabel,
  buildExerciseRef,
  BAR_TYPES,
} from "../lib/exerciseTree";
import { localizedName } from "../lib/localizedName";
import { lastUsedChoice } from "../lib/planUtils";
import CustomExerciseEditor from "./CustomExerciseEditor";
import ExerciseFilterModal from "./ExerciseFilterModal";
import "./ExercisePicker.css";

function ChoiceGroup({ label, children }) {
  return (
    <div>
      <p className="section-title xp-group-label">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// `replace` swaps one exercise; the result is a single pick.
export default function AddExercisesPicker({ onConfirm, onClose, replace = null }) {
  const { t, lang, sessions } = useApp();
  const [start] = useState(() => {
    if (!replace) return null;
    const { baseId, equipmentId, variantId } = parseExerciseRef(replace.ref);
    const base = listBaseExercises().find((ex) => ex.id === baseId);
    if (!base) return null;
    return {
      base,
      equipmentId,
      variantIds: variantId ? variantId.split("+") : [],
      barType: equipmentId === "barbell" ? replace.barType || BAR_TYPES[0].id : "",
    };
  });
  const [query, setQuery] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [equipment, setEquipment] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'card'

  const [step, setStep] = useState("list"); // 'list' | 'custom'
  const [activeBase, setActiveBase] = useState(start?.base ?? null);
  const [activeEquipmentId, setActiveEquipmentId] = useState(start?.equipmentId ?? null);
  const [activeBarType, setActiveBarType] = useState(start?.barType ?? "");
  const [selectedVariantIds, setSelectedVariantIds] = useState(start?.variantIds ?? []);
  const [queue, setQueue] = useState([]); // Array of { instanceId, baseId, equipmentId, variantId, barType, ref }
  const [isEditingInstanceId, setIsEditingInstanceId] = useState(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  useEscapeKey(onClose);
  useEscapeKey(() => resetCustomize(), !!activeBase);

  const activeFilterCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const sortedExercises = useMemo(
    () => filterAndSortExercises(listBaseExercises(), { query, bodyPart, equipment, lang }),
    [query, lang, bodyPart, equipment],
  );

  const groups = useMemo(
    () => groupExercisesByLetter(sortedExercises, lang),
    [sortedExercises, lang],
  );

  function resetCustomize() {
    setActiveBase(null);
    setActiveEquipmentId(null);
    setActiveBarType("");
    setSelectedVariantIds([]);
    setIsEditingInstanceId(null);
  }

  function addToQueue(baseId, rawEquipmentId, rawVariantId, barType = "") {
    const ref = canonicalRef(buildExerciseRef(baseId, rawEquipmentId, rawVariantId));
    const { equipmentId, variantId } = parseExerciseRef(ref);
    if (replace) {
      onConfirm([{ ref, barType }]);
      return;
    }
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
    resetCustomize();
  }

  function hasChoices(baseId) {
    const options = getEquipmentOptions(baseId);
    return options.length > 1 || options.some((eq) => eq.id === "barbell") || getVariantGroups(baseId).length > 0;
  }

  // Last used combination
  function initialChoice(base, rawSaved) {
    const saved = rawSaved && {
      ...parseExerciseRef(canonicalRef(buildExerciseRef(base.id, rawSaved.equipmentId, rawSaved.variantId))),
      barType: rawSaved.barType,
    };
    const equipmentIds = getEquipmentOptions(base.id).map((eq) => eq.id);
    const equipmentId = saved && equipmentIds.includes(saved.equipmentId) ? saved.equipmentId : equipmentIds[0] ?? "";
    const validVariants = getVariantOptions(base.id, equipmentId).map((v) => v.id);
    const variantIds = saved?.variantId && saved.equipmentId === equipmentId
      ? saved.variantId.split("+").filter((id) => validVariants.includes(id))
      : [];
    const savedBar = BAR_TYPES.some((b) => b.id === saved?.barType) ? saved.barType : BAR_TYPES[0].id;
    return { equipmentId, variantIds, barType: equipmentId === "barbell" ? savedBar : "" };
  }

  function openCustomize(base, choice, instanceId = null) {
    setActiveBase(base);
    setActiveEquipmentId(choice.equipmentId);
    setActiveBarType(choice.barType);
    setSelectedVariantIds(choice.variantIds);
    setIsEditingInstanceId(instanceId);
  }

  function handleAddClick(base) {
    const choice = initialChoice(base, lastUsedChoice(sessions, base.id));
    if (!hasChoices(base.id)) {
      addToQueue(base.id, choice.equipmentId, "");
      return;
    }
    openCustomize(base, choice);
  }

  function handleEditQueueItem(item) {
    const base = listBaseExercises().find(ex => ex.id === item.baseId);
    if (!base) return;
    const variantIds = item.variantId ? item.variantId.split("+") : [];
    openCustomize(base, { equipmentId: item.equipmentId, variantIds, barType: item.barType }, item.instanceId);
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
    setActiveEquipmentId(equipmentId);
    const valid = getVariantOptions(activeBase.id, equipmentId).map((v) => v.id);
    setSelectedVariantIds((prev) => prev.filter((id) => valid.includes(id)));
    setActiveBarType(equipmentId === "barbell" ? activeBarType || BAR_TYPES[0].id : "");
  }

  // One pick per group; null picks the default.
  function pickVariant(group, variantId) {
    setSelectedVariantIds((prev) => {
      const others = prev.filter((id) => groupByVariant[id] !== group);
      return variantId ? [...others, variantId] : others;
    });
  }

  function confirmCustomize() {
    addToQueue(activeBase.id, activeEquipmentId, selectedVariantIds.join("+"), activeBarType);
  }

  const equipmentOptions = activeBase ? getEquipmentOptions(activeBase.id) : [];
  const variantGroups = activeBase ? getVariantGroups(activeBase.id, activeEquipmentId) : [];
  const groupByVariant = Object.fromEntries(
    variantGroups.flatMap(({ group, options }) => options.map((v) => [v.id, group])),
  );

  if (step === "custom") {
    return <CustomExerciseEditor onClose={() => setStep("list")} onCreated={handleCustomCreated} />;
  }

  return (
    <div className="canvas-bg xp-root" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col h-full">
        <div
          className="flex-1 overflow-y-auto scrollbar-hide page-pad"
          style={{
            paddingBottom: queue.length > 0 ? (isBottomSheetExpanded ? "45vh" : 140) : 24
          }}
        >
          <div className="flex items-center gap-1 xp-head">
            <button className="btn-back" onClick={onClose} aria-label={t.back}>
              <ChevronLeft className="text-body" size={24} />
            </button>
            <h1 className="display text-body xp-title">
              {replace ? t.replaceExercise : t.addExercise}
            </h1>
          </div>

          <div className="flex items-center gap-2 xp-search-row">
              <div className="relative flex items-center flex-1">
                <Search className="text-muted xp-search-icon" size={16} />
                <input
                  className="field w-full xp-search"
                  placeholder={t.searchExercises}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                className="btn btn-ghost relative xp-icon-btn"
                onClick={() => setShowFilters(true)}
                aria-label={t.filters}
              >
                <SlidersHorizontal className="text-body" size={18} />
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center xp-badge">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                className="btn btn-ghost xp-icon-btn"
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
                <p className="text-sm text-center text-muted xp-empty">
                  {t.noResults}
                </p>
              ) : viewMode === "card" ? (
                <div className="grid xp-grid">
                  {sortedExercises.map((ex) => {
                    const count = queue.filter(q => q.baseId === ex.id).length;
                    return (
                      <button
                        key={ex.id}
                        onClick={() => handleAddClick(ex)}
                        className="flex flex-col xp-card"
                        style={{ border: count > 0 ? "1px solid var(--accent)" : "1px solid var(--border)" }}
                      >
                        <div className="flex items-center justify-center text-muted xp-card-art">
                          <ImageIcon size={28} />
                        </div>
                        <div className="xp-card-body">
                          <p className="text-sm font-semibold truncate text-body">
                            {localizedName(ex, lang)}
                          </p>
                          <p className="text-xs mt-0.5 truncate text-muted capitalize">
                            {getMuscleLabel(ex.target, lang)}
                          </p>
                        </div>
                        <div className="xp-card-corner">
                          {count > 0 ? (
                            <div className="flex items-center justify-center xp-count">
                              {count}
                            </div>
                          ) : (
                            <Plus className="xp-plus" size={20} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                groups.map(({ letter, items }) => (
                  <div key={letter} className="flex flex-col xp-group">
                    <div className="xp-letter">
                      <span className="font-bold xp-letter-label">
                        {letter}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {items.map((ex) => {
                        const count = queue.filter(q => q.baseId === ex.id).length;
                        return (
                          <button
                            key={ex.id}
                            className="flex items-center gap-3 xp-row"
                            onClick={() => handleAddClick(ex)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate text-body">
                                {localizedName(ex, lang)}
                              </p>
                              <p className="text-xs mt-0.5 truncate text-muted capitalize">
                                {getBodyPartLabel(ex.bodyPart, lang)}
                              </p>
                            </div>
                            {count > 0 ? (
                              <div className="flex items-center justify-center flex-shrink-0 xp-count xp-count-lg">
                                {count}
                              </div>
                            ) : (
                              <Plus className="xp-plus flex-shrink-0" size={20} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <button
                className="flex items-center gap-3 xp-create"
                onClick={() => setStep("custom")}
              >
                <div className="flex items-center justify-center flex-shrink-0 xp-create-icon">
                  <Plus size={16} />
                </div>
                <span className="text-sm font-semibold">{t.createCustomExercise}</span>
              </button>
            </div>
      </div>

      {activeBase && (
        <div role="dialog" aria-modal="true" className="modal-overlay xp-dialog" onClick={resetCustomize}>
          <div className="modal-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-semibold text-base flex-1 text-body">
                {localizedName(activeBase, lang)}
              </span>
              <button className="btn btn-ghost p-2" onClick={resetCustomize} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>
            {replace && <p className="text-sm text-muted xp-replace-note">{t.replaceExerciseNote}</p>}

            <div className="flex flex-col gap-4">
              {equipmentOptions.length > 1 && (
                <ChoiceGroup label={t.filterEquipment}>
                  {equipmentOptions.map((eq) => (
                    <button
                      key={eq.id}
                      className={`chip ${activeEquipmentId === eq.id ? "active" : ""}`}
                      aria-pressed={activeEquipmentId === eq.id}
                      onClick={() => pickEquipment(eq.id)}
                    >
                      {localizedName(eq, lang)}
                    </button>
                  ))}
                </ChoiceGroup>
              )}

              {activeEquipmentId === "barbell" && (
                <ChoiceGroup label={t.barTypeTitle}>
                  {BAR_TYPES.map((bt) => (
                    <button
                      key={bt.id}
                      className={`chip ${activeBarType === bt.id ? "active" : ""}`}
                      aria-pressed={activeBarType === bt.id}
                      onClick={() => setActiveBarType(bt.id)}
                    >
                      {localizedName(bt, lang)}
                    </button>
                  ))}
                </ChoiceGroup>
              )}

              {variantGroups.map(({ group, defaultOption, options }) => {
                const picked = options.find((v) => selectedVariantIds.includes(v.id));
                return (
                  <ChoiceGroup key={group} label={t[`variantGroup_${group}`]}>
                    <button
                      className={`chip ${picked ? "" : "active"}`}
                      aria-pressed={!picked}
                      onClick={() => pickVariant(group, null)}
                    >
                      {defaultOption ? localizedName(defaultOption, lang) : t.variantNormal}
                    </button>
                    {options.map((v) => {
                      const active = selectedVariantIds.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          className={`chip ${active ? "active" : ""}`}
                          aria-pressed={active}
                          onClick={() => pickVariant(group, v.id)}
                        >
                          {localizedName(v, lang)}
                        </button>
                      );
                    })}
                  </ChoiceGroup>
                );
              })}
            </div>

            <button className="btn btn-primary w-full xp-confirm" onClick={confirmCustomize}>
              {replace ? t.replaceExerciseAction : isEditingInstanceId ? t.save : t.add}
            </button>
            {replace && (
              <button className="btn btn-ghost w-full xp-other" onClick={resetCustomize}>
                {t.replaceExerciseOther}
              </button>
            )}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="xp-sheet">
          <div className="flex flex-col w-full">
            <button
              className="flex items-center justify-between xp-sheet-toggle"
              onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-body">
                  {t.addedExercises}
                </span>
                <span className="flex items-center justify-center xp-count">
                  {queue.length}
                </span>
              </div>
              {isBottomSheetExpanded ? <ChevronDown className="text-body" size={20} /> : <ChevronUp className="text-body" size={20} />}
            </button>
            
            {isBottomSheetExpanded && (
              <div className="flex flex-col overflow-y-auto xp-sheet-list">
                {queue.map((item) => {
                  const base = listBaseExercises().find(ex => ex.id === item.baseId);
                  const equipmentLabel = item.equipmentId && item.equipmentId !== "bodyweight" ? getEquipmentLabel(item.equipmentId, lang) : "";
                  const variantLabel = item.variantId ? item.variantId.split("+").map(v => localizedName(getVariantOptions(item.baseId, item.equipmentId).find(opt => opt.id === v), lang)).join(" + ") : "";
                  
                  let subtitle = [];
                  if (equipmentLabel) subtitle.push(equipmentLabel);
                  if (item.barType) subtitle.push(localizedName(BAR_TYPES.find(b => b.id === item.barType), lang));
                  if (variantLabel) subtitle.push(variantLabel);
                  
                  return (
                    <div key={item.instanceId} className="flex items-center justify-between xp-queue-row">
                      <div className="flex flex-col flex-1 xp-queue-text">
                        <span className="text-sm font-semibold truncate text-body">
                          {base ? localizedName(base, lang) : ""}
                        </span>
                        {subtitle.length > 0 && (
                          <span className="text-xs truncate text-muted xp-queue-sub">
                            {subtitle.join(" • ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasChoices(item.baseId) && (
                          <button className="btn btn-ghost p-2" onClick={() => handleEditQueueItem(item)} aria-label={t.edit}>
                            <Pencil className="text-body" size={18} />
                          </button>
                        )}
                        <button className="btn btn-ghost p-2" onClick={() => handleRemoveQueueItem(item.instanceId)} aria-label={t.delete}>
                          <Trash2 className="text-danger" size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="xp-sheet-footer">
              <button
                className="btn btn-primary w-full py-3"
                onClick={() => onConfirm(queue.map(q => ({ ref: q.ref, barType: q.barType })))}
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

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
