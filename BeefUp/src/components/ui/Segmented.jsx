import { useRadioKeys } from "./useRadioKeys";

export default function Segmented({ options, value, onChange, label }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  const { onKeyDown, itemProps }= useRadioKeys(options.length, index, (i) => onChange(options[i].id));
  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={onKeyDown} style={{ "--count": options.length, "--index": index }}>
      <span className="segmented-lens" aria-hidden="true" />
      {options.map(({ id, label: optionLabel, icon: Icon, content }, i) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={content ? optionLabel : undefined}
          className={`segmented-option ${value === id ? "on" : ""}`}
          onClick={() => onChange(id)}
          {...itemProps(i)}
        >
          {Icon && <Icon size={15} strokeWidth={2.2} />}
          {content ?? optionLabel}
        </button>
      ))}
    </div>
  );
}
