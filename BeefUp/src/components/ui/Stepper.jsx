import { Minus, Plus } from "lucide-react";

export default function Stepper({ onDecrement, onIncrement, decrementLabel, incrementLabel, canDecrement = true, color }) {
  return (
    <div className="stepper" style={color ? { "--stepper-color": color } : undefined}>
      <button type="button" onClick={onDecrement} aria-label={decrementLabel} disabled={!canDecrement}>
        <Minus size={17} strokeWidth={2.6} />
      </button>
      <button type="button" onClick={onIncrement} aria-label={incrementLabel}>
        <Plus size={17} strokeWidth={2.6} />
      </button>
    </div>
  );
}
