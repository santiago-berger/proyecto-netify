import { Inbox } from "lucide-react";

export const Empty = ({ icon: Icon = Inbox, title, hint }) => (
  <div className="empty">
    <Icon size={30} />
    <div style={{ fontWeight: 600, color: "var(--text)" }}>{title}</div>
    {hint && <div style={{ marginTop: 4 }}>{hint}</div>}
  </div>
);
