import { useEffect, useMemo, useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { Trash2, Plus, Pencil, Check, LayoutDashboard, Dumbbell, Ruler, StickyNote, Link as LinkIcon, Lock, Utensils, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { StudentNav, StudentNavBar, StudentSwitcher } from "./StudentNav";
import RenameStudentModal from "./RenameStudentModal";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { useApp } from "../context/useApp";
import { friendlyError } from "../lib/friendlyError";
import { uid, todayISO, measurementsForType, measureGoalProgress, sessionVolume, sessionSets, computeOverallStats, formatDateShort, formatDateTimeShort, isPrescribed } from "../lib/planUtils";
import { dailyNutritionTotals, EMPTY_DAY } from "../lib/nutritionStats";
import { macroGoalShares, MICRO_COLORS } from "../lib/nutritionCalc";
import { MICRONUTRIENTS } from "../lib/foodProvider";
import { MEASURE_GROUPS, LEGACY_TYPE_MAP, getMeasureUnit, measureTypeLabel, UNIT_PRESETS } from "../lib/measureTypes";
import { CHART_TOOLTIP_STYLE } from "../lib/chartTheme";
import { resolvedExerciseName } from "../lib/exerciseTree";
import { canonicalClientData } from "../lib/refMigration";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { useIsDesktop } from "../lib/useIsDesktop";
import { getClientData, unlinkClient, prescribeRow, unprescribeRow } from "../lib/trainerData";
import { isDashDemo, demoClientData } from "./demoFixture";
import { STORES } from "../lib/stores";
import { LinkedPlan, LinkedWorkoutsList } from "./LinkedClientGym";
import LinkedNutritionGoals from "./LinkedNutritionGoals";
import ConfirmModal from "../components/ConfirmModal";
import { Empty, Skeleton, PanelHead } from "./parts";
import NumberField from "../components/NumberField";
import MacroRing from "../components/MacroRing";

const MAX_MEASURE_VALUE = 1000;

// Same current type set solo users' Measures page uses.
const MEASURE_TYPES = MEASURE_GROUPS.flatMap((g) => g.types);

// Same chart+history card client's own MeasuresPage.jsx uses, minus the
// title — the trainer picks a type via chips instead. Value input mirrors
// MeasuresPage.jsx's own so the trainer can log a measurement in person.
function MeasureCard({ t, chartData, history, unit, goal, onDelete, onSave, saveError }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fit data and goal line, not from zero.
  const scale = chartData.map((d) => d.value).concat(goal ? [goal.target] : []);
  const lo = Math.min(...scale);
  const hi = Math.max(...scale);
  const pad = (hi - lo) * 0.15 || 1;

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
    <div className="dash-panel flex flex-col gap-3">
      {onSave && (
        <div className="flex gap-3 items-center">
          <div style={{ position: "relative", flex: "0 1 280px" }}>
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
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} width={32} domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              {goal && (
                <ReferenceLine
                  y={goal.target}
                  stroke="var(--muted)"
                  strokeDasharray="4 4"
                  label={{ value: t.goal, position: "insideTopRight", fill: "var(--muted)", fontSize: 10 }}
                />
              )}
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
                <span className="tabular" style={{ color: "var(--text)" }}>{m.value} {unit}</span>
                {onDelete && isPrescribed(m) ? (
                  <button onClick={() => onDelete(m.id)} aria-label={t.delete} title={t.delete} style={{ color: "var(--muted)", display: "flex" }}>
                    <X size={16} />
                  </button>
                ) : onDelete ? (
                  <Lock size={13} style={{ color: "var(--muted)" }} aria-label={t.dashClientOwn} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const OTHER_UNIT = "__other__";

function AddMeasureTypeModal({ t, existingNames, onCancel, onAdd }) {
  useEscapeKey(onCancel);
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
    <div role="dialog" aria-modal="true" className="modal-overlay" onClick={onCancel}>
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
        {error && <p className="text-sm" style={{ color: "var(--danger)", marginBottom: 6 }}>{error}</p>}
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
      <div className="dash-panel mb-5">
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
          <div key={n.id} className="dash-panel flex items-start justify-between gap-4">
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

// `nav` lives in the parent so switching student keeps the page.
export default function ClientDetail({ client, students, onSwitch, nav, onNav, onUnlinked, onBack }) {
  const { t, lang, clients, saveClient } = useApp();
  const configured = useSupabaseConfigured() || isDashDemo();
  const isDesktop = useIsDesktop();
  const { section, gym: gymSub, nutrition: nutritionSub, measures: measuresSub } = nav;
  const [data, setData] = useState(() => (isDashDemo() ? demoClientData(client.linkedUserId) : null));
  const [loading, setLoading] = useState(configured && !isDashDemo());
  const [error, setError] = useState("");
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [planDirty, setPlanDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(null);

  const scopes = client.scopes || [];
  const hasWorkouts = scopes.includes("workouts");
  const hasNutrition = scopes.includes("nutrition");
  const hasMeasures = scopes.includes("measures");

  // The trainer's own private annotations about this student, kept in the
  // local `clients` store keyed by the student's user id. Never synced —
  // these are the trainer's notes, not the student's data.
  const annotations = clients.find((c) => c.id === client.linkedUserId) || { id: client.linkedUserId };

  useEffect(() => {
    if (isDashDemo() || !configured) return;
    let cancelled = false;
    function run() {
      setLoading(true);
      getClientData(client.linkedUserId, scopes)
        .then((d) => { if (!cancelled) setData(canonicalClientData(d)); })
        .catch((e) => { if (!cancelled) setError(friendlyError(e, t)); })
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
      setError(friendlyError(e, t));
      setConfirmingUnlink(false);
    } finally {
      setUnlinking(false);
    }
  }

  // Every area is always listed. One the student hasn't shared stays visible
  // but says so — a section that silently vanishes leaves the trainer
  // wondering whether the feature exists at all.
  const areas = [
    { id: "overview", Icon: LayoutDashboard, label: t.dashOverview, shared: true },
    {
      id: "gym", Icon: Dumbbell, label: t.dashGym, shared: hasWorkouts,
      views: [
        { id: "plan", label: t.dashPlanTab },
        { id: "workouts", label: t.workouts },
        { id: "sessions", label: t.dashSessions },
      ],
      view: gymSub,
    },
    {
      id: "nutrition", Icon: Utensils, label: t.dashNutrition, shared: hasNutrition,
      views: [
        { id: "goals", label: t.nutritionGoals },
        { id: "daily", label: t.dashDailyData },
      ],
      view: nutritionSub,
    },
    {
      id: "measures", Icon: Ruler, label: t.dashMeasures, shared: hasMeasures,
      views: [
        { id: "log", label: t.dashMeasuresLogTab },
        { id: "goals", label: t.dashMeasuresGoalsTab },
      ],
      view: measuresSub,
    },
    { id: "notes", Icon: StickyNote, label: t.dashNotes, shared: true },
  ];
  const area = areas.find((a) => a.id === section) || areas[0];
  const sharedScopes = areas.filter((a) => a.shared && a.views).map((a) => a.label.toLowerCase());

  // Leaving mid-edit asks first; the draft is in memory.
  function guard(go) {
    if (planDirty) setPendingLeave(() => go);
    else go();
  }

  function select(id, viewId) {
    if (id === section && (!viewId || viewId === nav[id])) return;
    guard(() => onNav(viewId ? { section: id, [id]: viewId } : { section: id }));
  }

  const identity = (
    <>
      {isDesktop && (
        <button type="button" className="dash-back" onClick={() => guard(onBack)}>
          <ChevronLeft size={16} /> {t.dashClients}
        </button>
      )}
      <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
        <StudentSwitcher current={client} students={students} onSwitch={(id) => guard(() => onSwitch(id))} />
        <button type="button" className="btn-icon" onClick={() => setRenaming(true)} aria-label={t.dashRenameStudent} title={t.dashRenameStudent}>
          <Pencil size={15} style={{ color: "var(--muted)" }} />
        </button>
      </div>
      <p className="dash-client-meta">
        <LinkIcon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span style={{ color: "var(--accent)" }}>{t.dashLinked}</span>
      </p>
      {sharedScopes.length > 0 && <p className="dash-client-scopes">{sharedScopes.join(", ")}</p>}
    </>
  );
  const unlinkButton = configured && (
    <button className="btn btn-ghost text-sm" onClick={() => setConfirmingUnlink(true)} disabled={unlinking}>
      {t.dashUnlinkClient}
    </button>
  );

  return (
    <div className="dash-student">
      {isDesktop && (
        <aside className="dash-rail">
          <div className="dash-student-id">{identity}</div>
          <StudentNav areas={areas} section={section} onSelect={select} />
          <div className="dash-rail-foot">{unlinkButton}</div>
        </aside>
      )}

      <div className="dash-student-main">
        {!isDesktop && (
          <>
            <header className="dash-student-head">
              <div className="dash-student-id">{identity}</div>
              {unlinkButton}
            </header>
            <StudentNavBar areas={areas} section={section} onSelect={select} />
          </>
        )}
        <div className="dash-content">
          {!configured ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashSyncUnavailable}</p>
          ) : loading ? (
            <Skeleton rows={4} />
          ) : error ? (
            <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>
          ) : (
            <>
              {!area.shared && <ScopeNotShared label={area.label} t={t} />}

              {section === "overview" && (
                <LinkedOverview
                  data={data}
                  annotations={annotations}
                  hasWorkouts={hasWorkouts}
                  hasNutrition={hasNutrition}
                  hasMeasures={hasMeasures}
                  t={t}
                />
              )}
              {section === "gym" && hasWorkouts && (
                <>
                  {gymSub === "plan" && <LinkedPlan client={client} plans={data.plans || []} workouts={data.workouts || []} t={t} onDirtyChange={setPlanDirty} />}
                  {gymSub === "workouts" && (
                    <LinkedWorkoutsList
                      client={client}
                      workouts={data.workouts || []}
                      lang={lang}
                      t={t}
                      onChanged={(next) => setData((d) => ({ ...d, workouts: next }))}
                    />
                  )}
                  {gymSub === "sessions" && <LinkedSessions sessions={data.sessions || []} lang={lang} t={t} />}
                </>
              )}
              {section === "nutrition" && hasNutrition && (
                <>
                  {nutritionSub === "goals" && <LinkedNutritionGoals client={client} goals={data.nutritionGoals?.[0] || null} t={t} />}
                  {nutritionSub === "daily" && <LinkedNutrition foodLog={data.foodLog || []} goals={data.nutritionGoals?.[0] || null} t={t} />}
                </>
              )}
              {section === "measures" && hasMeasures && (
                <>
                  {measuresSub === "log" && (
                    <LinkedMeasures client={client} measurements={data.measurements || []} customTypes={data.measureTypes || []} goals={data.measureGoals || []} t={t} />
                  )}
                  {measuresSub === "goals" && (
                    <LinkedMeasureGoals
                      client={client}
                      measurements={data.measurements || []}
                      customTypes={data.measureTypes || []}
                      goals={data.measureGoals || []}
                      onChanged={(next) => setData((d) => ({ ...d, measureGoals: next }))}
                      t={t}
                    />
                  )}
                </>
              )}
              {section === "notes" && <Notes client={annotations} saveClient={saveClient} t={t} />}
            </>
          )}
        </div>
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

      {pendingLeave && (
        <ConfirmModal
          title={t.dashLeaveTitle}
          message={t.dashLeaveMessage}
          confirmLabel={t.dashLeaveConfirm}
          cancelLabel={t.dashLeaveStay}
          onCancel={() => setPendingLeave(null)}
          onConfirm={() => {
            const go = pendingLeave;
            setPendingLeave(null);
            go();
          }}
        />
      )}

      {renaming && (
        <RenameStudentModal
          client={client}
          alias={annotations.alias || ""}
          onSave={(alias) => saveClient({ ...annotations, alias })}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  );
}

function ScopeNotShared({ label, t }) {
  return (
    <section className="dash-panel">
      <PanelHead title={label} desc={t.dashScopeNotShared} />
    </section>
  );
}

function OverviewCard({ label, children }) {
  return (
    <div className="dash-panel">
      <p className="section-title mb-3">{label}</p>
      {children}
    </div>
  );
}

function LinkedOverview({ data, annotations, hasWorkouts, hasNutrition, hasMeasures, t }) {
  const sessions = data.sessions || [];
  const measurements = data.measurements || [];
  const stats = hasWorkouts ? computeOverallStats(sessions) : null;
  const lastSession = hasWorkouts
    ? sessions.slice().sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  // Remap legacy type ids before computing progress — a goal on "waist"
  // (once "belly") would otherwise miss its own history.
  const migratedMeasurements = hasMeasures
    ? measurements.map((m) => (LEGACY_TYPE_MAP[m.type] ? { ...m, type: LEGACY_TYPE_MAP[m.type] } : m))
    : [];
  const customMeasureTypes = data.measureTypes || [];
  const goalRows = hasMeasures
    ? (data.measureGoals || []).map((g) => ({
        type: g.id,
        label: measureTypeLabel(g.id, customMeasureTypes, t),
        unit: getMeasureUnit(g.id, customMeasureTypes),
        progress: measureGoalProgress(migratedMeasurements, g.id, g.target),
      }))
    : [];
  const plan = (data.plans || []).find((p) => isPrescribed(p)) || null;
  const goals = data.nutritionGoals?.[0] || null;
  const nextAppointment = (annotations?.schedule || [])
    .slice()
    .filter((e) => e.date >= todayISO())
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))[0];
  const lastNote = (annotations?.notes || []).slice(-1)[0];

  return (
    <div className="dash-grid">
      <OverviewCard label={t.dashSessions}>
        {hasWorkouts ? (
          <>
            <div className="dash-stat">{stats.totalSessions}</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
              {stats.totalSets} {t.sets.toLowerCase()}
              {lastSession && <> · {t.dashLastSession} {formatDateShort(lastSession.date)}</>}
            </p>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashScopeNotShared}</p>
        )}
      </OverviewCard>

      <OverviewCard label={t.dashMeasures}>
        {!hasMeasures ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashScopeNotShared}</p>
        ) : goalRows.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoMeasureGoals}</p>
        ) : (
          <div className="flex flex-col" style={{ gap: 12 }}>
            {goalRows.slice(0, 3).map((g) => (
              <div key={g.type} className="flex flex-col" style={{ gap: 5 }}>
                <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                  <span className="font-semibold" style={{ color: "var(--text)" }}>{g.label}</span>
                  {!g.progress.hasData ? (
                    <span style={{ color: "var(--muted)" }}>{g.progress.target} {g.unit}</span>
                  ) : g.progress.reached ? (
                    <span className="flex items-center gap-1" style={{ color: "var(--success)", fontWeight: 700 }}>
                      <Check size={13} /> {t.dashMeasureGoalReached}
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      {g.progress.current} / {g.progress.target} {g.unit}
                    </span>
                  )}
                </div>
                {!g.progress.hasData ? (
                  <p className="text-xs" style={{ color: "var(--muted)", margin: 0 }}>{t.dashMeasureGoalNoData}</p>
                ) : (
                  <div style={{ height: 6, borderRadius: 999, background: "var(--surface2)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        width: `${g.progress.percent}%`,
                        background: g.progress.reached ? "var(--success)" : "var(--accent)",
                        transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            {goalRows.length > 3 && (
              <p className="text-xs" style={{ color: "var(--muted)", margin: 0 }}>
                {t.dashMeasureGoalsMore.replace("{n}", goalRows.length - 3)}
              </p>
            )}
          </div>
        )}
      </OverviewCard>

      <OverviewCard label={t.dashGym}>
        {hasWorkouts ? (
          <>
            <div className="dash-panel-strong">{plan ? plan.name || t.editPlan : t.dashNoPlan}</div>
            {plan && (
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {plan.days?.length || 0} {t.days} · {(data.workouts || []).length} {t.workouts.toLowerCase()}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashScopeNotShared}</p>
        )}
      </OverviewCard>

      <OverviewCard label={t.dashNutrition}>
        {hasNutrition ? (
          goals ? (
            <>
              <div className="dash-panel-strong tabular">{goals.kcal} {t.kcal}</div>
              <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
                {goals.protein}g / {goals.carbs}g / {goals.fat}g
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoGoals}</p>
          )
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashScopeNotShared}</p>
        )}
      </OverviewCard>

      <OverviewCard label={t.dashCalendar}>
        {nextAppointment ? (
          <>
            <div className="dash-panel-strong">{formatDateShort(nextAppointment.date)}</div>
            <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{nextAppointment.time || "–"}</p>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoAppointment}</p>
        )}
      </OverviewCard>

      <OverviewCard label={t.dashNotes}>
        {lastNote ? (
          <>
            <p className="text-sm" style={{ color: "var(--text)", whiteSpace: "pre-wrap" }}>{lastNote.text}</p>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{formatDateShort(lastNote.date)}</span>
          </>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoNotes}</p>
        )}
      </OverviewCard>
    </div>
  );
}

function LinkedSessions({ sessions, lang, t }) {
  const recent = sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  return (
    <div className="flex flex-col gap-3">
      {recent.length === 0 && <Empty>{t.dashNoSessions}</Empty>}
      {recent.map((s) => (
        <div key={s.id} className="dash-panel">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span style={{ fontWeight: 700, color: "var(--text)" }}>{formatDateTimeShort(s.date)}</span>
            <span className="text-sm tabular" style={{ color: "var(--muted)" }}>{Math.round(sessionVolume(s))} kg · {sessionSets(s)} {t.sets.toLowerCase()}</span>
          </div>
          <div className="flex flex-col gap-1">
            {(s.exercises || []).map((e, i) => (
              <span key={i} className="text-sm" style={{ color: "var(--text)" }}>{resolvedExerciseName(e.exerciseId, lang)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function mealLabel(mealId, t) {
  return t[mealId] || mealId;
}

function LinkedNutrition({ foodLog, goals, t }) {
  const byDay = dailyNutritionTotals(foodLog);
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a)).slice(0, 14);
  const [index, setIndex] = useState(0);
  const [showMicros, setShowMicros] = useState(false);

  if (days.length === 0) {
    return (
      <section className="dash-panel">
        <PanelHead title={t.dashNutrition} desc={t.dashNoNutritionData} />
      </section>
    );
  }

  const selected = days[Math.min(index, days.length - 1)];
  const totals = byDay.get(selected) ?? EMPTY_DAY;
  const dayItems = foodLog.filter((e) => e.date === selected);
  const shares = macroGoalShares(totals, goals || undefined);

  const macros = [
    { key: "protein", short: t.proteinShort, val: Math.round(totals.protein), color: "var(--protein)" },
    { key: "carbs", short: t.carbsShort, val: Math.round(totals.carbs), color: "var(--carbs)" },
    { key: "fat", short: t.fatShort, val: Math.round(totals.fat), color: "var(--fat)" },
  ];

  const micros = MICRONUTRIENTS.map((m) => ({
    key: m.key,
    label: t[m.key],
    val: Math.round(totals[m.key] ?? 0),
    goal: goals?.[m.key] ?? m.rda,
    unit: m.unit,
    color: MICRO_COLORS[m.key] ?? "var(--muted)",
  }));

  const mealGroups = [];
  for (const item of dayItems) {
    let group = mealGroups.find((g) => g.meal === item.meal);
    if (!group) { group = { meal: item.meal, items: [] }; mealGroups.push(group); }
    group.items.push(item);
  }

  return (
    <section className="dash-panel">
      <PanelHead
        title={t.dashNutrition}
        actions={
          <>
            <button className="btn-icon" onClick={() => setIndex((i) => Math.min(days.length - 1, i + 1))} disabled={index >= days.length - 1} aria-label={t.dashPrevDay}>
              <ChevronLeft size={18} style={{ color: "var(--text)" }} />
            </button>
            <span className="text-sm font-semibold tabular" style={{ color: "var(--text)", minWidth: 72, textAlign: "center" }}>{formatDateShort(selected)}</span>
            <button className="btn-icon" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index <= 0} aria-label={t.dashNextDay}>
              <ChevronRight size={18} style={{ color: "var(--text)" }} />
            </button>
          </>
        }
      />

      <div className="dash-nutri">
      <div className="dash-nutri-sum">
      <div className="flex items-center justify-center">
        {/* The denominator is the goal, so the ring actually shows adherence.
            It used to be totals.kcal, which pinned it at 100% every day. */}
        <MacroRing value={totals.kcal} max={goals?.kcal || totals.kcal || 1} shares={shares} size={140}>
          <span className="dash-stat" style={{ fontSize: 26 }}>{Math.round(totals.kcal)}</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {goals?.kcal ? `/ ${goals.kcal} ${t.kcal}` : t.kcal}
          </span>
        </MacroRing>
      </div>

      <div className="flex" style={{ marginTop: 20 }}>
        {macros.map((m) => (
          <div key={m.key} className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: 999, background: m.color }} />
              <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>{m.short}</span>
            </div>
            <span className="text-sm font-bold mt-1" style={{ color: "var(--text)" }}>{m.val}g</span>
          </div>
        ))}
      </div>

      <button
        className="flex items-center justify-center gap-1 w-full"
        style={{ color: "var(--muted)", fontSize: 13, fontWeight: 600, background: "none", border: "none", marginTop: 6, minHeight: 44 }}
        onClick={() => setShowMicros((v) => !v)}
        aria-expanded={showMicros}
      >
        {t.micronutrients}
        <ChevronDown size={15} style={{ transform: showMicros ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {showMicros && (
        <div className="flex flex-col fade-in" style={{ gap: 12, marginTop: 12 }}>
          {micros.map((m) => (
            <div key={m.key} className="flex flex-col" style={{ gap: 5 }}>
              <div className="flex items-center justify-between" style={{ fontSize: 12 }}>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{m.label}</span>
                <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{m.val} / {m.goal}{m.unit}</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--surface2)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    width: `${Math.min(100, (m.val / m.goal) * 100)}%`,
                    background: m.color,
                    transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      </div>

      <div>
      <p className="section-title" style={{ fontSize: 13, marginBottom: 10 }}>{t.meals}</p>

      <div className="flex flex-col" style={{ gap: 16 }}>
        {mealGroups.length === 0 && <Empty>{t.dashNoMeals}</Empty>}
        {mealGroups.map((group) => (
          <div key={group.meal} className="flex flex-col" style={{ gap: 6 }}>
            <p className="section-title" style={{ fontSize: 12, margin: 0 }}>{mealLabel(group.meal, t)}</p>
            {group.items.map((item) => (
              <div key={item.id} className="dash-day">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "var(--text)", fontWeight: 600 }}>{item.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{item.qty}</div>
                </div>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{Math.round(item.kcal)} kcal</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      </div>
      </div>
    </section>
  );
}

function LinkedMeasures({ client, measurements: initialMeasurements, customTypes: initialCustomTypes, goals, t }) {
  const [mType, setMType] = useState("weight");
  const [customTypes, setCustomTypes] = useState(initialCustomTypes);
  const [measurements, setMeasurements] = useState(initialMeasurements);
  const [addingType, setAddingType] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
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
  const goal = goals.find((g) => g.id === mType) || null;
  const typeIds = [...MEASURE_TYPES, ...customTypes.map((m) => m.id)];

  async function addType(name, unit) {
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.measureTypes, { id: uid(), name, unit });
      setCustomTypes((prev) => [...prev, saved]);
      setMType(saved.id);
      setAddingType(false);
    } catch (e) {
      setError(friendlyError(e, t));
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
      setSaveError(friendlyError(e, t));
    }
  }

  // Only what this trainer logged can be removed — a value the student
  // recorded themselves is theirs, and the tombstone would sync back to them.
  async function removeMeasurement(id) {
    setSaveError(null);
    try {
      await unprescribeRow(client.linkedUserId, STORES.measurements, id);
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setSaveError(friendlyError(e, t));
    }
  }

  return (
    <div className="dash-measures">
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="dash-measures-grid">
        <MeasureCard
          t={t}
          chartData={chart}
          history={history}
          unit={unit}
          goal={goal}
          onSave={addMeasurement}
          onDelete={(id) => setPendingDelete(id)}
          saveError={saveError}
        />

        <div className="dash-mtypes">
          {typeIds.map((id) => {
            const latest = measurementsForType(measures, id).at(-1);
            return (
              <button key={id} type="button" className={`dash-mtype ${mType === id ? "active" : ""}`} aria-pressed={mType === id} onClick={() => setMType(id)}>
                <span className="truncate">{measureTypeLabel(id, customTypes, t)}</span>
                <span className="dash-mtype-value tabular">{latest ? `${latest.value} ${getMeasureUnit(id, customTypes)}` : "–"}</span>
              </button>
            );
          })}
          <button type="button" className="dash-mtype add" onClick={() => setAddingType(true)} aria-label={t.measureAddTypeAria} disabled={busy}>
            {t.measureAddTypePill}
          </button>
        </div>
      </div>

      {addingType && (
        <AddMeasureTypeModal
          t={t}
          existingNames={[...MEASURE_TYPES.map((m) => t[`measureType_${m}`]), ...customTypes.map((m) => m.name)]}
          onCancel={() => setAddingType(false)}
          onAdd={addType}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t.deleteMeasureTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { removeMeasurement(pendingDelete); setPendingDelete(null); }}
        />
      )}
    </div>
  );
}

function LinkedMeasureGoals({ client, measurements, customTypes, goals: initialGoals, onChanged, t }) {
  const [goals, setGoals] = useState(initialGoals);
  const [editingType, setEditingType] = useState(null);
  const [draft, setDraft] = useState("");
  const [pendingRemove, setPendingRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const migrated = useMemo(
    () => measurements.map((m) => (LEGACY_TYPE_MAP[m.type] ? { ...m, type: LEGACY_TYPE_MAP[m.type] } : m)),
    [measurements],
  );
  const rows = [
    ...MEASURE_TYPES.map((type) => ({ type, label: measureTypeLabel(type, customTypes, t), unit: getMeasureUnit(type, customTypes) })),
    ...customTypes.map((c) => ({ type: c.id, label: measureTypeLabel(c.id, customTypes, t), unit: getMeasureUnit(c.id, customTypes) })),
  ];

  function goalFor(type) {
    return goals.find((g) => g.id === type) || null;
  }

  function startEdit(type, current) {
    setEditingType(type);
    setDraft(current != null ? String(current) : "");
    setError("");
  }

  async function save(type) {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n <= 0 || n > MAX_MEASURE_VALUE) {
      setError(t.measureInvalidValue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.measureGoals, { id: type, target: n });
      setGoals((prev) => {
        const next = [...prev.filter((g) => g.id !== type), saved];
        onChanged?.(next);
        return next;
      });
      setEditingType(null);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove(type) {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.measureGoals, type);
      setGoals((prev) => {
        const next = prev.filter((g) => g.id !== type);
        onChanged?.(next);
        return next;
      });
      setPendingRemove(null);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dash-panel">
      <PanelHead title={t.dashMeasuresGoalsTab} desc={t.dashMeasureGoalsDesc} />
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex flex-col gap-2">
        {rows.map(({ type, label, unit }) => {
          const goal = goalFor(type);
          const editing = editingType === type;
          return (
            <div key={type} className="dash-day">
              <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text)", fontWeight: 600 }}>{label}</span>
              {editing ? (
                <div className="flex items-center gap-2">
                  <NumberField
                    className="field"
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t.dashMeasureGoalPlaceholder}
                    style={{ width: 90 }}
                  />
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{unit}</span>
                  <button className="btn-icon" onClick={() => save(type)} disabled={busy} aria-label={t.save}>
                    <Check size={15} style={{ color: "var(--accent)" }} />
                  </button>
                  <button className="btn-icon" onClick={() => setEditingType(null)} aria-label={t.cancel} disabled={busy}>
                    <X size={15} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              ) : goal ? (
                <div className="flex items-center gap-3">
                  {(() => {
                    const p = measureGoalProgress(migrated, type, goal.target);
                    if (!p.hasData) return <span className="tabular" style={{ color: "var(--text)" }}>{p.target} {unit}</span>;
                    if (p.reached) return (
                      <span className="flex items-center gap-1" style={{ color: "var(--success)", fontWeight: 700 }}>
                        <Check size={13} /> {t.dashMeasureGoalReached}
                      </span>
                    );
                    return <span className="tabular" style={{ color: "var(--text)" }}>{p.current} / {p.target} {unit}</span>;
                  })()}
                  <button className="btn-icon" onClick={() => startEdit(type, goal.target)} aria-label={t.edit}>
                    <Pencil size={14} style={{ color: "var(--muted)" }} />
                  </button>
                  <button className="btn-icon" onClick={() => setPendingRemove(type)} aria-label={t.delete}>
                    <Trash2 size={14} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              ) : (
                <button className="chip chip-add" onClick={() => startEdit(type, null)} disabled={busy}>
                  {t.dashMeasureGoalDefine}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pendingRemove && (
        <ConfirmModal
          title={t.deleteMeasureGoalTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => remove(pendingRemove)}
        />
      )}
    </section>
  );
}
