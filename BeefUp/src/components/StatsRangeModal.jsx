import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { daysBetween } from "../lib/planUtils";

export default function StatsRangeModal({ customStart, today, onApply, onClose }) {
  const { t } = useApp();
  const [draft, setDraft] = useState(customStart);

  const draftDays = daysBetween(draft);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" style={{ padding: 26 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="font-semibold" style={{ color: "var(--text)", fontSize: 19 }}>
            {t.statsRange}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <label className="section-title" style={{ fontSize: 13 }}>{t.startDate}</label>
        <input
          type="date"
          className="field mt-2"
          style={{ fontSize: 16, padding: "13px 14px" }}
          value={draft}
          max={today}
          onChange={(e) => setDraft(e.target.value)}
        />

        <p className="text-xs" style={{ color: "var(--muted)", marginTop: 10 }}>
          {t.lastNDays.replace("{n}", draftDays)}
        </p>

        <button
          className="btn btn-primary w-full py-3.5"
          style={{ fontSize: 15, marginTop: 24 }}
          onClick={() => onApply(draft)}
        >
          {t.apply}
        </button>
      </div>
    </div>
  );
}
