import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../lib/useIsDesktop";
import { formatDateShort } from "../lib/planUtils";
import ConfirmModal from "../components/ConfirmModal";

function localizedDow(lang) {
  const locale = lang === "pt" ? "pt-PT" : undefined;
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toLocaleDateString(locale, { weekday: "short" });
  });
}

function isoOf(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// `students` are the linked students (id + name); their appointments live in
// the local `clients` store, which holds the trainer's own annotations keyed
// by student id. Merged here so the calendar reads one list.
export default function CalendarView({ students = [] }) {
  const { t, lang, clients: annotations, saveClient } = useApp();
  const isDesktop = useIsDesktop();
  const dow = useMemo(() => localizedDow(lang), [lang]);
  const clients = useMemo(
    () => students.map((s) => ({ ...s, schedule: annotations.find((a) => a.id === s.id)?.schedule || [] })),
    [students, annotations],
  );
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [assignFor, setAssignFor] = useState(null);
  const [time, setTime] = useState("18:00");
  const [pendingRemove, setPendingRemove] = useState(null);
  // Phone only: a 45px cell has no room for name chips, so tapping a day
  // opens its list under the grid instead of going straight to the modal.
  const [openDay, setOpenDay] = useState(null);

  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prev() { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }
  function nextM() { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }

  function clientsOn(iso) {
    return clients.filter((c) => (c.schedule || []).some((e) => e.date === iso));
  }

  // One flat, time-ordered list for a day, so a cell and the day panel agree.
  function entriesOn(iso) {
    return clients
      .flatMap((c) => (c.schedule || []).filter((e) => e.date === iso).map((e) => ({ client: c, entry: e })))
      .sort((a, b) => (a.entry.time || "").localeCompare(b.entry.time || ""));
  }

  const [pickClient, setPickClient] = useState("");

  // Writes only the annotation record, never the student's own synced data.
  async function saveSchedule(id, schedule) {
    const existing = annotations.find((a) => a.id === id) || { id };
    await saveClient({ ...existing, schedule });
  }

  async function addAppointment() {
    const c = clients.find((x) => x.id === pickClient);
    if (!c) return;
    const sched = c.schedule.filter((e) => !(e.date === assignFor && e.time === time));
    await saveSchedule(c.id, [...sched, { date: assignFor, time }]);
    setAssignFor(null);
  }

  async function removeAppointment(client, entry) {
    await saveSchedule(client.id, client.schedule.filter((e) => !(e.date === entry.date && e.time === entry.time)));
  }

  function openAssign(iso) {
    setAssignFor(iso);
    setPickClient(clients[0]?.id || "");
  }

  const label = first.toLocaleString(lang === "pt" ? "pt-PT" : undefined, { month: "long", year: "numeric" });

  return (
    <div className="dash-cal">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn-icon" onClick={prev} aria-label={t.previousMonth}><ChevronLeft size={18} /></button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", minWidth: 160 }}>{label}</h2>
        <button className="btn-icon" onClick={nextM} aria-label={t.nextMonth}><ChevronRight size={18} /></button>
      </div>

      <div className="dash-cal-head">
        {dow.map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="dash-cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="dash-cal-cell muted" />;
          const iso = isoOf(year, month, d);
          const assigned = clientsOn(iso);
          const dayEntries = entriesOn(iso);
          return (
            <button
              key={i}
              type="button"
              className={`dash-cal-cell ${openDay === iso ? "open" : ""}`}
              onClick={() => (isDesktop ? openAssign(iso) : setOpenDay(iso))}
            >
              <span className="dash-cal-daynum">{d}</span>
              {isDesktop
                ? assigned.flatMap((c) =>
                    (c.schedule || []).filter((e) => e.date === iso).map((e, k) => (
                      <span key={c.id + k} className="dash-cal-chip">{e.time ? `${e.time} ` : ""}{c.name}</span>
                    )),
                  )
                : dayEntries.length > 0 && (
                    <span className="dash-cal-dots">
                      {dayEntries.slice(0, 3).map((_, k) => <span key={k} className="dash-cal-dot" />)}
                      {dayEntries.length > 3 && <span className="dash-cal-more">+{dayEntries.length - 3}</span>}
                    </span>
                  )}
            </button>
          );
        })}
      </div>

      {!isDesktop && openDay && (
        <section className="dash-panel" style={{ marginTop: "var(--d-4)" }}>
          <div className="dash-panel-head">
            <h3 className="dash-card-title">{formatDateShort(openDay)}</h3>
            <button className="btn-icon" onClick={() => setOpenDay(null)} aria-label={t.close}>
              <X size={16} style={{ color: "var(--muted)" }} />
            </button>
          </div>

          {entriesOn(openDay).length === 0 ? (
            <p className="dash-empty">{t.dashNoAppointment}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {entriesOn(openDay).map(({ client, entry }, k) => (
                <div key={client.id + k} className="dash-day">
                  <span className="dash-day-num tabular" style={{ width: 44 }}>{entry.time}</span>
                  <span className="flex-1 truncate" style={{ color: "var(--text)" }}>{client.name}</span>
                  <button className="btn-icon" onClick={() => setPendingRemove({ client, entry })} aria-label={t.delete}>
                    <X size={15} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary w-full flex items-center justify-center gap-2"
            style={{ marginTop: "var(--d-3)" }}
            onClick={() => openAssign(openDay)}
          >
            <Plus size={16} /> {t.dashAssign}
          </button>
        </section>
      )}

      {assignFor && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setAssignFor(null)}>
          <div className="modal-center" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 20 }}>{formatDateShort(assignFor)}</h3>

            {clients.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoClients}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="section-title">{t.dashClients}</label>
                  <select className="field mt-2" value={pickClient} onChange={(e) => setPickClient(e.target.value)}>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-title">{t.dashTime}</label>
                  <input className="field mt-2" type="time" step="300" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <button className="btn btn-primary w-full py-3 mt-1" onClick={addAppointment}>{t.dashAssign}</button>
              </div>
            )}

            {/* On a phone the day panel below the grid already lists these. */}
            {isDesktop && clients.some((c) => (c.schedule || []).some((e) => e.date === assignFor)) && (
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex flex-col gap-2">
                  {clients.flatMap((c) => (c.schedule || []).filter((e) => e.date === assignFor).map((e, k) => (
                    <div key={c.id + k} className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--text)" }}>{e.time} · {c.name}</span>
                      <button className="btn-icon" onClick={() => setPendingRemove({ client: c, entry: e })} aria-label={t.delete}><X size={14} style={{ color: "var(--muted)" }} /></button>
                    </div>
                  )))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingRemove && (
        <ConfirmModal
          title={t.deleteAppointmentTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            removeAppointment(pendingRemove.client, pendingRemove.entry);
            setPendingRemove(null);
          }}
        />
      )}
    </div>
  );
}
