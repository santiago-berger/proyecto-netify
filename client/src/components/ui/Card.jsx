export const Card = ({ title, sub, action, children, className = "", style }) => (
  <div className={`card ${className}`} style={style}>
    {(title || action) && (
      <div className="card-head">
        <div>
          {title && <div className="card-title">{title}</div>}
          {sub && <div className="card-sub">{sub}</div>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);
