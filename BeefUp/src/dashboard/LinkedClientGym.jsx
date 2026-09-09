import { useState } from "react";
import { Plus, Pencil, Trash2, Lock, Dumbbell, Moon } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import WorkoutEditor from "../components/WorkoutEditor";
import { prescribeRow, unprescribeRow } from "../lib/trainerData";
import { isPrescribed, uid, todayISO, addPlanDay, updatePlanDay, removePlanDay } from "../lib/planUtils";
import { STORES } from "../lib/stores";

export default function LinkedClientGym({ client, data, lang, t, onChanged }) {
  const [workouts, setWorkouts] = useState(() => data.workouts || []);
  const [plans, setPlans] = useState(() => data.plans || []);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(workout) {
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.workouts, workout);
      setWorkouts((prev) => {
        const without = prev.filter((w) => w.id !== saved.id);
        return [...without, saved];
      });
      setEditing(null);
      onChanged?.();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(workout) {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.workouts, workout.id);
      setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
      setPendingDelete(null);
      onChanged?.();
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dash-two">
      <LinkedPlan
        client={client}
        plans={plans}
        setPlans={setPlans}
        workouts={workouts}
        t={t}
      />

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="dash-card-title" style={{ margin: 0 }}>{t.workouts}</h3>
        </div>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{t.dashPrescribeDesc}</p>
        {error && <p className="text-sm mb-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}

        {workouts.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoWorkouts}</p>
        )}

        <div className="flex flex-col gap-3">
          {workouts.map((w) => {
            const mine = isPrescribed(w);
            return (
              <div key={w.id} className="dash-day">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "var(--text)", fontWeight: 600 }}>{w.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {w.exercises?.length ?? 0} {t.exercises}
                    {mine ? <> · {t.dashPrescribedByYou}</> : <> · {t.dashClientOwn}</>}
                  </div>
                </div>
                {mine ? (
                  <>
                    <button className="btn-icon" onClick={() => setEditing(w)} aria-label={t.edit} disabled={busy}>
                      <Pencil size={15} style={{ color: "var(--muted)" }} />
                    </button>
                    <button className="btn-icon" onClick={() => setPendingDelete(w)} aria-label={t.delete} disabled={busy}>
                      <Trash2 size={15} style={{ color: "var(--muted)" }} />
                    </button>
                  </>
                ) : (
                  <Lock size={15} style={{ color: "var(--muted)" }} aria-label={t.dashClientOwn} />
                )}
              </div>
            );
          })}
        </div>

        <button
          className="btn btn-ghost w-full py-3 mt-4"
          style={{ borderStyle: "dashed" }}
          onClick={() => setEditing("new")}
          disabled={busy}
        >
          <Plus size={15} /> {t.dashPrescribeWorkout}
        </button>
      </section>

      {editing && (
        <div style={{ position: "absolute", inset: 0, zIndex: 200, background: "var(--bg)" }}>
          <WorkoutEditor
            workout={editing === "new" ? null : editing}
            lang={lang}
            t={t}
            onSave={save}
            onBack={() => setEditing(null)}
          />
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t.dashUnprescribeTitle.replace("{name}", pendingDelete.name)}
          message={t.dashUnprescribeMessage}
          confirmLabel={t.delete}
          cancelLabel={t.cancel}
          onConfirm={() => remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// The one plan this trainer prescribes for a linked client, mirroring
// ClientGym.jsx's own plan editor but synced via prescribeRow/unprescribeRow
// instead of saveClient. A client-authored plan (no prescribedBy) is theirs
// alone and never shown or touched here.
function LinkedPlan({ client, plans, setPlans, workouts, t }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingRemoveDay, setPendingRemoveDay] = useState(null);
  const [pendingUnprescribe, setPendingUnprescribe] = useState(false);

  const plan = plans.find((p) => isPrescribed(p)) || null;

  async function persist(next) {
    setBusy(true);
    setError("");
    try {
      const saved = await prescribeRow(client.linkedUserId, STORES.plans, next);
      setPlans((prev) => [...prev.filter((p) => p.id !== saved.id), saved]);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function createPlan() {
    persist({ id: uid(), name: "", startDate: todayISO(), days: [] });
  }

  function addDay(type) {
    persist({ ...plan, days: addPlanDay(plan.days, type, workouts) });
  }

  function updateDay(i, dpatch) {
    persist({ ...plan, days: updatePlanDay(plan.days, i, dpatch) });
  }

  function removeDay(i) {
    persist({ ...plan, days: removePlanDay(plan.days, i) });
  }

  async function removePlan() {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.plans, plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      setPendingUnprescribe(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="dash-card-title" style={{ margin: 0 }}>{t.editPlan}</h3>
        {plan && (
          <button className="btn-icon" onClick={() => setPendingUnprescribe(true)} aria-label={t.delete} disabled={busy}>
            <Trash2 size={15} style={{ color: "var(--muted)" }} />
          </button>
        )}
      </div>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{t.dashPrescribePlanDesc}</p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}

      {!plan ? (
        <>
          <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{t.dashNoPlan}</p>
          <button className="btn btn-ghost w-full py-3" style={{ borderStyle: "dashed" }} onClick={createPlan} disabled={busy}>
            <Plus size={15} /> {t.dashPrescribePlan}
          </button>
        </>
      ) : (
        <>
          <label className="section-title">{t.planName}</label>
          <input
            className="field mt-2 mb-5"
            value={plan.name}
            onChange={(e) => persist({ ...plan, name: e.target.value })}
            placeholder="PPL"
            disabled={busy}
          />

          <div className="flex flex-col gap-3">
            {plan.days.map((day, i) => {
              const isWorkout = day.type === "workout";
              return (
                <div key={day.id} className="dash-day">
                  <span className="dash-day-num">{i + 1}</span>
                  <button
                    className="btn-icon"
                    onClick={() => updateDay(i, { type: isWorkout ? "rest" : "workout", workoutId: !isWorkout ? (workouts[0]?.id ?? null) : null })}
                    aria-label={t.toggleDayType}
                    disabled={busy}
                  >
                    {isWorkout ? <Dumbbell size={16} style={{ color: "var(--accent)" }} /> : <Moon size={16} style={{ color: "var(--accent-2)" }} />}
                  </button>
                  {isWorkout ? (
                    workouts.length > 0 ? (
                      <select className="field flex-1" value={day.workoutId ?? ""} onChange={(e) => updateDay(i, { workoutId: e.target.value })} disabled={busy}>
                        {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>{t.newWorkout} →</span>
                    )
                  ) : (
                    <span className="text-sm flex-1" style={{ color: "var(--muted)" }}>{t.dayRest}</span>
                  )}
                  <button className="btn-icon" onClick={() => setPendingRemoveDay(i)} aria-label={t.delete} disabled={busy}>
                    <Trash2 size={15} style={{ color: "var(--muted)" }} />
                  </button>
                </div>
              );
            })}
            {plan.days.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashUnassigned}</p>}
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn btn-ghost flex-1 py-3" style={{ borderStyle: "dashed" }} onClick={() => addDay("workout")} disabled={busy}><Plus size={15} /> {t.workoutDay}</button>
            <button className="btn btn-ghost flex-1 py-3" style={{ borderStyle: "dashed" }} onClick={() => addDay("rest")} disabled={busy}><Plus size={15} /> {t.dayRest}</button>
          </div>
        </>
      )}

      {pendingRemoveDay !== null && (
        <ConfirmModal
          title={t.deletePlanDayTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingRemoveDay(null)}
          onConfirm={() => {
            removeDay(pendingRemoveDay);
            setPendingRemoveDay(null);
          }}
        />
      )}

      {pendingUnprescribe && (
        <ConfirmModal
          title={t.dashUnprescribePlanTitle}
          message={t.dashUnprescribePlanMessage}
          cancelLabel={t.cancel}
          confirmLabel={t.delete}
          onCancel={() => setPendingUnprescribe(false)}
          onConfirm={removePlan}
        />
      )}
    </section>
  );
}
