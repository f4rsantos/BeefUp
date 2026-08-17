import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import ConfirmModal from "../components/ConfirmModal";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoOf(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarView() {
  const { t, clients, saveClient } = useApp();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [assignFor, setAssignFor] = useState(null);
  const [time, setTime] = useState("18:00");
  const [pendingRemove, setPendingRemove] = useState(null);

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

  const [pickClient, setPickClient] = useState("");

  async function addAppointment() {
    const c = clients.find((x) => x.id === pickClient);
    if (!c) return;
    const sched = (c.schedule || []).filter((e) => !(e.date === assignFor && e.time === time));
    await saveClient({ ...c, schedule: [...sched, { date: assignFor, time }] });
    setAssignFor(null);
  }

  async function removeAppointment(client, entry) {
    await saveClient({ ...client, schedule: (client.schedule || []).filter((e) => !(e.date === entry.date && e.time === entry.time)) });
  }

  function openAssign(iso) {
    setAssignFor(iso);
    setPickClient(clients[0]?.id || "");
  }

  const label = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="dash-cal">
      <div className="flex items-center gap-3 mb-4">
        <button className="btn-icon" onClick={prev} aria-label={t.previousMonth}><ChevronLeft size={18} /></button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", minWidth: 160 }}>{label}</h2>
        <button className="btn-icon" onClick={nextM} aria-label={t.nextMonth}><ChevronRight size={18} /></button>
      </div>

      <div className="dash-cal-head">
        {DOW.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="dash-cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="dash-cal-cell muted" />;
          const iso = isoOf(year, month, d);
          const assigned = clientsOn(iso);
          return (
            <div key={i} className="dash-cal-cell" onClick={() => openAssign(iso)}>
              <span className="dash-cal-daynum">{d}</span>
              {assigned.flatMap((c) =>
                (c.schedule || []).filter((e) => e.date === iso).map((e, k) => (
                  <span key={c.id + k} className="dash-cal-chip">{e.time ? `${e.time} ` : ""}{c.name}</span>
                )),
              )}
            </div>
          );
        })}
      </div>

      {assignFor && (
        <div className="modal-overlay" style={{ alignItems: "center" }} onClick={() => setAssignFor(null)}>
          <div className="modal-center" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 className="display" style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", marginBottom: 20 }}>{assignFor}</h3>

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

            {clients.some((c) => (c.schedule || []).some((e) => e.date === assignFor)) && (
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
