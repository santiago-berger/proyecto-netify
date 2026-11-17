import { useState } from "react";
import { History } from "lucide-react";
import { Empty } from "./Empty.jsx";

/*
  Lista de historial compartida por presupuestos y metas.
  Muestra los primeros `pageSize` registros y un botón para ver el resto.
  items: [{ key, icon, tone, title, sub, right }]  (tone: ok | warn | danger | neutral)
*/
export const HistoryList = ({ items, emptyTitle, emptyHint, pageSize = 8 }) => {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return <Empty icon={History} title={emptyTitle} hint={emptyHint} />;

  const visible = expanded ? items : items.slice(0, pageSize);
  const hidden = items.length - visible.length;

  return (
    <>
      <div className="list">
        {visible.map(({ key, icon: Icon, tone = "neutral", title, sub, right }) => (
          <div className="row" key={key}>
            <div className={`icon-badge history-icon ${tone}`}><Icon size={16} aria-hidden="true" /></div>
            <div className="grow">
              <div className="r-title">{title}</div>
              {sub && <div className="r-sub">{sub}</div>}
            </div>
            <div className="right history-right">{right}</div>
          </div>
        ))}
      </div>
      {(hidden > 0 || expanded) && items.length > pageSize && (
        <button className="btn btn-ghost btn-sm btn-block mt" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Ver menos" : `Ver ${hidden} ${hidden === 1 ? "registro más" : "registros más"}`}
        </button>
      )}
    </>
  );
};
