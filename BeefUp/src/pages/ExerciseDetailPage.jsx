import { useState } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { useApp } from "../context/useApp";
import { getBodyPartLabel, getMuscleLabel, getEquipmentOptions, getVariantGroups } from "../lib/exerciseTree";
import { localizedName } from "../lib/localizedName"
import ConfirmModal from "../components/ConfirmModal";
import NavHeader from "../components/ui/NavHeader";
import IconButton from "../components/ui/IconButton";

export default function ExerciseDetailPage({ exercise, activeVariantId, onBack }) {
  const { t, lang, deleteCustomExercise } = useApp();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const name = localizedName(exercise, lang);
  const description = lang === "pt" ? exercise.descriptionPt : exercise.description;
  const instructions = lang === "pt" ? exercise.instructionsPt : exercise.instructions;
  const equipmentOptions = getEquipmentOptions(exercise.id);
  const activeVariantIds = (activeVariantId || "").split("+").filter(Boolean);

  const basics = [
    { label: t.category, value: getBodyPartLabel(exercise.muscleGroup, lang) },
    { label: t.filterBodyPart, value: getBodyPartLabel(exercise.bodyPart, lang) },
    { label: t.primaryMuscle, value: getMuscleLabel(exercise.target, lang) },
    {
      label: t.secondaryMusclesLabel,
      value: (exercise.secondaryMuscles || []).map((m) => getMuscleLabel(m, lang)).join(", ") || "–",
    },
    {
      label: t.filterEquipment,
      value: equipmentOptions.map((eq) => (localizedName(eq, lang))).join(", ") || "–",
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--canvas, var(--bg))" }}>
      <div
        className="flex-1 overflow-y-auto pb-6 flex flex-col gap-5 scrollbar-hide"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <NavHeader
          title={name}
          onBack={onBack}
          backLabel={t.back}
          actions={
            exercise.custom && (
              <IconButton icon={Trash2} variant="danger" label={t.delete} onClick={() => setConfirmingDelete(true)} />
            )
          }
          accessory={
            exercise.custom && <span className="chip active" style={{ pointerEvents: "none" }}>{t.customExerciseBadge}</span>
          }
        />
        <div
          className="flex flex-col items-center justify-center"
          style={{
            aspectRatio: "16 / 9",
            border: "2px dashed var(--border)",
            borderRadius: 16,
            color: "var(--muted)",
            gap: 8,
          }}
        >
          <ImageIcon size={28} />
          <span className="text-xs">{t.noMediaYet}</span>
        </div>

        {description && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {description}
          </p>
        )}

        {instructions?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              {t.instructions}
            </h2>
            <ol className="flex flex-col gap-2" style={{ paddingLeft: 20, listStyle: "decimal" }}>
              {instructions.map((step, i) => (
                <li key={i} className="text-sm" style={{ color: "var(--text)" }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {exercise.variants?.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
              {t.variantsTitle}
            </h2>
            <div className="flex flex-col gap-4">
              {getVariantGroups(exercise.id).map(({ group, defaultOption, options }) => (
                <div key={group} className="flex flex-col gap-2">
                  <p className="section-title">{t[`variantGroup_${group}`]}</p>
                  {[defaultOption, ...options].filter(Boolean).map((variant) => {
                    const active = activeVariantIds.includes(variant.id) || (
                      variant === defaultOption && activeVariantId !== undefined &&
                      !options.some((o) => activeVariantIds.includes(o.id))
                    );
                    const note = lang === "pt" ? variant.notePt : variant.note;
                    return (
                      <div
                        key={variant.id}
                        className="card"
                        style={active ? { borderColor: "var(--accent)" } : undefined}
                      >
                        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                          {localizedName(variant, lang)}
                        </p>
                        {note && (
                          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                            {note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card flex flex-col gap-3">
          {basics.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {label}
              </span>
              <span
                className="text-xs font-medium text-right"
                style={{ color: "var(--text)", textTransform: "capitalize" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
      {confirmingDelete && (
        <ConfirmModal
          title={t.deleteCustomExerciseTitle}
          message={t.deleteCustomExerciseConfirm.replace("{name}", name)}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            deleteCustomExercise(exercise.id);
            setConfirmingDelete(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}
