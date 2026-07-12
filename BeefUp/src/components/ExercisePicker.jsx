import { useState, useMemo } from "react";
import { Search, Star, ChevronLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import {
  listBaseExercises,
  getEquipmentOptions,
  getVariantOptions,
  buildExerciseRef,
  getBodyPartLabel,
} from "../lib/exerciseTree";

// 3-step wizard: pick base movement -> pick equipment (if there's a real choice)
// -> pick variant (if the movement has any) -> onSelect(ref).
export default function ExercisePicker({ onSelect, onClose }) {
  const { t, lang, favouriteExercises, toggleFavouriteExercise } = useApp();
  const [query, setQuery] = useState("");
  const [step, setStep] = useState("base"); // 'base' | 'equipment' | 'variant'
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);

  const bases = listBaseExercises();

  const filteredBases = useMemo(() => {
    let list = [...bases];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (b) => b.name.toLowerCase().includes(q) || b.namePt.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const aF = favouriteExercises.includes(a.id);
      const bF = favouriteExercises.includes(b.id);
      return aF === bF ? 0 : aF ? -1 : 1;
    });
    return list;
  }, [bases, query, favouriteExercises]);

  function finish(baseId, equipmentId, variantId) {
    onSelect(buildExerciseRef(baseId, equipmentId, variantId));
  }

  function pickBase(base) {
    const equipmentOptions = getEquipmentOptions(base.id);
    setSelectedBase(base);
    if (equipmentOptions.length > 1) {
      setStep("equipment");
      return;
    }
    const equipmentId = equipmentOptions[0]?.id ?? "";
    const variantOptions = getVariantOptions(base.id);
    if (variantOptions.length > 0) {
      setSelectedEquipmentId(equipmentId);
      setStep("variant");
      return;
    }
    finish(base.id, equipmentId, "");
  }

  function pickEquipment(equipmentId) {
    const variantOptions = getVariantOptions(selectedBase.id);
    if (variantOptions.length > 0) {
      setSelectedEquipmentId(equipmentId);
      setStep("variant");
      return;
    }
    finish(selectedBase.id, equipmentId, "");
  }

  function pickVariant(variantId) {
    finish(selectedBase.id, selectedEquipmentId, variantId);
  }

  function goBack() {
    if (step === "variant") {
      setStep(getEquipmentOptions(selectedBase.id).length > 1 ? "equipment" : "base");
      return;
    }
    setStep("base");
  }

  const equipmentOptions = selectedBase ? getEquipmentOptions(selectedBase.id) : [];
  const variantOptions = selectedBase ? getVariantOptions(selectedBase.id) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="flex items-center gap-2 mb-3">
          {step !== "base" && (
            <button className="btn btn-ghost p-1.5" onClick={goBack} aria-label={t.back}>
              <ChevronLeft size={18} style={{ color: "var(--text)" }} />
            </button>
          )}
          <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)" }}>
            {step === "base"
              ? t.addExercise
              : lang === "pt"
                ? selectedBase.namePt
                : selectedBase.name}
          </h3>
        </div>

        {step === "base" && (
          <>
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

            <div className="flex flex-col gap-2" style={{ maxHeight: "52vh", overflowY: "auto" }}>
              {filteredBases.length === 0 ? (
                <p className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>
                  {t.noResults}
                </p>
              ) : (
                filteredBases.map((base) => {
                  const isFav = favouriteExercises.includes(base.id);
                  return (
                    <div
                      key={base.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                      style={{ background: "var(--surface2)" }}
                    >
                      <button
                        className="p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavouriteExercise(base.id);
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
                      <button
                        className="flex-1 text-left"
                        style={{ minWidth: 0 }}
                        onClick={() => pickBase(base)}
                      >
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text)" }}>
                          {lang === "pt" ? base.namePt : base.name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)", textTransform: "capitalize" }}>
                          {getBodyPartLabel(base.bodyPart, lang)}
                        </p>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {step === "equipment" && (
          <div className="flex flex-wrap gap-2" style={{ paddingBottom: 4 }}>
            {equipmentOptions.map((eq) => (
              <button
                key={eq.id}
                className="chip"
                onClick={() => pickEquipment(eq.id)}
              >
                {lang === "pt" ? eq.namePt : eq.name}
              </button>
            ))}
          </div>
        )}

        {step === "variant" && (
          <div className="flex flex-wrap gap-2" style={{ paddingBottom: 4 }}>
            {variantOptions.map((v) => (
              <button
                key={v.id}
                className="chip"
                onClick={() => pickVariant(v.id)}
              >
                {lang === "pt" ? v.namePt : v.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
