import { useState } from "react";
import { Plus, Search, ChevronRight } from "lucide-react";
import { useApp } from "../context/useApp";
import { formatDateShort } from "../lib/planUtils";
import { nextAppointment, pendingCount, weekdayOf } from "./appointments";
import { Skeleton } from "./parts";

const SCOPE_IDS = ["workouts", "nutrition", "measures", "calendar"];

function StudentCard({ student, schedule, onOpen }) {
  const { t, lang } = useApp();
  const next = nextAppointment(schedule);
  const pending = pendingCount(schedule);
  const shared = SCOPE_IDS.filter((id) => (student.scopes || []).includes(id)).map((id) => t[id]);

  return (
    <button type="button" className="dash-scard" onClick={onOpen}>
      <span className="dash-scard-name">{student.name}</span>
      <ChevronRight size={18} className="dash-scard-go" aria-hidden="true" />
      <span className="dash-scard-next">
        {next
          ? t.dashNextApptAt.replace("{when}", `${weekdayOf(next.date, lang)} ${formatDateShort(next.date)}, ${next.time}`)
          : t.dashNoNextAppt}
      </span>
      {pending > 0 && <span className="dash-scard-flag">{t.dashToConfirmCount.replace("{n}", pending)}</span>}
      <span className="dash-scard-shares">
        {shared.length ? t.dashShares.replace("{list}", shared.join(", ").toLowerCase()) : t.dashSharesNothing}
      </span>
    </button>
  );
}

export default function StudentHome({ students, loading, failed, onRetry, onOpen, onInvite }) {
  const { t, clients: annotations } = useApp();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students;

  return (
    <div className="dash-home">
      <div className="dash-home-inner">
        <div className="dash-home-head">
          <h1 className="dash-home-title">
            {t.dashClients}
            {students.length > 0 && <span className="dash-home-count tabular">{students.length}</span>}
          </h1>
          {students.length > 3 && (
            <label className="dash-search">
              <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.dashSearchClients}
                aria-label={t.dashSearchClients}
              />
            </label>
          )}
          <button className="btn btn-primary flex items-center justify-center gap-2" onClick={onInvite}>
            <Plus size={16} /> {t.dashInviteClient}
          </button>
        </div>

        {loading && <Skeleton rows={3} />}
        {failed && (
          <div className="dash-panel">
            <p className="text-sm" style={{ color: "var(--danger)" }}>{t.dashClientsLoadFailed}</p>
            <button className="btn btn-ghost mt-2" onClick={onRetry}>{t.retry}</button>
          </div>
        )}
        {!loading && !failed && students.length === 0 && (
          <div className="dash-panel">
            <p className="dash-empty">{t.dashNoClients}</p>
          </div>
        )}
        {students.length > 0 && shown.length === 0 && <p className="dash-empty">{t.noResults}</p>}

        {shown.length > 0 && (
          <div className="dash-scards">
            {shown.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                schedule={annotations.find((a) => a.id === s.id)?.schedule || []}
                onOpen={() => onOpen(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
