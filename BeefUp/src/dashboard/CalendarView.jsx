import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Keyboard, Stethoscope, Dumbbell, Ruler, Utensils, Repeat } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../lib/useIsDesktop";
import { formatDateShort, todayISO } from "../lib/planUtils";
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

function weekdayOf(iso, lang) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === "pt" ? "pt-PT" : undefined, { weekday: "short" });
}

const APPT_TYPES = [
  { id: "consulta", Icon: Stethoscope, label: (t) => t.dashApptConsulta },
  { id: "treino", Icon: Dumbbell, label: (t) => t.dashApptTreino },
  { id: "medidas", Icon: Ruler, label: (t) => t.dashMeasures },
  { id: "nutricao", Icon: Utensils, label: (t) => t.dashNutrition },
  { id: "rotina", Icon: Repeat, label: (t) => t.dashApptRotina },
];

function apptTypeMeta(id) {
  return APPT_TYPES.find((x) => x.id === id) || APPT_TYPES[0];
}

const DIAL_SIZE = 240;
const DIAL_CENTER = DIAL_SIZE / 2;
const OUTER_R = 88;
const INNER_R = 52;
const RING_THRESHOLD = (OUTER_R + INNER_R) / 2;

function polar(r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: DIAL_CENTER + r * Math.sin(rad), y: DIAL_CENTER - r * Math.cos(rad) };
}

function pointerToPolar(clientX, clientY, rect) {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return { deg, dist: Math.hypot(dx, dy) };
}

