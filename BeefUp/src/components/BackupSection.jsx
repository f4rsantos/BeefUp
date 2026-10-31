import { useRef, useState } from "react";
import { useEscapeKey } from "../lib/useEscapeKey";
import { AlertTriangle, Check, Database, Download, Upload, X } from "lucide-react";
import { useApp } from "../context/useApp";
import { buildWorkoutCsv, downloadFile, parseWorkoutCsv, workoutCsvFilename } from "../lib/csvData";
import { backupFilename, buildBackup, parseBackup, restoreBackup } from "../lib/backup";
import ConfirmModal from "./ConfirmModal";
import IconButton from "./ui/IconButton";
import { ListGroup, ListRow } from "./ui/List";
import GlassPanel from "./ui/GlassPanel";
import ActionTile from "./ui/ActionTile";

// Export and import both ask "which kind?" with the same layout
function ChoiceModal({ title, question, options, onClose }) {
  const { t } = useApp();
  useEscapeKey(onClose);
  return (
    <div role="dialog" aria-modal="true" className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>{title}</span>
          <IconButton icon={X} size="sm" label={t.cancel} onClick={onClose} />
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{question}</p>

        <ListGroup icons>
          {options.map((option) => (
            <ListRow
              key={option.label}
              icon={option.Icon}
              title={option.label}
              subtitle={option.desc}
              chevron
              onClick={option.onSelect}
            />
          ))}
        </ListGroup>
      </div>
    </div>
  );
}

export default function BackupSection({ extraActions = [] }) {
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
        <GlassPanel title={t.dataSection} footer={t.dataSectionDesc}>
          <div className="action-tiles">
            {extraActions.map((action) => (
              <ActionTile key={action.label} {...action} />
            ))}
            <ActionTile icon={Download} color="var(--fat)" label={t.exportData} disabled={busy} onClick={() => setChoosingExport(true)} />
            <ActionTile icon={Upload} color="var(--success)" label={t.importCsv} disabled={busy} onClick={() => setChoosingImport(true)} />
          </div>
        </GlassPanel>

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
