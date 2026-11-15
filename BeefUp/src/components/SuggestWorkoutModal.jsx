import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/useApp";
import { getBodyPartLabel, resolvedExerciseName } from "../lib/exerciseTree";
import { lastCompletedSets, todayISO } from "../lib/planUtils";
import { formatSet } from "../lib/setFormat";
import { focusOptions, suggestWorkout, suggestionReadiness } from "../lib/workoutSuggestion";
import Modal from "./ui/Modal";
import ActionRow from "./ui/ActionRow";
import "./SuggestWorkoutModal.css";

function lastTime(sessions, ref, t) {
  const sets = lastCompletedSets(sessions, ref).filter((set) => set.type !== "warmup");
  if (!sets.length) return "";
  const unit = sets.length === 1 ? t.setSingular.toLowerCase() : t.sets;
  return `${sets.length} ${unit} · ${formatSet(sets[0], ref)}`;
}

export default function SuggestWorkoutModal({ onStart, onClose }) {
  const { t, lang, sessions } = useApp();
  const today = todayISO();
  const readiness = useMemo(() => suggestionReadiness(sessions), [sessions]);
  const options = useMemo(() => focusOptions(sessions, today), [sessions, today]);
  const [picked, setPicked] = useState(null);
  const [removed, setRemoved] = useState([]);
  const bodyPart = picked ?? options[0]?.bodyPart ?? null;
  const suggestion = useMemo(
    () => (bodyPart ? suggestWorkout(sessions, bodyPart, today) : null),
    [sessions, bodyPart, today],
  );
  const items = (suggestion?.items ?? []).filter((item) => !removed.includes(item.ref));

  if (!readiness.ready || !suggestion) {
    return (
      <Modal title={t.suggestWorkout} onClose={onClose} dismissOnBackdrop>
        <p className="modal-text">
          {readiness.ready ? t.suggestNoPattern : t.suggestNotEnough.replace("{n}", readiness.missing)}
        </p>
        <ActionRow>
          <button type="button" className="btn btn-primary" onClick={onClose}>{t.done}</button>
        </ActionRow>
      </Modal>
    );
  }

  const label = getBodyPartLabel(bodyPart, lang);
  const start = () =>
    onStart({
      id: null,
      name: `${t.suggestedWorkout}: ${label}`,
      exercises: items.map(({ ref, barType }) => ({ ref, barType })),
    });

  return (
    <Modal title={t.suggestedWorkout} onClose={onClose} dismissOnBackdrop>
      {options.length > 1 && (
        <div className="sw-chips" role="radiogroup" aria-label={t.filterBodyPart}>
          {options.map((option) => (
            <button
              key={option.bodyPart}
              type="button"
              role="radio"
              aria-checked={option.bodyPart === bodyPart}
              className={`chip ${option.bodyPart === bodyPart ? "active" : ""}`}
              onClick={() => { setPicked(option.bodyPart); setRemoved([]); }}
            >
              {getBodyPartLabel(option.bodyPart, lang)}
            </button>
          ))}
        </div>
      )}
      <p className="modal-text sw-why">
        {suggestion.companion
          ? t.suggestWhyPair.replace("{main}", label).replace("{other}", getBodyPartLabel(suggestion.companion, lang))
          : t.suggestWhy.replace("{main}", label)}
      </p>
      <ul className="sw-list">
        {items.map((item) => (
          <li key={item.ref} className="sw-row">
            <span className="sw-row-text">
              <span className="sw-row-name text-body">{resolvedExerciseName(item.ref, lang)}</span>
              <span className="sw-row-last text-muted">{lastTime(sessions, item.ref, t)}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost sw-remove"
              onClick={() => setRemoved((list) => [...list, item.ref])}
              aria-label={`${t.removeExercise}: ${resolvedExerciseName(item.ref, lang)}`}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <ActionRow>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
        <button type="button" className="btn btn-primary" onClick={start} disabled={items.length === 0}>
          {t.startWorkout}
        </button>
      </ActionRow>
    </Modal>
  );
}
