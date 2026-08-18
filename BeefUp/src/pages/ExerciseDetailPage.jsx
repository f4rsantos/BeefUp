import { ChevronLeft, Image as ImageIcon } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getBodyPartLabel, getMuscleLabel, getEquipmentOptions } from "../lib/exerciseTree";
import { localizedName } from "../lib/localizedName"

export default function ExerciseDetailPage({ exercise, onBack }) {
  const { t, lang } = useApp();

  const name = localizedName(exercise, lang);
  const description = lang === "pt" ? exercise.descriptionPt : exercise.description;
  const instructions = lang === "pt" ? exercise.instructionsPt : exercise.instructions;
  const equipmentOptions = getEquipmentOptions(exercise.id);

  const basics = [
    { label: t.category, value: getBodyPartLabel(exercise.muscleGroup, lang) },
    { label: t.filterBodyPart, value: getBodyPartLabel(exercise.bodyPart, lang) },
    { label: t.primaryMuscle, value: getMuscleLabel(exercise.target, lang) },
    {
      label: t.secondaryMusclesLabel,
      value: (exercise.secondaryMuscles || []).map((m) => getMuscleLabel(m, lang)).join(", ") || "—",
    },
    {
      label: t.filterEquipment,
      value: equipmentOptions.map((eq) => (localizedName(eq, lang))).join(", ") || "—",
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div className="flex items-center gap-1" style={{ padding: "38px 16px 16px" }}>
        <button className="btn-back" onClick={onBack} aria-label={t.back}>
          <ChevronLeft size={24} style={{ color: "var(--text)" }} />
        </button>
        <h1 className="display flex-1" style={{ fontSize: 24, fontWeight: 900, color: "var(--text)" }}>
          {name}
        </h1>
        {exercise.custom && (
          <span
            className="text-xs font-semibold"
            style={{
              color: "var(--accent)",
              background: "var(--accent-soft)",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {t.customExerciseBadge}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-5 scrollbar-hide">
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
    </div>
  );
}
