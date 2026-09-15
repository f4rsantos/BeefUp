import { useState } from "react";
import { X, Lock } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, isPrescribed } from "../lib/planUtils";
import { allMeasureGroups, measureGroupLabel, measureTypeLabel, UNIT_PRESETS } from "../lib/measureTypes";
import ConfirmModal from "./ConfirmModal";

const NEW_GROUP = "__new__";
const OTHER_UNIT = "__other__";

export default function AddMeasureTypeModal({ onClose, initialGroupKey }) {
  const { t, measureTypes, saveMeasureType, deleteMeasureType } = useApp();
  const groups = allMeasureGroups(measureTypes);
  const [groupKey, setGroupKey] = useState(initialGroupKey ?? groups[0]?.key ?? "general");
  const [newGroupName, setNewGroupName] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(UNIT_PRESETS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  // Flat list of existing labels, built-in + custom, for the duplicate check.
  const existingLabels = groups.flatMap((g) =>
    g.types.map((type) => measureTypeLabel(type, measureTypes, t)),
  );

  async function handleAdd() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.measureTypeNameRequired);
      return;
    }
    const isNewGroup = groupKey === NEW_GROUP;
    const trimmedGroup = newGroupName.trim();
    if (isNewGroup && !trimmedGroup) {
      setError(t.measureTypeGroupRequired);
      return;
    }
    const isDuplicate = existingLabels.some(
      (label) => label.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (isDuplicate) {
      setError(t.measureTypeDuplicate);
      return;
    }
    const isOtherUnit = unit === OTHER_UNIT;
    const trimmedUnit = customUnit.trim();
    if (isOtherUnit && !trimmedUnit) {
      setError(t.measureTypeUnitRequired);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveMeasureType({
        id: uid(),
        name: trimmedName,
        group: isNewGroup ? trimmedGroup : groupKey,
        unit: isOtherUnit ? trimmedUnit : unit,
        createdAt: Date.now(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" style={{ padding: 26 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-semibold" style={{ color: "var(--text)", fontSize: 19 }}>
            {t.measureAddType}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="section-title" style={{ fontSize: 13 }}>{t.measureTypeGroupLabel}</label>
          <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
            {groups.map((g) => (
              <button
                key={g.key}
                className={`chip ${groupKey === g.key ? "active" : ""}`}
                onClick={() => setGroupKey(g.key)}
              >
                {measureGroupLabel(g.key, t)}
              </button>
            ))}
            <button
              className={`chip ${groupKey === NEW_GROUP ? "active" : ""}`}
              onClick={() => setGroupKey(NEW_GROUP)}
            >
              {t.measureTypeNewGroup}
            </button>
          </div>
          {groupKey === NEW_GROUP && (
            <input
              className="field mt-2"
              placeholder={t.measureTypeNewGroupName}
              value={newGroupName}
              onChange={(e) => { setNewGroupName(e.target.value); setError(null); }}
            />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="section-title" style={{ fontSize: 13 }}>{t.measureTypeNameLabel}</label>
          <input
            className="field mt-2"
            placeholder={t.measureTypeNamePlaceholder}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="section-title" style={{ fontSize: 13 }}>{t.measureTypeUnitLabel}</label>
          <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
            {UNIT_PRESETS.map((u) => (
              <button
                key={u}
                className={`chip ${unit === u ? "active" : ""}`}
                onClick={() => { setUnit(u); setError(null); }}
              >
                {u}
              </button>
            ))}
            <button
              className={`chip ${unit === OTHER_UNIT ? "active" : ""}`}
              onClick={() => { setUnit(OTHER_UNIT); setError(null); }}
            >
              {t.measureTypeUnitOther}
            </button>
          </div>
          {unit === OTHER_UNIT && (
            <input
              className="field mt-2"
              placeholder={t.measureTypeUnitPlaceholder}
              value={customUnit}
              onChange={(e) => { setCustomUnit(e.target.value); setError(null); }}
            />
          )}
        </div>

        {error && (
          <p className="text-xs" style={{ color: "var(--danger)", marginTop: -8, marginBottom: 16 }}>
            {error}
          </p>
        )}

        {measureTypes.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title" style={{ fontSize: 13 }}>{t.measureTypeYours}</p>
            <div className="flex flex-col" style={{ marginTop: 8, borderTop: "1px solid var(--border)" }}>
              {measureTypes.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-sm"
                  style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <span style={{ color: "var(--text)" }}>
                    {m.name}
                    {isPrescribed(m) && <> · {t.prescribedBadge}</>}
                  </span>
                  {isPrescribed(m) ? (
                    <Lock size={14} style={{ color: "var(--muted)" }} aria-label={t.prescribedLocked} />
                  ) : (
                    <button
                      onClick={() => setPendingDelete(m.id)}
                      aria-label={t.delete}
                      title={t.delete}
                      style={{ color: "var(--muted)", display: "flex" }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn btn-ghost flex-1" onClick={onClose}>
            {t.cancel}
          </button>
          <button className="btn btn-primary flex-1" onClick={handleAdd} disabled={saving}>
            {t.add}
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteMeasureTypeTitle}
          message={t.deleteMeasureTypeMessage}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteMeasureType(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
