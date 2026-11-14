import { useRadioKeys } from "./useRadioKeys";

export default function ChoiceTiles({ options, value, onChange, label }) {
  const index= Math.max(0, options.findIndex((o) => o.id === value));
  const { onKeyDown, itemProps }= useRadioKeys(options.length, index, (i) => onChange(options[i].id));
  return (
    <div className="choice-tiles" role="radiogroup" aria-label={label} onKeyDown={onKeyDown} style={{ "--count": options.length }}>
      {options.map(({ id, label: optionLabel, icon: Icon, glyph }, i) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={`choice-tile ${value === id ? "on" : ""}`}
          onClick={() => onChange(id)}
          {...itemProps(i)}
        >
          {Icon ? <Icon size={24} strokeWidth={2} /> : glyph}
          <span>{optionLabel}</span>
        </button>
      ))}
    </div>
  );
}
