import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, LayoutDashboard, Dumbbell, Ruler, StickyNote, Link as LinkIcon, User, Utensils, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useApp } from "../context/AppContext";
import { uid, todayISO, measurementsForType, sessionVolume, sessionSets, computeOverallStats } from "../lib/planUtils";
import { dailyNutritionTotals } from "../lib/nutritionStats";
import { MEASURE_GROUPS, LEGACY_TYPE_MAP, getMeasureUnit, measureTypeLabel, UNIT_PRESETS } from "../lib/measureTypes";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import { resolvedExerciseName } from "../lib/exerciseTree";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { getClientData, unlinkClient, prescribeRow } from "../lib/trainerData";
import { STORES } from "../lib/stores";
import ClientGym from "./ClientGym";
import LinkedClientGym from "./LinkedClientGym";
import ConfirmModal from "../components/ConfirmModal";
import NumberField from "../components/NumberField";

const MAX_MEASURE_VALUE = 1000;

// Same current type set solo users' Measures page uses — client.measures can
// still carry pre-migration type names (e.g. "arms"), which have no
// matching `measureType_*` string and used to render as literal "undefined".
const MEASURE_TYPES = MEASURE_GROUPS.flatMap((g) => g.types);

export default function ClientDetail({ client, onDeleted }) {
  if (client.linkedUserId) return <LinkedClientDetail client={client} onUnlinked={onDeleted} />;
  return <ManualClientDetail client={client} onDeleted={onDeleted} />;
}

function ManualClientDetail({ client, onDeleted }) {
  const { t, saveClient, deleteClient } = useApp();
  const [section, setSection] = useState("overview");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <User size={13} /> {t.dashManual}
          </p>
          {client.info && <p className="text-sm" style={{ color: "var(--muted)" }}>{client.info}</p>}
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => setConfirmingDelete(true)} title={t.dashDelete} aria-label={t.dashDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      {confirmingDelete && (
        <ConfirmModal
          title={t.deleteClientTitle.replace("{name}", client.name)}
          message={t.deleteClientConfirm}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={remove}
        />
      )}

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
        <div style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
          {weight ? `${weight.value}` : "—"}
          <span className="text-sm" style={{ color: "var(--muted)" }}> kg</span>
        </div>
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
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>{next.date}</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{next.time || "—"}</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashUnassigned}</p>
        )}
      </div>
      <div className="card">
        <p className="section-title mb-3">{t.dashNotes}</p>
        {lastNote ? (
          <div>
            <p className="text-sm" style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}>{lastNote.text}</p>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{lastNote.date}</span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>
        )}
      </div>
    </div>
  );
}

