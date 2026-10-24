import { Check } from "lucide-react";
import { useApp } from "../context/useApp";
import { WORKOUT_ICONS } from "../lib/workoutArt";

// The symbols a workout card can show, in the colour of its group.
export default function WorkoutIconGrid({ current, color, onPick }) {
  const { t } = useApp();
  return (
    <div className="workout-icon-grid">
      {Object.entries(WORKOUT_ICONS).map(([key, Icon]) => {
        const on = current === key;
        return (
          <button
            key={key}
            type="button"
            className={`workout-icon-option ${on ? "on" : ""}`}
            style={{ "--art-color": color }}
            aria-label={t[`workoutIcon_${key}`]}
            aria-pressed={on}
            title={t[`workoutIcon_${key}`]}
            onClick={() => onPick(key)}
          >
            <Icon size={24} strokeWidth={1.75} />
            {on && <Check size={12} className="workout-icon-check" />}
          </button>
        );
      })}
    </div>
  );
}
