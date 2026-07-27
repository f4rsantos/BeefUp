import { useState } from "react";
import { Trash2, Plus, LayoutDashboard, Dumbbell, Ruler, StickyNote } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType } from "../lib/planUtils";
import ClientGym from "./ClientGym";

const MEASURE_TYPES = ["weight", "height", "chest", "arms", "legs", "belly"];

export default function ClientDetail({ client, onDeleted }) {
  const { t, saveClient, deleteClient } = useApp();
  const [section, setSection] = useState("overview");

  const sections = [
    { id: "overview", Icon: LayoutDashboard, label: t.dashOverview },
    { id: "gym", Icon: Dumbbell, label: t.dashGym },
    { id: "measures", Icon: Ruler, label: t.dashMeasures },
    { id: "notes", Icon: StickyNote, label: t.dashNotes },
  ];

  async function remove() {
    await deleteClient(client.id);
    onDeleted?.();
  }

  return (
    <div className="dash-detail-wrap">
      <div className="dash-detail-head">
        <div>
          <h2 className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>{client.name}</h2>
          {client.info && <p className="text-sm" style={{ color: "var(--muted)" }}>{client.info}</p>}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={remove} title={t.dashDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="dash-detail-body">
        <nav className="dash-subnav">
          {sections.map(({ id, Icon, label }) => (
            <button key={id} className={`dash-subnav-item ${section === id ? "active" : ""}`} onClick={() => setSection(id)}>
              <Icon size={16} /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-section">
          {section === "overview" && <Overview client={client} />}
          {section === "gym" && <ClientGym client={client} />}
          {section === "measures" && <Measures client={client} saveClient={saveClient} t={t} />}
          {section === "notes" && <Notes client={client} saveClient={saveClient} t={t} />}
        </div>
      </div>
    </div>
  );
}

function latestOf(measures, type) {
  const list = (measures || []).filter((m) => m.type === type).sort((a, b) => b.date.localeCompare(a.date));
  return list[0] || null;
}

function Overview({ client }) {
  const { t } = useApp();
  const upcoming = (client.schedule || []).slice().sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))).filter((e) => e.date >= todayISO());
  const weight = latestOf(client.measures, "weight");
  const lastNote = (client.notes || [])[(client.notes || []).length - 1];
  const next = upcoming[0];
  const weightChart = measurementsForType(client.measures || [], "weight");

  return (
    <div className="dash-grid">
      <div className="card">
        <p className="section-title mb-3">{t.dashMeasures}</p>
        <div style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>{weight ? `${weight.value}` : "—"}<span className="text-sm" style={{ color: "var(--muted)" }}> kg</span></div>
        {weightChart.length > 1 && (
          <div style={{ width: "100%", height: 90, marginTop: 8 }}>
            <ResponsiveContainer>
              <LineChart data={weightChart}><Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="card">
        <p className="section-title mb-3">{t.dashGym}</p>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{client.plan?.name || t.dashUnassigned}</div>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{client.plan?.days?.length || 0} {t.days} · {(client.workouts || []).length} {t.workouts.toLowerCase()}</p>
      </div>
      <div className="card">
        <p className="section-title mb-3">{t.dashCalendar}</p>
        {next ? (
          <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{next.date}</div><p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{next.time || "—"}</p></div>
        ) : <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashUnassigned}</p>}
      </div>
      <div className="card">
        <p className="section-title mb-3">{t.dashNotes}</p>
        {lastNote ? (
          <div><p className="text-sm" style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}>{lastNote.text}</p><span className="text-xs" style={{ color: "var(--muted)" }}>{lastNote.date}</span></div>
        ) : <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>}
      </div>
    </div>
  );
}

function Measures({ client, saveClient, t }) {
  const [mType, setMType] = useState("weight");
  const [mVal, setMVal] = useState("");

  async function addMeasure() {
    const n = parseFloat(mVal);
    if (isNaN(n) || n <= 0) return;
    await saveClient({ ...client, measures: [...(client.measures || []), { id: uid(), date: todayISO(), type: mType, value: n }] });
    setMVal("");
  }

  const chart = measurementsForType(client.measures || [], mType);
  const list = (client.measures || []).filter((m) => m.type === mType).slice().reverse();

  return (
    <div className="dash-measures">
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 28 }}>
        {MEASURE_TYPES.map((m) => (
          <button key={m} className={`chip ${mType === m ? "active" : ""}`} onClick={() => setMType(m)}>{t[`measureType_${m}`]}</button>
        ))}
      </div>

      <div className="card mb-5">
        <p className="section-title mb-4">{t.progression}</p>
        {chart.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>{t.noMeasures}</p>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} width={36} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card mb-5">
        <div className="flex gap-3" style={{ maxWidth: 420 }}>
          <input className="field flex-1" type="number" value={mVal} onChange={(e) => setMVal(e.target.value)} placeholder={t.measureValuePlaceholder} onKeyDown={(e) => e.key === "Enter" && addMeasure()} />
          <button className="btn btn-primary flex items-center gap-2 px-5" onClick={addMeasure}><Plus size={16} /> {t.saveMeasure}</button>
        </div>
      </div>

      {list.length > 0 && (
        <div className="card">
          <div className="dash-measure-list">
            {list.map((m) => (
              <div key={m.id} className="flex justify-between text-sm py-1">
                <span style={{ color: "var(--muted)" }}>{m.date}</span>
                <span style={{ color: "var(--text)" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Notes({ client, saveClient, t }) {
  const [note, setNote] = useState("");

  async function addNote() {
    if (!note.trim()) return;
    await saveClient({ ...client, notes: [...(client.notes || []), { id: uid(), date: todayISO(), text: note.trim() }] });
    setNote("");
  }

  async function removeNote(id) {
    await saveClient({ ...client, notes: (client.notes || []).filter((n) => n.id !== id) });
  }

  return (
    <div className="dash-notes">
      <div className="card mb-5">
        <textarea
          className="field"
          style={{ minHeight: 120, resize: "vertical", lineHeight: 1.5 }}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.dashNotesPlaceholder}
        />
        <button className="btn btn-primary mt-3 flex items-center gap-2 px-5" onClick={addNote}><Plus size={16} /> {t.add}</button>
      </div>
      <div className="flex flex-col gap-4">
        {(client.notes || []).slice().reverse().map((n) => (
          <div key={n.id} className="card flex items-start justify-between gap-4">
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{n.date}</span>
              <p className="text-sm mt-1" style={{ color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{n.text}</p>
            </div>
            <button className="btn-icon" onClick={() => removeNote(n.id)}><Trash2 size={15} style={{ color: "var(--muted)" }} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