// Same chart+history card client's own MeasuresPage.jsx uses, minus the
// title — the trainer picks a type via chips instead. Value input mirrors
// MeasuresPage.jsx's own so the trainer can log a measurement in person.
function MeasureCard({ t, chartData, history, unit, onDelete, onSave, saveError }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_MEASURE_VALUE) {
      setError(t.measureInvalidValue);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(n);
      setVal("");
    } catch {
      setError(t.measureSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      {onSave && (
        <div className="flex gap-3 items-center">
          <div className="flex-1" style={{ position: "relative" }}>
            <NumberField
              className="field"
              placeholder={t.measureValuePlaceholder}
              value={val}
              onChange={(e) => { setVal(e.target.value); setError(null); }}
              style={{ width: "100%", paddingRight: 36, ...(error ? { borderColor: "var(--danger)" } : null) }}
            />
            <span
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, color: "var(--muted)", pointerEvents: "none",
              }}
            >
              {unit}
            </span>
          </div>
          <button className="btn btn-primary px-5 py-2.5" onClick={handleSave} disabled={saving}>
            {t.saveMeasure}
          </button>
        </div>
      )}

      {(error || saveError) && (
        <p className="text-xs" style={{ color: "var(--danger)", margin: 0 }}>
          {error || saveError}
        </p>
      )}

      {chartData.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>{t.noMeasures}</p>
      ) : (
        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
          {history.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm" style={{ padding: "8px 0" }}>
              <span style={{ color: "var(--muted)" }}>{m.dateLabel}</span>
              <div className="flex items-center gap-3">
                <span style={{ color: "var(--text)" }}>{m.value} {unit}</span>
                {onDelete && (
                  <button onClick={() => onDelete(m.id)} aria-label={t.delete} title={t.delete} style={{ color: "var(--muted)", display: "flex" }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Measures({ client, saveClient, t }) {
  const [mType, setMType] = useState("weight");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [addingType, setAddingType] = useState(false);

  // Mirrors the migration AppContext.jsx already runs for the solo user's
  // own `measurements` (LEGACY_TYPE_MAP) — client.measures never went
  // through that pass since it lives on the client record, not the
  // top-level measurements store.
  const measures = useMemo(
    () => (client.measures || []).map((m) => (LEGACY_TYPE_MAP[m.type] ? { ...m, type: LEGACY_TYPE_MAP[m.type] } : m)),
    [client.measures],
  );

  const customTypes = client.measureTypes || [];

  useEffect(() => {
    const raw = client.measures || [];
    const changed = measures.some((m, i) => m.type !== raw[i]?.type);
    if (changed) saveClient({ ...client, measures });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measures]);

  async function removeMeasure(id) {
    await saveClient({ ...client, measures: measures.filter((m) => m.id !== id) });
  }

  async function addMeasure(value) {
    const entry = { id: uid(), date: todayISO(), type: mType, value };
    await saveClient({ ...client, measures: [...measures, entry] });
  }

  async function addType(name, unit) {
    const type = { id: uid(), name, unit };
    await saveClient({ ...client, measureTypes: [...customTypes, type] });
    setMType(type.id);
  }

  const chart = measurementsForType(measures, mType);
  const history = useMemo(() => [...chart].reverse(), [chart]);
  const unit = getMeasureUnit(mType, customTypes);

  return (
    <div className="dash-measures">
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 28 }}>
        {MEASURE_TYPES.map((m) => (
          <button key={m} className={`chip ${mType === m ? "active" : ""}`} onClick={() => setMType(m)}>{measureTypeLabel(m, customTypes, t)}</button>
        ))}
        {customTypes.map((m) => (
          <button key={m.id} className={`chip ${mType === m.id ? "active" : ""}`} onClick={() => setMType(m.id)}>{measureTypeLabel(m.id, customTypes, t)}</button>
        ))}
        <button className="chip chip-add" onClick={() => setAddingType(true)} aria-label={t.measureAddTypeAria}>{t.measureAddTypePill}</button>
      </div>

      <MeasureCard t={t} chartData={chart} history={history} unit={unit} onDelete={(id) => setPendingDelete(id)} onSave={addMeasure} />

      {addingType && (
        <AddMeasureTypeModal
          t={t}
          existingNames={[...MEASURE_TYPES.map((m) => t[`measureType_${m}`]), ...customTypes.map((m) => m.name)]}
          onCancel={() => setAddingType(false)}
          onAdd={(name, unit) => { addType(name, unit); setAddingType(false); }}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteMeasureTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { removeMeasure(pendingDelete); setPendingDelete(null); }}
        />
      )}
    </div>
  );
}

const OTHER_UNIT = "__other__";

function AddMeasureTypeModal({ t, existingNames, onCancel, onAdd }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState(UNIT_PRESETS[0]);
  const [customUnit, setCustomUnit] = useState("");
  const [error, setError] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return setError(t.measureTypeNameRequired);
    const dup = existingNames.some((n) => n.trim().toLowerCase() === trimmed.toLowerCase());
    if (dup) return setError(t.measureTypeDuplicate);
    const isOtherUnit = unit === OTHER_UNIT;
    const trimmedUnit = customUnit.trim();
    if (isOtherUnit && !trimmedUnit) return setError(t.measureTypeUnitRequired);
    onAdd(trimmed, isOtherUnit ? trimmedUnit : unit);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-center fade-in" onClick={(e) => e.stopPropagation()}>
        <p className="font-semibold mb-3" style={{ color: "var(--text)" }}>{t.measureAddType}</p>
        <label className="text-sm" style={{ color: "var(--muted)" }}>{t.measureTypeNameLabel}</label>
        <input
          className="field mt-1"
          style={{ marginBottom: 6 }}
          value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }}
          placeholder={t.measureTypeNamePlaceholder}
          autoFocus
        />
        <label className="text-sm" style={{ color: "var(--muted)" }}>{t.measureTypeUnitLabel}</label>
        <div className="flex flex-wrap mt-1" style={{ gap: 6, marginBottom: 6 }}>
          {UNIT_PRESETS.map((u) => (
            <button key={u} className={`chip ${unit === u ? "active" : ""}`} onClick={() => { setUnit(u); setError(""); }}>
              {u}
            </button>
          ))}
          <button className={`chip ${unit === OTHER_UNIT ? "active" : ""}`} onClick={() => { setUnit(OTHER_UNIT); setError(""); }}>
            {t.measureTypeUnitOther}
          </button>
        </div>
        {unit === OTHER_UNIT && (
          <input
            className="field mt-1"
            style={{ marginBottom: 6 }}
            placeholder={t.measureTypeUnitPlaceholder}
            value={customUnit}
            onChange={(e) => { setCustomUnit(e.target.value); setError(""); }}
          />
        )}
        {error && <p className="text-sm" style={{ color: "var(--accent-2, orange)", marginBottom: 6 }}>{error}</p>}
        <div className="flex gap-3 mt-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel}>{t.cancel}</button>
          <button className="btn btn-primary flex-1" onClick={submit}>{t.add}</button>
        </div>
      </div>
    </div>
  );
}

