import { money } from "../../utils/format.js";

// renders a money value with a smaller currency sign: $1.169.900
export const Amount = ({ value, className = "" }) => {
  const formatted = money(value);
  const number = formatted.replace(/^-?\$/, "");
  const sign = formatted.startsWith("-") ? "-" : "";
  return (
    <span className={`amount ${className}`}>
      {sign}<span className="currency">$</span>{number}
    </span>
  );
};
