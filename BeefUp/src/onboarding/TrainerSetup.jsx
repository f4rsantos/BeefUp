import { useRef, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useApp } from "../context/useApp";
import { validateConfig, testConnection, fetchAuthSettings, setSupabaseConfig, sanitizeUrlInput, sanitizeKeyInput } from "../lib/supabaseConfig";
import { resetSupabase } from "../lib/supabaseClient";

const STEPS = ["intro", "project", "sql", "auth", "credentials"];

// testConnection()'s two distinguishable reasons; validateConfig's four
// format codes fold into one generic message, same pattern as
// TrainerLinkModal.jsx's CONNECT_REASON_KEYS/INVALID_LINK_CODES.
const KNOWN_TEST_REASONS = new Set(["schema-missing", "unreachable"]);

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}

export default function TrainerSetup({ onDone, onCancel }) {
  const { t } = useApp();
  const [step, setStep] = useState("intro");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [errorReason, setErrorReason] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmEmailOn, setConfirmEmailOn] = useState(false);
  const sqlRef = useRef(null);

  const stepIndex = STEPS.indexOf(step);
  const canBack = stepIndex > 0 || !!onCancel;

  function back() {
    if (stepIndex > 0) { setStep(STEPS[stepIndex - 1]); return; }
    onCancel?.();
  }

  function next() {
    setErrorReason("");
    setStep(STEPS[stepIndex + 1]);
  }

  async function loadSql() {
    if (!sqlRef.current) {
      const mod = await import("../../supabase/setup.sql?raw");
      sqlRef.current = mod.default;
    }
    return sqlRef.current;
  }

  async function copySql() {
    try {
      const text = await loadSql();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErrorReason("sql-copy-failed");
    }
  }

  async function handleConnect(force = false) {
    setErrorReason("");
    setConfirmEmailOn(false);
    let validated;
    try {
      validated = validateConfig({ url: sanitizeUrlInput(url), anonKey: sanitizeKeyInput(anonKey) });
    } catch (e) {
      setErrorReason(e?.message === "secret-key" ? "secret-key" : "invalid");
      return;
    }
    setTesting(true);
    try {
      const probe = await testConnection(validated);
      if (!probe.ok) {
        setErrorReason(KNOWN_TEST_REASONS.has(probe.reason) ? probe.reason : "unknown");
        return;
      }
      if (!force && (await fetchAuthSettings(validated)).confirmEmail === true) {
        setConfirmEmailOn(true);
        return;
      }
      // Purges any session tied to a previously configured project first.
      await resetSupabase({ signOut: true });
      await setSupabaseConfig(validated);
      onDone?.();
    } catch {
      setErrorReason("unknown");
    } finally {
      setTesting(false);
    }
  }

  const host = hostOf(url);
  const canTest = url.trim().length > 0 && anonKey.trim().length > 0;
  const errorKey = {
    invalid: "trainerSetupInvalidConfig",
    "secret-key": "trainerSetupSecretKey",
    "schema-missing": "trainerSetupSchemaMissing",
    unreachable: "trainerSetupUnreachable",
    unknown: "trainerSetupTestUnknown",
    "sql-copy-failed": "trainerSetupSqlCopyFailed",
  }[errorReason];
  const error = errorKey ? t[errorKey] : "";

  return (
    <div className="flex flex-col gap-3">
      {step === "intro" && (
        <>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800 }}>{t.trainerSetupIntroTitle}</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.trainerSetupIntroBody}</p>
        </>
      )}

      {step === "project" && (
        <>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800 }}>{t.trainerSetupProjectTitle}</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.trainerSetupProjectBody}</p>
          <a
            className="btn btn-ghost flex items-center gap-2"
            style={{ alignSelf: "flex-start" }}
            href="https://supabase.com/dashboard/new"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} /> {t.trainerSetupProjectLink}
          </a>
        </>
      )}

      {step === "sql" && (
        <>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800 }}>{t.trainerSetupSqlTitle}</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.trainerSetupSqlBody}</p>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary flex items-center gap-2" onClick={copySql}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {t.trainerSetupCopySql}
            </button>
            <a
              className="btn btn-ghost flex items-center gap-2"
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} /> {t.trainerSetupSqlEditorLink}
            </a>
          </div>
        </>
      )}

      {step === "auth" && (
        <>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800 }}>{t.trainerSetupAuthTitle}</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.trainerSetupAuthBody}</p>
          <ol className="text-sm" style={{ color: "var(--text)", lineHeight: 1.7, paddingLeft: 20, listStyle: "decimal" }}>
            <li>{t.trainerSetupAuthStep1}</li>
            <li>{t.trainerSetupAuthStep2}</li>
            <li>{t.trainerSetupAuthStep3}</li>
          </ol>
          <a
            className="btn btn-ghost flex items-center gap-2"
            style={{ alignSelf: "flex-start" }}
            href="https://supabase.com/dashboard/project/_/auth/providers"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} /> {t.trainerSetupAuthLink}
          </a>
        </>
      )}

      {step === "credentials" && (
        <>
          <h2 style={{ color: "var(--text)", fontSize: 20, fontWeight: 800 }}>{t.trainerSetupCredentialsTitle}</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.trainerSetupCredentialsBody}</p>
          <div>
            <label className="section-title">{t.trainerSetupUrlLabel}</label>
            <input
              className="field mt-1"
              value={url}
              placeholder="https://xyzcompany.supabase.co"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setUrl(sanitizeUrlInput(url))}
              onPaste={(e) => { e.preventDefault(); setUrl(sanitizeUrlInput(e.clipboardData.getData("text"))); }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)", lineHeight: 1.5 }}>{t.trainerSetupUrlHelp}</p>
          </div>
          <div>
            <label className="section-title">{t.trainerSetupKeyLabel}</label>
            <input
              className="field mt-1"
              value={anonKey}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setAnonKey(e.target.value)}
              onBlur={() => setAnonKey(sanitizeKeyInput(anonKey))}
              onPaste={(e) => { e.preventDefault(); setAnonKey(sanitizeKeyInput(e.clipboardData.getData("text"))); }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)", lineHeight: 1.5 }}>{t.trainerSetupKeyHelp}</p>
          </div>
          {host && (
            <div className="card card-flat" style={{ padding: 12, background: "var(--surface2)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs" style={{ color: "var(--muted)" }}>{t.trainerLinkConnectHostLabel}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{host}</span>
              </div>
            </div>
          )}
          {confirmEmailOn && (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "var(--danger)" }}>{t.trainerSetupConfirmEmailOn}</p>
              <button className="btn btn-ghost text-xs" style={{ alignSelf: "flex-start" }} disabled={testing} onClick={() => handleConnect(true)}>
                {t.trainerSetupConnectAnyway}
              </button>
            </div>
          )}
          {error && (
            <div className="flex flex-col gap-2">
              <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
              {errorReason === "schema-missing" && (
                <button className="btn btn-ghost text-xs flex items-center gap-2" style={{ alignSelf: "flex-start" }} onClick={copySql}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {t.trainerSetupCopySql}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3" style={{ marginTop: 8 }}>
        {canBack && (
          <button className="btn btn-ghost flex-1" disabled={testing} onClick={back}>{t.back}</button>
        )}
        {step !== "credentials" ? (
          <button className="btn btn-primary flex-1" onClick={next}>{t.obNext}</button>
        ) : (
          <button className="btn btn-primary flex-1" disabled={!canTest || testing} onClick={() => handleConnect()}>
            {testing ? "…" : t.trainerSetupConnectButton}
          </button>
        )}
      </div>
    </div>
  );
}