function Notes({ client, saveClient, t }) {
  const [note, setNote] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

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
            <button className="btn-icon" onClick={() => setPendingDelete(n.id)} aria-label={t.delete}><Trash2 size={15} style={{ color: "var(--muted)" }} /></button>
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteNoteTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            removeNote(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}

function LinkedClientDetail({ client, onUnlinked }) {
  const { t, lang } = useApp();
  const configured = useSupabaseConfigured();
  const [section, setSection] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState("");
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const scopes = client.scopes || [];
  const hasWorkouts = scopes.includes("workouts");
  const hasNutrition = scopes.includes("nutrition");
  const hasMeasures = scopes.includes("measures");

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    function run() {
      setLoading(true);
      getClientData(client.linkedUserId, scopes)
        .then((d) => { if (!cancelled) setData(d); })
        .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.linkedUserId, configured]);

  async function unlink() {
    setUnlinking(true);
    try {
      await unlinkClient(client.linkedUserId);
      setConfirmingUnlink(false);
      onUnlinked?.();
    } catch (e) {
      setError(String(e?.message || e));
      setConfirmingUnlink(false);
    } finally {
      setUnlinking(false);
    }
  }

  const sections = [
    { id: "overview", Icon: LayoutDashboard, label: t.dashOverview },
    ...(hasWorkouts ? [{ id: "gym", Icon: Dumbbell, label: t.dashGym }] : []),
    ...(hasWorkouts ? [{ id: "sessions", Icon: Dumbbell, label: t.dashSessions }] : []),
    ...(hasNutrition ? [{ id: "nutrition", Icon: Utensils, label: t.dashNutrition }] : []),
    ...(hasMeasures ? [{ id: "measures", Icon: Ruler, label: t.dashMeasures }] : []),
  ];

  return (
    <div className="dash-detail-wrap">
      <div className="dash-detail-head">
        <div>
          <h2 className="display" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>{client.name}</h2>
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
            <LinkIcon size={13} /> {t.dashLinked}
          </p>
        </div>
        {configured && (
          <button className="btn btn-ghost text-sm" onClick={() => setConfirmingUnlink(true)} disabled={unlinking}>
            {t.dashUnlinkClient}
          </button>
        )}
      </div>

      {confirmingUnlink && (
        <ConfirmModal
          title={t.dashUnlinkClientTitle.replace("{name}", client.name)}
          message={t.dashUnlinkClientMessage}
          confirmLabel={t.dashUnlinkClient}
          cancelLabel={t.cancel}
          onConfirm={unlink}
          onCancel={() => setConfirmingUnlink(false)}
        />
      )}

      {!configured ? (
        <div className="dash-section">
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashSyncUnavailable}</p>
        </div>
      ) : loading ? (
        <div className="dash-section">
          <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>
        </div>
      ) : error ? (
        <div className="dash-section">
          <p className="text-sm" style={{ color: "var(--accent-2, orange)" }}>{error}</p>
        </div>
      ) : (
        <div className="dash-detail-body">
          <nav className="dash-subnav">
            {sections.map(({ id, Icon, label }) => (
              <button key={id} className={`dash-subnav-item ${section === id ? "active" : ""}`} onClick={() => setSection(id)}>
                <Icon size={16} /> <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="dash-section">
            {section === "overview" && <LinkedOverview data={data} hasWorkouts={hasWorkouts} hasMeasures={hasMeasures} t={t} />}
            {section === "gym" && hasWorkouts && (
              <LinkedClientGym client={client} data={data} lang={lang} t={t} />
            )}
            {section === "sessions" && hasWorkouts && <LinkedSessions sessions={data.sessions || []} lang={lang} t={t} />}
            {section === "nutrition" && hasNutrition && <LinkedNutrition foodLog={data.foodLog || []} />}
            {section === "measures" && hasMeasures && (
              <LinkedMeasures client={client} measurements={data.measurements || []} customTypes={data.measureTypes || []} t={t} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedOverview({ data, hasWorkouts, hasMeasures, t }) {
  const sessions = data.sessions || [];
  const measurements = data.measurements || [];
  const stats = hasWorkouts ? computeOverallStats(sessions) : null;
  const weight = hasMeasures ? measurementsForType(measurements, "weight").slice(-1)[0] : null;

  if (!hasWorkouts && !hasMeasures) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNothingShared}</p>;
  }

  return (
    <div className="dash-grid">
      {hasWorkouts && (
        <div className="card">
          <p className="section-title mb-3">{t.dashSessions}</p>
          <div style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>{stats.totalSessions}</div>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{stats.totalSets} {t.sets.toLowerCase()}</p>
        </div>
      )}
      {hasMeasures && (
        <div className="card">
          <p className="section-title mb-3">{t.dashMeasures}</p>
          <div style={{ fontSize: 30, fontWeight: 900, color: "var(--text)" }}>
            {weight ? weight.value : "—"}
            <span className="text-sm" style={{ color: "var(--muted)" }}> kg</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkedSessions({ sessions, lang, t }) {
  const recent = sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  return (
    <div className="flex flex-col gap-3">
      {recent.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>}
      {recent.map((s) => (
        <div key={s.id} className="card">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{s.date}</span>
            <span className="text-sm" style={{ color: "var(--muted)" }}>{Math.round(sessionVolume(s))} kg · {sessionSets(s)} {t.sets.toLowerCase()}</span>
          </div>
          <div className="flex flex-col gap-1">
            {(s.exercises || []).map((e, i) => (
              <span key={i} className="text-xs" style={{ color: "var(--muted)" }}>{resolvedExerciseName(e.exerciseId, lang)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LinkedNutrition({ foodLog }) {
  const byDay = dailyNutritionTotals(foodLog);
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  return (
    <div className="flex flex-col gap-3">
      {days.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>}
      {days.map(([date, totals]) => (
        <div key={date} className="card flex items-center justify-between">
          <span style={{ fontWeight: 700, color: "var(--text)" }}>{date}</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {Math.round(totals.kcal)} kcal · {Math.round(totals.protein)}P {Math.round(totals.carbs)}C {Math.round(totals.fat)}F
          </span>
        </div>
      ))}
    </div>
  );
}

function LinkedMeasures({ client, measurements: initialMeasurements, customTypes: initialCustomTypes, t }) {
  const [mType, setMType] = useState("weight");
  const [customTypes, setCustomTypes] = useState(initialCustomTypes);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [addingType, setAddingType] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(null);

  const measures = useMemo(
    () => measurements.map((m) => (LEGACY_TYPE_MAP[m.type] ? { ...m, type: LEGACY_TYPE_MAP[m.type] } : m)),
    [measurements],
  );
  const chart = measurementsForType(measures, mType);
  const history = useMemo(() => [...chart].reverse(), [chart]);
  const unit = getMeasureUnit(mType, customTypes);

  async function addType(name, unit) {
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.measureTypes, { id: uid(), name, unit });
      setCustomTypes((prev) => [...prev, saved]);
      setMType(saved.id);
      setAddingType(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function addMeasurement(value) {
    setSaveError(null);
    try {
      const entry = { id: uid(), date: todayISO(), type: mType, value };
      const saved = await prescribeRow(client.linkedUserId, STORES.measurements, entry);
      setMeasurements((prev) => [...prev, saved]);
    } catch (e) {
      setSaveError(String(e?.message || e));
    }
  }

  return (
    <div className="dash-measures">
      {error && <p className="text-sm mb-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}
      <div className="flex gap-2" style={{ flexWrap: "wrap", marginBottom: 28 }}>
        {MEASURE_TYPES.map((m) => (
          <button key={m} className={`chip ${mType === m ? "active" : ""}`} onClick={() => setMType(m)}>{measureTypeLabel(m, customTypes, t)}</button>
        ))}
        {customTypes.map((m) => (
          <button key={m.id} className={`chip ${mType === m.id ? "active" : ""}`} onClick={() => setMType(m.id)}>{measureTypeLabel(m.id, customTypes, t)}</button>
        ))}
        <button className="chip chip-add" onClick={() => setAddingType(true)} aria-label={t.measureAddTypeAria} disabled={busy}>{t.measureAddTypePill}</button>
      </div>

      <MeasureCard t={t} chartData={chart} history={history} unit={unit} onSave={addMeasurement} saveError={saveError} />

      {addingType && (
        <AddMeasureTypeModal
          t={t}
          existingNames={[...MEASURE_TYPES.map((m) => t[`measureType_${m}`]), ...customTypes.map((m) => m.name)]}
          onCancel={() => setAddingType(false)}
          onAdd={addType}
        />
      )}
    </div>
  );
}
