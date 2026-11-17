import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { findCftArticleId } from "../../utils/loans.js";

// "CFT" clickeable que lleva al artículo de Educación financiera que explica qué es y cómo funciona
export const CftLink = ({ label = "CFT" }) => {
  const [articleId, setArticleId] = useState(null);

  useEffect(() => {
    let active = true;
    findCftArticleId().then((id) => active && setArticleId(id));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link
      to={articleId ? `/aprender/${articleId}` : "/aprender"}
      className="cft-link"
      title="¿Qué es el CFT? Leé el artículo en Educación financiera"
    >
      {label} <Info size={13} aria-hidden="true" />
    </Link>
  );
};
