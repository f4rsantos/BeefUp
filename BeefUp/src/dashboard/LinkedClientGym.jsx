import { useState } from "react";
import { Plus, Pencil, Trash2, Lock } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";
import { WorkoutDefEditor } from "./ClientGym";
import { prescribeRow, unprescribeRow } from "../lib/trainerData";
import { isPrescribed, uid } from "../lib/planUtils";
import { STORES } from "../lib/stores";

export default function LinkedClientGym({ client, data, lang, t, onChanged }) {
  const [workouts, setWorkouts] = useState(() => data.workouts || []);
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
    <div className="flex flex-col gap-3">
      <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashPrescribeDesc}</p>
      {error && <p className="text-sm" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}

      {workouts.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoWorkouts}</p>
      )}

      {workouts.map((w) => {
        const mine = isPrescribed(w);
        return (
          <div key={w.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{w.name}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                {w.exercises?.length ?? 0} {t.exercises}
                {mine ? <> · {t.dashPrescribedByYou}</> : <> · {t.dashClientOwn}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {mine ? (
                <>
                  <button className="btn btn-ghost p-1.5" onClick={() => setEditing(w)} aria-label={t.edit} disabled={busy}>
                    <Pencil size={14} style={{ color: "var(--muted)" }} />
                  </button>
                  <button className="btn btn-ghost p-1.5" onClick={() => setPendingDelete(w)} aria-label={t.delete} disabled={busy}>
                    <Trash2 size={14} style={{ color: "var(--muted)" }} />
                  </button>
                </>
              ) : (
                <Lock size={14} style={{ color: "var(--muted)" }} aria-label={t.dashClientOwn} />
              )}
            </div>
          </div>
        );
      })}

      <button
        className="btn btn-ghost w-full py-3.5 text-sm flex items-center justify-center gap-2"
        onClick={() => setEditing({ id: uid(), name: "", exercises: [] })}
        disabled={busy}
      >
        <Plus size={16} /> {t.dashPrescribeWorkout}
      </button>

      {editing && (
        <WorkoutDefEditor
          workout={editing}
          lang={lang}
          t={t}
          onSave={save}
          onClose={() => setEditing(null)}
        />
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
