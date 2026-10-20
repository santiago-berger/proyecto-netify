export const Field = ({ label, error, children }) => (
  <div className="field">
    {label && <label>{label}</label>}
    {children}
    {error && <span className="field-error">{error}</span>}
  </div>
);
