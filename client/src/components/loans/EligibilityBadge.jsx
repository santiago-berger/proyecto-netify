import { Check, AlertTriangle, Minus } from "lucide-react";

// indicador chico de la fila: si el usuario cumple los requisitos de ingreso del préstamo
const STATES = {
  true: { icon: Check, className: "ok", text: "Cumplís los requisitos de ingreso" },
  false: { icon: AlertTriangle, className: "warn", text: "No cumplís algún requisito de ingreso. Mirá los detalles" },
  null: { icon: Minus, className: "neutral", text: "Cargá tu ingreso en el perfil para saber si cumplís los requisitos" },
};

export const EligibilityBadge = ({ value }) => {
  const { icon: Icon, className, text } = STATES[String(value ?? null)];
  return (
    <span className={`elig-badge ${className}`} title={text} aria-label={text} role="img">
      <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
};
