import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Dumbbell, Moon, Lock } from "lucide-react";
import { normalizeWorkoutExercises, resolvedExerciseName } from "../lib/exerciseTree";
import ConfirmModal from "../components/ConfirmModal";
import WorkoutEditor from "../components/WorkoutEditor";
import { Empty, PanelHead } from "./parts";
import { prescribeRow, unprescribeRow } from "../lib/trainerData";
import { friendlyError } from "../lib/friendlyError";
import { isPrescribed, uid, todayISO, addPlanDay, updatePlanDay, removePlanDay } from "../lib/planUtils";
import { STORES } from "../lib/stores";

// Prescribed workouts as cards, the student's own below.
function WorkoutCard({ workout, mine, lang, t, busy, onEdit, onDelete }) {
  const items = normalizeWorkoutExercises(workout.exercises);
  return (
    <div className={`dash-workcard ${mine ? "is-mine" : ""}`}>
      <div className="dash-workcard-top">
        <div style={{ minWidth: 0 }}>
          <div className="dash-workcard-name truncate">{workout.name}</div>
          <div className="dash-workcard-count">{items.length} {t.exercises}</div>
        </div>
        {mine ? (
          <div className="dash-panel-actions">
            <button className="btn-icon" onClick={onEdit} aria-label={t.edit} title={t.edit} disabled={busy}>
              <Pencil size={15} style={{ color: "var(--muted)" }} />
            </button>
            <button className="btn-icon" onClick={onDelete} aria-label={t.delete} title={t.delete} disabled={busy}>
              <Trash2 size={15} style={{ color: "var(--muted)" }} />
            </button>
          </div>
        ) : (
          <Lock size={14} style={{ color: "var(--muted)", flexShrink: 0 }} aria-label={t.dashClientOwn} />
        )}
      </div>
      <ul className="dash-workcard-list">
        {items.slice(0, 3).map((it, i) => (
          <li key={i} className="truncate">{resolvedExerciseName(it.ref, lang)}</li>
        ))}
        {items.length > 3 && <li className="more tabular">+{items.length - 3}</li>}
      </ul>
    </div>
  );
}

export function LinkedWorkoutsList({ client, workouts: initialWorkouts, lang, t, onChanged }) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
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
        const next = [...prev.filter((w) => w.id !== saved.id), saved];
        onChanged?.(next);
        return next;
      });
      setEditing(null);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function remove(workout) {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.workouts, workout.id);
      setWorkouts((prev) => {
        const next = prev.filter((w) => w.id !== workout.id);
        onChanged?.(next);
        return next;
      });
      setPendingDelete(null);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  const mine = workouts.filter((w) => isPrescribed(w));
  const theirs = workouts.filter((w) => !isPrescribed(w));

  return (
    <section>
      <PanelHead title={t.workouts} desc={t.dashPrescribeDesc} />
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}

      <h4 className="dash-subhead"><span className="dash-subhead-label">{t.dashPrescribedByYou}</span> <span className="tabular">{mine.length}</span></h4>
      <div className="dash-cards">
        {mine.map((w) => (
          <WorkoutCard key={w.id} workout={w} mine lang={lang} t={t} busy={busy} onEdit={() => setEditing(w)} onDelete={() => setPendingDelete(w)} />
        ))}
        <button className="dash-workcard add" onClick={() => setEditing("new")} disabled={busy}>
          <Plus size={15} /> {t.dashPrescribeWorkout}
        </button>
      </div>

      {theirs.length > 0 && (
        <>
          <h4 className="dash-subhead"><span className="dash-subhead-label">{t.dashClientOwn}</span> <span className="tabular">{theirs.length}</span></h4>
          <div className="dash-cards">
            {theirs.map((w) => <WorkoutCard key={w.id} workout={w} lang={lang} t={t} />)}
          </div>
        </>
      )}

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
    </section>
  );
}

