export default function ChoiceTiles({ options, value, onChange, label }) {
  return (
    <div className="choice-tiles" role="radiogroup" aria-label={label} style={{ "--count": options.length }}>
      {options.map(({ id, label: optionLabel, icon: Icon, glyph }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className={`choice-tile ${value === id ? "on" : ""}`}
          onClick={() => onChange(id)}
        >
          {Icon ? <Icon size={24} strokeWidth={2} /> : glyph}
          <span>{optionLabel}</span>
        </button>
      ))}
    </div>
  );
}
