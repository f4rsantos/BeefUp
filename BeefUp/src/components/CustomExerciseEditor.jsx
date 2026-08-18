import { useState } from "react";
import { ChevronLeft, PersonStanding, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid } from "../lib/planUtils";
import {
  listBodyParts,
  listMuscles,
  listMusclesForBodyPart,
  listAllEquipment,
  getBodyPartLabel,
  getMuscleLabel,
  getEquipmentLabel,
} from "../lib/exerciseTree";
import BodyPartFilter from "./BodyPartFilter";
import NumberField from "./NumberField";

export default function CustomExerciseEditor({ onClose, onCreated }) {
  const { t, lang, saveCustomExercise } = useApp();
  const [name, setName] = useState("");
  const [bodyPart, setBodyPart] = useState(null);
  const [target, setTarget] = useState(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState([]);
  const [equipmentIds, setEquipmentIds] = useState([]);
  const [repUnit, setRepUnit] = useState("reps");
  const [defaultSets, setDefaultSets] = useState("3");
  const [defaultReps, setDefaultReps] = useState("10");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [bodyView, setBodyView] = useState("front");
  const [showBodyModal, setShowBodyModal] = useState(false);

  const bodyParts = listBodyParts();
  const musclesForBodyPart = bodyPart ? listMusclesForBodyPart(bodyPart) : [];
  const allMuscles = listMuscles();
  const equipmentList = listAllEquipment();

  function toggleEquipment(id) {
    setEquipmentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSecondaryMuscle(id) {
    setSecondaryMuscles((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function pickTarget(id) {
    setTarget(id);
    setSecondaryMuscles((prev) => prev.filter((x) => x !== id));
  }

  function handleBodyPartChange(bp) {
    setBodyPart(bp);
    setTarget(null);
    setSecondaryMuscles([]);
    if (bp) setShowBodyModal(false);
  }

  const canSave = name.trim() !== "" && bodyPart && target && equipmentIds.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const trimmedName = name.trim();
    const trimmedNotes = notes.trim();
    const exercise = {
      id: `custom_${uid()}`,
      name: trimmedName,
      namePt: trimmedName,
      bodyPart,
      target,
      muscleGroup: bodyPart,
      secondaryMuscles,
      description: trimmedNotes,
      descriptionPt: trimmedNotes,
      instructions: [],
      instructionsPt: [],
      equipment: equipmentIds,
      variants: [],
      repUnit,
      defaultSets: parseInt(defaultSets) || 3,
      defaultReps: parseInt(defaultReps) || 10,
      defaultWeight: 0,
      custom: true,
    };
    await saveCustomExercise(exercise);
    setSaving(false);
    onCreated(exercise);
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "var(--bg)" }}>
      <div className="flex flex-col h-full">
        <div
          className="flex-1 overflow-y-auto pb-24 scrollbar-hide"
          style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
        >
          <div className="flex items-center gap-1" style={{ marginBottom: 16 }}>
            <button className="btn-back" onClick={onClose} aria-label={t.back}>
              <ChevronLeft size={24} style={{ color: "var(--text)" }} />
            </button>
            <h1 className="display" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
              {t.createCustomExercise}
            </h1>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="section-title" style={{ fontSize: 13 }}>{t.exerciseName}</label>
            <input
              className="field mt-2 w-full"
              style={{ fontSize: 16, padding: "13px 14px" }}
              placeholder={t.exerciseName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="flex items-center justify-between">
              <label className="section-title" style={{ fontSize: 13, margin: 0 }}>{t.filterBodyPart}</label>
              <button
                className="btn btn-ghost flex items-center gap-1"
                style={{ padding: "4px 8px", fontSize: 12, color: "var(--accent)" }}
                onClick={() => setShowBodyModal(true)}
              >
                <PersonStanding size={14} />
                {t.viewOnBody}
              </button>
            </div>
            <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
              {bodyParts.map((bp) => (
                <button
                  key={bp}
                  className={`chip ${bodyPart === bp ? "active" : ""}`}
                  onClick={() => handleBodyPartChange(bp)}
                >
                  {getBodyPartLabel(bp, lang)}
                </button>
              ))}
            </div>
          </div>

          {bodyPart && (
            <div style={{ marginBottom: 20 }}>
              <label className="section-title" style={{ fontSize: 13 }}>{t.primaryMuscle}</label>
              <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
                {musclesForBodyPart.map((m) => (
                  <button
                    key={m}
                    className={`chip ${target === m ? "active" : ""}`}
                    onClick={() => pickTarget(m)}
                  >
                    {getMuscleLabel(m, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {target && (
            <div style={{ marginBottom: 20 }}>
              <label className="section-title" style={{ fontSize: 13 }}>{t.secondaryMusclesLabel}</label>
              <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
                {allMuscles.filter((m) => m !== target).map((m) => (
                  <button
                    key={m}
                    className={`chip ${secondaryMuscles.includes(m) ? "active" : ""}`}
                    onClick={() => toggleSecondaryMuscle(m)}
                  >
                    {getMuscleLabel(m, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className="section-title" style={{ fontSize: 13 }}>{t.filterEquipment}</label>
            <div className="flex flex-wrap mt-2" style={{ gap: 6 }}>
              {equipmentList.map((eq) => (
                <button
                  key={eq.id}
                  className={`chip ${equipmentIds.includes(eq.id) ? "active" : ""}`}
                  onClick={() => toggleEquipment(eq.id)}
                >
                  {getEquipmentLabel(eq.id, lang)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
            <label className="section-title" style={{ fontSize: 13, margin: 0 }}>{t.repUnitLabel}</label>
            <div className="pill-toggle">
              <button
                className={`pill-option ${repUnit === "reps" ? "active" : ""}`}
                onClick={() => setRepUnit("reps")}
              >
                {t.unitReps}
              </button>
              <button
                className={`pill-option ${repUnit === "m" ? "active" : ""}`}
                onClick={() => setRepUnit("m")}
              >
                {t.unitMeters}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            <div>
              <label className="section-title" style={{ fontSize: 13 }}>{t.defaultSetsLabel}</label>
              <NumberField
                className="field mt-2 w-full"
                style={{ fontSize: 16, padding: "13px 14px" }}
                allowDecimal={false}
                value={defaultSets}
                onChange={(e) => setDefaultSets(e.target.value)}
              />
            </div>
            <div>
              <label className="section-title" style={{ fontSize: 13 }}>{t.defaultRepsLabel}</label>
              <NumberField
                className="field mt-2 w-full"
                style={{ fontSize: 16, padding: "13px 14px" }}
                allowDecimal={false}
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="section-title" style={{ fontSize: 13 }}>{t.exerciseDescriptionLabel}</label>
            <textarea
              className="field mt-2 w-full"
              style={{ fontSize: 15, padding: "13px 14px", minHeight: 80, resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full py-3.5"
            style={{ fontSize: 15 }}
            disabled={!canSave}
            onClick={handleSave}
          >
            {t.confirm}
          </button>
        </div>
      </div>

      {showBodyModal && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setShowBodyModal(false)}>
          <div className="modal-center" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
                {t.filterBodyPart}
              </span>
              <button className="btn btn-ghost p-2" onClick={() => setShowBodyModal(false)} aria-label={t.cancel}>
                <X size={18} />
              </button>
            </div>
            <BodyPartFilter
              bodyPart={bodyPart}
              setBodyPart={handleBodyPartChange}
              bodyView={bodyView}
              setBodyView={setBodyView}
              lang={lang}
              t={t}
            />
          </div>
        </div>
      )}
    </div>
  );
}
