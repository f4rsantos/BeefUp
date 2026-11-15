import { useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { ChevronLeft, PersonStanding, X } from "lucide-react";
import { useApp } from "../context/useApp";
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
import "./CustomExerciseEditor.css";

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
  useEscapeKey(onClose);
  useEscapeKey(() => setShowBodyModal(false), showBodyModal);

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
      repUnit: repUnit === "cardio" ? "m" : "reps",
      ...(repUnit === "cardio" ? { kind: "cardio" } : {}),
      defaultSets: repUnit === "cardio" ? 1 : parseInt(defaultSets) || 3,
      defaultReps: repUnit === "cardio" ? 0 : parseInt(defaultReps) || 10,
      defaultWeight: 0,
      custom: true,
    };
    await saveCustomExercise(exercise);
    setSaving(false);
    onCreated(exercise);
  }

  return (
    <div className="canvas-bg ce-root" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col h-full">
        <div
          className="flex-1 overflow-y-auto pb-24 scrollbar-hide page-pad"
        >
          <div className="flex items-center gap-1 ce-head">
            <button className="btn-back" onClick={onClose} aria-label={t.back}>
              <ChevronLeft className="text-body" size={24} />
            </button>
            <h1 className="display text-body ce-title">
              {t.createCustomExercise}
            </h1>
          </div>
          <div className="ce-section">
            <label className="section-title ce-label">{t.exerciseName}</label>
            <input
              className="field mt-2 w-full ce-input"
              placeholder={t.exerciseName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="ce-section">
            <div className="flex items-center justify-between">
              <label className="section-title ce-label ce-label-flat">{t.filterBodyPart}</label>
              <button
                className="btn btn-ghost flex items-center gap-1 ce-body-btn"
                onClick={() => setShowBodyModal(true)}
              >
                <PersonStanding size={14} />
                {t.viewOnBody}
              </button>
            </div>
            <div className="flex flex-wrap mt-2 gap-1.5">
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
            <div className="ce-section">
              <label className="section-title ce-label">{t.primaryMuscle}</label>
              <div className="flex flex-wrap mt-2 gap-1.5">
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
            <div className="ce-section">
              <label className="section-title ce-label">{t.secondaryMusclesLabel}</label>
              <div className="flex flex-wrap mt-2 gap-1.5">
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

          <div className="ce-section">
            <label className="section-title ce-label">{t.filterEquipment}</label>
            <div className="flex flex-wrap mt-2 gap-1.5">
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

          <div className="flex items-center justify-between ce-section">
            <label className="section-title ce-label ce-label-flat">{t.repUnitLabel}</label>
            <div className="pill-toggle">
              <button
                className={`pill-option ${repUnit === "reps" ? "active" : ""}`}
                onClick={() => setRepUnit("reps")}
              >
                {t.unitReps}
              </button>
              <button
                className={`pill-option ${repUnit === "cardio" ? "active" : ""}`}
                onClick={() => setRepUnit("cardio")}
              >
                {t.unitCardio}
              </button>
            </div>
          </div>

          {repUnit !== "cardio" && (
          <div className="grid grid-cols-2 gap-4 ce-section">
            <div>
              <label className="section-title ce-label">{t.defaultSetsLabel}</label>
              <NumberField
                className="field mt-2 w-full ce-input"
                allowDecimal={false}
                value={defaultSets}
                onChange={(e) => setDefaultSets(e.target.value)}
              />
            </div>
            <div>
              <label className="section-title ce-label">{t.defaultRepsLabel}</label>
              <NumberField
                className="field mt-2 w-full ce-input"
                allowDecimal={false}
                value={defaultReps}
                onChange={(e) => setDefaultReps(e.target.value)}
              />
            </div>
          </div>
          )}

          <div className="ce-section-lg">
            <label className="section-title ce-label">{t.exerciseDescriptionLabel}</label>
            <textarea
              className="field mt-2 w-full ce-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary w-full py-3.5 ce-save"
            disabled={!canSave}
            onClick={handleSave}
          >
            {t.confirm}
          </button>
        </div>
      </div>

      {showBodyModal && (
        <div role="dialog" aria-modal="true" className="modal-overlay ce-dialog" onClick={() => setShowBodyModal(false)}>
          <div className="modal-center ce-body-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-base text-body">
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
