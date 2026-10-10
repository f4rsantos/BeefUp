import { normalizeTime, timeFromDigits } from "../lib/timeFormat";

// mm:ss entry for cardio; `value` is "m:ss" or an older plain-minutes number.
export default function TimeField({ value, onChange, ...rest }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="0:00"
      value={normalizeTime(value)}
      onChange={(e) => onChange(timeFromDigits(e.target.value))}
      {...rest}
    />
  );
}
