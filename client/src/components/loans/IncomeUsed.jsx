import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";
import { Amount } from "../ui/Amount.jsx";

// el simulador no pide el ingreso: usa el guardado en el perfil, por eso se muestra cuál es
export const IncomeUsed = ({ ingreso }) => (
  <div className="loan-income">
    <UserRound size={14} aria-hidden="true" />
    <span>
      Requisitos evaluados con tu ingreso mensual de <b><Amount value={ingreso} /></b> ·{" "}
      <Link to="/perfil">Cambiar en mi perfil</Link>
    </span>
  </div>
);
