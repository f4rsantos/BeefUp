export default function NumberField({ onKeyDown, onPaste, allowDecimal = true, ...rest }) {
  function handleKeyDown(e) {
    if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
      const isDigit = /^[0-9]$/.test(e.key);
      const isDecimalPoint = allowDecimal && e.key === "." && !e.target.value.includes(".");
      if (!isDigit && !isDecimalPoint) e.preventDefault();
    }
    onKeyDown?.(e);
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData("text");
    const pattern = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;
    if (!pattern.test(text)) e.preventDefault();
    onPaste?.(e);
  }

  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      {...rest}
    />
  );
}