function DialFace({ mode, hour, minute, onPick, onRelease }) {
  const faceRef = useRef(null);

  function valueAt(clientX, clientY) {
    const { deg, dist } = pointerToPolar(clientX, clientY, faceRef.current.getBoundingClientRect());
    const idx = Math.round(deg / 30) % 12;
    if (mode === "hour") return dist > RING_THRESHOLD ? idx : idx + 12;
    return idx * 5;
  }

  function onDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    onPick(valueAt(e.clientX, e.clientY));
  }
  function onMove(e) {
    if (e.buttons !== 1 && e.pointerType === "mouse") return;
    onPick(valueAt(e.clientX, e.clientY));
  }

  const selected = mode === "hour" ? hour : minute;
  const selectedR = mode === "hour" ? (hour < 12 ? OUTER_R : INNER_R) : OUTER_R;
  const selectedDeg = mode === "hour" ? (hour % 12) * 30 : (minute / 5) * 30;
  const hand = polar(selectedR, selectedDeg);

  return (
    <div
      ref={faceRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={(e) => { onMove(e); onRelease(); }}
      style={{
        position: "relative", width: DIAL_SIZE, height: DIAL_SIZE, borderRadius: "50%",
        background: "var(--surface2)", margin: "0 auto", touchAction: "none", userSelect: "none", cursor: "pointer",
      }}
    >
      <span style={{ position: "absolute", left: DIAL_CENTER - 3, top: DIAL_CENTER - 3, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      <svg width={DIAL_SIZE} height={DIAL_SIZE} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <line x1={DIAL_CENTER} y1={DIAL_CENTER} x2={hand.x} y2={hand.y} stroke="var(--accent)" strokeWidth={2} />
      </svg>
      <span
        style={{
          position: "absolute", left: hand.x - 16, top: hand.y - 16, width: 32, height: 32, borderRadius: "50%",
          background: "var(--accent)", pointerEvents: "none",
        }}
      />
      {(mode === "hour" ? Array.from({ length: 12 }, (_, i) => i) : Array.from({ length: 12 }, (_, i) => i * 5)).map((n, i) => {
        const p = polar(OUTER_R, i * 30);
        const isSelected = selected === n;
        return (
          <span
            key={`o${n}`}
            className="tabular"
            style={{
              position: "absolute", left: p.x - 16, top: p.y - 16, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%",
              fontSize: 14, fontWeight: 600, pointerEvents: "none",
              color: isSelected ? "#fff" : "var(--text)",
            }}
          >
            {mode === "hour" ? n : String(n).padStart(2, "0")}
          </span>
        );
      })}
      {mode === "hour" && Array.from({ length: 12 }, (_, i) => i + 12).map((n, i) => {
        const p = polar(INNER_R, i * 30);
        const isSelected = selected === n;
        return (
          <span
            key={`i${n}`}
            className="tabular"
            style={{
              position: "absolute", left: p.x - 14, top: p.y - 14, width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%",
              fontSize: 12, fontWeight: 600, pointerEvents: "none",
              color: isSelected ? "#fff" : "var(--muted)",
            }}
          >
            {n === 24 ? 0 : n}
          </span>
        );
      })}
    </div>
  );
}

function TimePicker({ value, onChange }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [mode, setMode] = useState("hour");
  const [manual, setManual] = useState(false);

  function launch() {
    const [h, m] = value.split(":").map(Number);
    setHour(h || 0);
    setMinute(m || 0);
    setMode("hour");
    setManual(false);
    setOpen(true);
  }

  function confirm() {
    onChange(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="flex items-center justify-between"
        style={{
          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, color: "var(--text)", padding: "10px 12px", fontSize: 14, cursor: "pointer",
        }}
        onClick={launch}
      >
        <span className="tabular">{value}</span>
        <Clock size={15} style={{ color: "var(--muted)" }} />
      </button>

      {open && (
        <div className="modal-overlay" style={{ alignItems: "center", zIndex: 200 }} onClick={() => setOpen(false)}>
          <div className="modal-center" style={{ maxWidth: 300, padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <p className="section-title mb-4">{t.dashSelectTimeTitle}</p>

            <div className="flex items-center justify-center gap-2 mb-5">
              {manual ? (
                <input
                  className="tabular text-center"
                  inputMode="numeric"
                  style={{
                    width: 76, height: 60, borderRadius: 8, border: "none",
                    fontSize: 32, fontWeight: 700, background: "var(--surface2)", color: "var(--text)",
                  }}
                  value={String(hour).padStart(2, "0")}
                  onChange={(e) => setHour(Math.max(0, Math.min(23, parseInt(e.target.value, 10) || 0)))}
                />
              ) : (
                <button
                  type="button"
                  className="tabular"
                  style={{
                    width: 76, height: 60, borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 32, fontWeight: 700,
                    background: mode === "hour" ? "var(--accent-soft)" : "var(--surface2)",
                    color: mode === "hour" ? "var(--accent)" : "var(--text)",
                  }}
                  onClick={() => setMode("hour")}
                >
                  {String(hour).padStart(2, "0")}
                </button>
              )}
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--text)" }}>:</span>
              {manual ? (
                <input
                  className="tabular text-center"
                  inputMode="numeric"
                  style={{
                    width: 76, height: 60, borderRadius: 8, border: "none",
                    fontSize: 32, fontWeight: 700, background: "var(--surface2)", color: "var(--text)",
                  }}
                  value={String(minute).padStart(2, "0")}
                  onChange={(e) => setMinute(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                />
              ) : (
                <button
                  type="button"
                  className="tabular"
                  style={{
                    width: 76, height: 60, borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 32, fontWeight: 700,
                    background: mode === "minute" ? "var(--accent-soft)" : "var(--surface2)",
                    color: mode === "minute" ? "var(--accent)" : "var(--text)",
                  }}
                  onClick={() => setMode("minute")}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              )}
            </div>

            {!manual && (
              <DialFace
                mode={mode}
                hour={hour}
                minute={minute}
                onPick={(v) => (mode === "hour" ? setHour(v) : setMinute(v))}
                onRelease={() => { if (mode === "hour") setMode("minute"); }}
              />
            )}

            <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
              <button type="button" className="btn-icon" onClick={() => setManual((v) => !v)} aria-label={t.dashTimeKeyboardToggle}>
                {manual ? <Clock size={18} style={{ color: "var(--muted)" }} /> : <Keyboard size={18} style={{ color: "var(--muted)" }} />}
              </button>
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{t.cancel}</button>
                <button type="button" className="btn btn-primary" onClick={confirm}>{t.dashTimeOk}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const [apptType, setApptType] = useState(APPT_TYPES[0].id);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [filterClient, setFilterClient] = useState("");
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

  function goToMonthOf(iso) {
    const [y, m] = iso.split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
  }

  function clientsOn(iso) {
    return clients.filter((c) => (c.schedule || []).some((e) => e.date === iso));
  }

  // One flat, time-ordered list for a day, so a cell and the day panel agree.
  function entriesOn(iso) {
    return clients
      .flatMap((c) => (c.schedule || []).filter((e) => e.date === iso).map((e) => ({ client: c, entry: e })))
      .sort((a, b) => (a.entry.time || "").localeCompare(b.entry.time || ""));
  }
  
  const upcoming = useMemo(() => {
    const from = todayISO();
    const rows = clients
      .filter((c) => !filterClient || c.id === filterClient)
      .flatMap((c) => (c.schedule || []).filter((e) => e.date >= from).map((e) => ({ client: c, entry: e })))
      .sort((a, b) => (a.entry.date + a.entry.time).localeCompare(b.entry.date + b.entry.time));
    const groups = [];
    for (const row of rows) {
      let g = groups.find((x) => x.date === row.entry.date);
      if (!g) { g = { date: row.entry.date, rows: [] }; groups.push(g); }
      g.rows.push(row);
    }
    return groups;
  }, [clients, filterClient]);

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
    await saveSchedule(c.id, [...sched, { date: assignFor, time, type: apptType }]);
    setAssignFor(null);
  }

  async function removeAppointment(client, entry) {
    await saveSchedule(client.id, client.schedule.filter((e) => !(e.date === entry.date && e.time === entry.time)));
  }

  function openAssign(iso) {
    setAssignFor(iso);
    setPickClient(clients[0]?.id || "");
    setApptType(APPT_TYPES[0].id);
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
          const isToday = iso === todayISO();
          return (
            <button
              key={i}
              type="button"
              className={`dash-cal-cell ${openDay === iso ? "open" : ""} ${isToday ? "today" : ""}`}
              onClick={() => setOpenDay(iso)}
            >
              <span className="dash-cal-daynum">{d}</span>
              {isDesktop
                ? assigned.flatMap((c) =>
                    (c.schedule || []).filter((e) => e.date === iso).map((e, k) => {
                      const { Icon } = apptTypeMeta(e.type);
                      return (
                        <span key={c.id + k} className="dash-cal-chip flex items-center gap-1">
                          <Icon size={10} style={{ flexShrink: 0 }} />
                          {e.time ? `${e.time} ` : ""}{c.name}
                        </span>
                      );
                    }),
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

      {openDay && (
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
              {entriesOn(openDay).map(({ client, entry }, k) => {
                const { Icon, label } = apptTypeMeta(entry.type);
                return (
                  <div key={client.id + k} className="dash-day">
                    <Icon size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-label={label(t)} />
                    <span className="dash-day-num tabular" style={{ width: 44 }}>{entry.time}</span>
                    <span className="flex-1 truncate" style={{ color: "var(--text)" }}>{client.name}</span>
                    <button className="btn-icon" onClick={() => setPendingRemove({ client, entry })} aria-label={t.delete}>
                      <X size={15} style={{ color: "var(--muted)" }} />
                    </button>
                  </div>
                );
              })}
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

      {!openDay && (
        <section className="dash-panel" style={{ marginTop: "var(--d-4)" }}>
          <div className="dash-panel-head">
            <h3 className="dash-card-title">{t.dashUpcoming}</h3>
            <select
              className="field"
              style={{ width: "auto", maxWidth: 180 }}
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              aria-label={t.dashClients}
            >
              <option value="">{t.dashFilterAll}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {upcoming.length === 0 ? (
            <p className="dash-empty">{t.dashNoUpcoming}</p>
          ) : (
            <div className="flex flex-col" style={{ gap: "var(--d-4)" }}>
              {upcoming.map((group) => (
                <div key={group.date} className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="section-title text-left"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => goToMonthOf(group.date)}
                  >
                    {weekdayOf(group.date, lang)} {formatDateShort(group.date)}
                  </button>
                  {group.rows.map(({ client, entry }, k) => {
                    const { Icon, label } = apptTypeMeta(entry.type);
                    return (
                      <div key={client.id + k} className="dash-day">
                        <Icon size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-label={label(t)} />
                        <span className="dash-day-num tabular" style={{ width: 44 }}>{entry.time}</span>
                        <span className="flex-1 truncate" style={{ color: "var(--text)" }}>{client.name}</span>
                        <button className="btn-icon" onClick={() => setPendingRemove({ client, entry })} aria-label={t.delete}>
                          <X size={15} style={{ color: "var(--muted)" }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
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
                  <label className="section-title">{t.dashApptType}</label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {APPT_TYPES.map(({ id, Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={`chip flex items-center gap-1 ${apptType === id ? "active" : ""}`}
                        onClick={() => setApptType(id)}
                      >
                        <Icon size={13} /> {label(t)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="section-title">{t.dashTime}</label>
                  <div className="mt-2">
                    <TimePicker value={time} onChange={setTime} />
                  </div>
                </div>
                <button className="btn btn-primary w-full py-3 mt-1" onClick={addAppointment}>{t.dashAssign}</button>
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