// Edits stay in a draft until "Guardar plano".
export function LinkedPlan({ client, plans: initialPlans, workouts, t, onDirtyChange }) {
  const [plans, setPlans] = useState(initialPlans);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");
  const [pendingUnprescribe, setPendingUnprescribe] = useState(false);

  const saved = plans.find((p) => isPrescribed(p)) || null;
  const plan = draft ?? saved;
  const dirty = draft !== null && (!saved || JSON.stringify(draft) !== JSON.stringify(saved));
  const canSave = dirty && draft.name.trim() !== "" && !busy;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  function edit(next) {
    setDraft(next);
    setJustSaved(false);
  }

  function createPlan() {
    edit({ id: uid(), name: "", startDate: todayISO(), days: [] });
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const row = await prescribeRow(client.linkedUserId, STORES.plans, { ...draft, name: draft.name.trim() });
      setPlans((prev) => [...prev.filter((p) => p.id !== row.id), row]);
      setDraft(null);
      setJustSaved(true);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function removePlan() {
    setBusy(true);
    setError("");
    try {
      await unprescribeRow(client.linkedUserId, STORES.plans, saved.id);
      setPlans((prev) => prev.filter((p) => p.id !== saved.id));
      setDraft(null);
      setPendingUnprescribe(false);
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  }

  const status = dirty ? t.dashPlanUnsaved : justSaved ? t.dashPlanSaved : "";

  function setType(i, type) {
    edit({ ...plan, days: updatePlanDay(plan.days, i, type === "workout" ? { type, workoutId: workouts[0]?.id ?? null } : { type, workoutId: null }) });
  }

  return (
    <section className="dash-plan">
      <header className="dash-plan-head">
        {plan ? (
          <input
            className="dash-plan-title"
            value={plan.name}
            onChange={(e) => edit({ ...plan, name: e.target.value })}
            placeholder={t.planName}
            aria-label={t.planName}
            maxLength={60}
          />
        ) : (
          <h3 className="dash-card-title">{t.editPlan}</h3>
        )}
        {plan && (
          <div className="dash-plan-actions">
            <span className={`dash-savebar-status ${dirty ? "unsaved" : ""}`} role="status">
              {dirty && <span className="dash-dot warn" />}
              {status}
            </span>
            {dirty && (
              <button className="btn btn-ghost" onClick={() => { setDraft(null); setJustSaved(false); }} disabled={busy}>
                {t.dashPlanDiscard}
              </button>
            )}
            <button className="btn btn-primary" onClick={save} disabled={!canSave}>
              {t.dashPlanSave}
            </button>
            {saved && (
              <button className="btn-icon" onClick={() => setPendingUnprescribe(true)} aria-label={t.delete} title={t.delete} disabled={busy}>
                <Trash2 size={15} style={{ color: "var(--muted)" }} />
              </button>
            )}
          </div>
        )}
      </header>
      <p className="dash-panel-desc dash-plan-desc">{t.dashPrescribePlanDesc}</p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--danger)" }}>{error}</p>}
      {plan && dirty && plan.name.trim() === "" && <p className="dash-empty mb-3">{t.dashPlanNameRequired}</p>}

      {!plan ? (
        <>
          <Empty>{t.dashNoPlan}</Empty>
          <button className="btn btn-ghost py-3 mt-3" style={{ borderStyle: "dashed" }} onClick={createPlan}>
            <Plus size={15} /> {t.dashPrescribePlan}
          </button>
        </>
      ) : (
        <div className="dash-days" role="list">
          {plan.days.map((day, i) => {
            const isWorkout = day.type === "workout";
            const Icon = isWorkout ? Dumbbell : Moon;
            return (
              <div key={day.id} className="dash-dayslot" role="listitem">
                <div className={`dash-daycard ${isWorkout ? "workout" : "rest"}`}>
                  <Icon className="dash-daycard-icon" size={72} strokeWidth={1.5} aria-hidden="true" />
                  <div className="dash-daycard-top">
                    <span className="dash-daycard-num tabular">{t.dashDayN.replace("{n}", i + 1)}</span>
                    <button
                      className="btn-icon"
                      onClick={() => edit({ ...plan, days: removePlanDay(plan.days, i) })}
                      aria-label={t.delete}
                      title={t.delete}
                    >
                      <Trash2 size={15} style={{ color: "var(--muted)" }} />
                    </button>
                  </div>
                  {isWorkout ? (
                    workouts.length > 0 ? (
                      <select
                        className="field"
                        aria-label={t.workouts}
                        value={day.workoutId ?? ""}
                        onChange={(e) => edit({ ...plan, days: updatePlanDay(plan.days, i, { workoutId: e.target.value }) })}
                      >
                        {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    ) : (
                      <span className="dash-daycard-rest">{t.newWorkout}</span>
                    )
                  ) : (
                    <span className="dash-daycard-rest">{t.dayRest}</span>
                  )}
                  <div className="dash-seg" role="group" aria-label={t.toggleDayType}>
                    <button type="button" className={isWorkout ? "on" : ""} aria-pressed={isWorkout} onClick={() => !isWorkout && setType(i, "workout")}>{t.workoutDay}</button>
                    <button type="button" className={isWorkout ? "" : "on"} aria-pressed={!isWorkout} onClick={() => isWorkout && setType(i, "rest")}>{t.dayRest}</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="dash-dayslot add">
            <div className="dash-daycard add">
              <button className="btn btn-ghost" onClick={() => edit({ ...plan, days: addPlanDay(plan.days, "workout", workouts) })}>
                <Plus size={15} /> {t.workoutDay}
              </button>
              <button className="btn btn-ghost" onClick={() => edit({ ...plan, days: addPlanDay(plan.days, "rest", workouts) })}>
                <Plus size={15} /> {t.dayRest}
              </button>
            </div>
          </div>
        </div>
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
