export default function Field({ label, htmlFor, className= "", children }) {
  return (
    <div className={`field-group ${className}`}>
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
