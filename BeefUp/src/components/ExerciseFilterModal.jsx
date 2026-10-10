import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { listEquipmentUsed, getEquipmentLabel } from "../lib/exerciseTree";
import BodyPartFilter from "./BodyPartFilter";

// One filter for the exercise list and the add-exercise picker.
export default function ExerciseFilterModal({ bodyPart, setBodyPart, equipment, setEquipment, onClose, lang, t }) {
  const [tab, setTab] = useState("body");
  const [bodyView, setBodyView] = useState("front");
  const equipmentList = useMemo(() => listEquipmentUsed(), []);
  useEscapeKey(onClose);

  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div
        className="modal-center"
        style={{ maxWidth: tab === "body" ? 420 : 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {t.filters}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <div className="pill-toggle" style={{ marginBottom: 16 }}>
          <button
            className={`pill-option ${tab === "body" ? "active" : ""}`}
            onClick={() => setTab("body")}
          >
            {t.filterBodyPart}
          </button>
          <button
            className={`pill-option ${tab === "equipment" ? "active" : ""}`}
            onClick={() => setTab("equipment")}
          >
            {t.filterEquipment}
          </button>
        </div>

        {tab === "body" ? (
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
          <button className="btn btn-primary flex-1 py-3 text-sm" onClick={onClose}>
            {t.applyFilters}
          </button>
        </div>
      </div>
    </div>
  );
}
