import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { useApp } from "../context/useApp";
import { fetchSchemaRevision } from "../lib/trainerData";
import { loadSetupSql, needsSetupUpdate } from "../lib/setupSql";

export default function SchemaUpdateBanner() {
  const { t } = useApp();
  const [revision, setRevision] = useState(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setRevision(await fetchSchemaRevision());
    } catch {
      setRevision(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(check);
  }, [check]);

  async function copySql() {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(await loadSetupSql());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
    }
  }

  if (!needsSetupUpdate(revision)) return null;

  return (
    <div className="dash-schema-banner" role="status">
      <AlertTriangle size={18} className="dash-schema-banner-icon" aria-hidden="true" />
      <div className="dash-schema-banner-text">
        <p className="dash-schema-banner-title">{t.schemaUpdateTitle}</p>
        <p className="dash-schema-banner-body">{t.schemaUpdateBody}</p>
        {copyFailed && <p className="dash-schema-banner-error">{t.trainerSetupSqlCopyFailed}</p>}
      </div>
      <div className="dash-schema-banner-actions">
        <button className="btn btn-primary text-sm flex items-center gap-2" onClick={copySql}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {t.trainerSetupCopySql}
        </button>
        <a
          className="btn btn-ghost text-sm flex items-center gap-2"
          href="https://supabase.com/dashboard/project/_/sql/new"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={15} /> {t.trainerSetupSqlEditorLink}
        </a>
        <button className="btn btn-ghost text-sm flex items-center gap-2" disabled={checking} onClick={check}>
          <RefreshCw size={15} /> {t.schemaUpdateCheck}
        </button>
      </div>
    </div>
  );
}
