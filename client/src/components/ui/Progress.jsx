export const Progress = ({ percent, state }) => {
  const cls = state === "excedido" ? "danger" : state === "alerta" ? "warn" : "";
  return (
    <div className="progress">
      <span className={cls} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
};
