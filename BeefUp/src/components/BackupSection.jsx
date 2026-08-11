import { useRef, useState } from "react";
import { AlertTriangle, Check, Database, Download, Upload, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildWorkoutCsv, downloadFile, parseWorkoutCsv, workoutCsvFilename } from "../lib/csvData";
import { backupFilename, buildBackup, parseBackup, restoreBackup } from "../lib/backup";
import ConfirmModal from "./ConfirmModal";

const ICON_WRAPPER = { padding: 8, borderRadius: 10, background: "var(--surface2)", display: "flex" };

function DataRow({ Icon, label, desc, action, primary, busy, onClick }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div style={ICON_WRAPPER}>
          <Icon size={16} style={{ color: "var(--text)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{desc}</p>
        </div>
      </div>
      <button
        className={`btn ${primary ? "btn-primary" : "btn-ghost"} px-3 py-2 text-xs`}
        onClick={onClick}
        disabled={busy}
      >
        {action}
      </button>
    </div>
  );
}

// Export and import both ask "which kind?" with the same layout
function ChoiceModal({ title, question, options, onClose }) {
  const { t } = useApp();
  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>{title}</span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{question}</p>

        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <button
              key={option.label}
              className="card flex items-center gap-3"
              style={{ textAlign: "left" }}
              onClick={option.onSelect}
            >
              <option.Icon size={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{option.label}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{option.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BackupSection({ chooseLabel }) {
  const { t, lang, sessions, addSession } = useApp();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [choosingExport, setChoosingExport] = useState(false);
  const [choosingImport, setChoosingImport] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  const importMode = useRef("beefup"); // which source the picked file came from
  const csvInput = useRef(null);
  const jsonInput = useRef(null);

  function clearFeedback() {
    setStatus("");
    setError("");
  }

  async function exportFullBackup() {
    clearFeedback();
    setChoosingExport(false);
    setBusy(true);
    try {
      const backup = await buildBackup();
      downloadFile(JSON.stringify(backup), backupFilename(), "application/json");
    } catch {
      setError(t.importFailed);
    }
    setBusy(false);
  }

  function exportWorkoutCsv() {
    clearFeedback();
    setChoosingExport(false);
    downloadFile(buildWorkoutCsv(sessions, lang), workoutCsvFilename(), "text/csv");
  }

  function pickFileFor(mode) {
    clearFeedback();
    importMode.current = mode;
    setChoosingImport(false);
    if (mode === "json") jsonInput.current?.click();
    else csvInput.current?.click();
  }

  async function handlePickCsv(event) {
    const file = event.target.files?.[0];
    // Cleared so picking the same file twice in a row still fires onChange.
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    const result = parseWorkoutCsv(await file.text(), importMode.current);
    if (result.error) {
      setError(result.error === "notBeefUp" ? t.csvNotBeefUp : t.csvNoColumns);
      setBusy(false);
      return;
    }

    for (const session of result.sessions) await addSession(session);

    const done = t.importDone
      .replace("{w}", result.sessions.length)
      .replace("{s}", result.setCount);
    const unmatched = result.unmatchedNames.length
      ? ` ${t.unmatchedExercises.replace("{n}", result.unmatchedNames.length)}`
      : "";
    setStatus(done + unmatched);
    setBusy(false);
  }

  async function handlePickJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const backup = parseBackup(await file.text());
    if (!backup) {
      setError(t.importFailed);
      return;
    }
    setPendingRestore(backup);
  }

  async function confirmRestore() {
    const backup = pendingRestore;
    setPendingRestore(null);
    setBusy(true);
    try {
      await restoreBackup(backup);
      window.location.reload();
    } catch {
      setError(t.importFailed);
      setBusy(false);
    }
  }

  const exportOptions = [
    { Icon: Database, label: t.exportChoiceFull, desc: t.exportChoiceFullDesc, onSelect: exportFullBackup },
    { Icon: Download, label: t.exportCsv, desc: t.exportCsvDesc, onSelect: exportWorkoutCsv },
  ];
  const importOptions = [
    { Icon: Database, label: t.importSourceJson, desc: t.importSourceJsonDesc, onSelect: () => pickFileFor("json") },
    { Icon: Database, label: t.importSourceBeefUp, desc: t.importSourceBeefUpDesc, onSelect: () => pickFileFor("beefup") },
    { Icon: Upload, label: t.importSourceOther, desc: t.importSourceOtherDesc, onSelect: () => pickFileFor("generic") },
  ];

  return (
    <>
      <section>
        <p className="section-title mb-1">{t.dataSection}</p>
        <p className="text-xs" style={{ color: "var(--muted)", marginBottom: 6 }}>{t.dataSectionDesc}</p>
        <div className="card flex flex-col gap-4">
          <DataRow
            Icon={Download}
            label={t.exportData}
            desc={t.exportDataDesc}
            action={chooseLabel}
            primary
            busy={busy}
            onClick={() => setChoosingExport(true)}
          />
          <DataRow
            Icon={Upload}
            label={t.importCsv}
            desc={t.importCsvDesc}
            action={chooseLabel}
            busy={busy}
            onClick={() => setChoosingImport(true)}
          />
        </div>

        {status && (
          <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--success)" }}>
            <Check size={13} />
            {status}
          </p>
        )}
        {error && (
          <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: "var(--warn)" }}>
            <AlertTriangle size={13} />
            {error}
          </p>
        )}

        <input ref={csvInput} type="file" accept="text/csv,.csv" hidden onChange={handlePickCsv} />
        <input ref={jsonInput} type="file" accept="application/json,.json" hidden onChange={handlePickJson} />
      </section>

      {choosingExport && (
        <ChoiceModal
          title={t.exportData}
          question={t.exportChoiceQuestion}
          options={exportOptions}
          onClose={() => setChoosingExport(false)}
        />
      )}

      {choosingImport && (
        <ChoiceModal
          title={t.importCsv}
          question={t.importChoiceQuestion}
          options={importOptions}
          onClose={() => setChoosingImport(false)}
        />
      )}

      {pendingRestore && (
        <ConfirmModal
          title={t.importBackupTitle}
          message={t.importBackupWarn}
          cancelLabel={t.cancel}
          confirmLabel={t.restore}
          onCancel={() => setPendingRestore(null)}
          onConfirm={confirmRestore}
        />
      )}
    </>
  );
}
