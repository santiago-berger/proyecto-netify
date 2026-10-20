import { X } from "lucide-react";

export const Modal = ({ title, onClose, children }) => (
  <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex between center" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 6 }}>
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  </div>
);
