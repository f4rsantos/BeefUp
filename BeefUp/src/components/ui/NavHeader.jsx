import { ChevronLeft } from "lucide-react";
import LargeTitle from "./LargeTitle";

export default function NavHeader({ title, onBack, backLabel, actions, accessory }) {
  return (
    <div className="nav-header">
      <div className="nav-header-bar">
        {onBack ? (
          <button className="nav-back" onClick={onBack} aria-label={backLabel} title={backLabel}>
            <ChevronLeft size={24} strokeWidth={2.4} style={{ marginLeft: -2 }} />
          </button>
        ) : <span />}
        {actions && <div className="large-title-actions">{actions}</div>}
      </div>
      <LargeTitle title={title} actions={accessory} />
    </div>
  );
}
