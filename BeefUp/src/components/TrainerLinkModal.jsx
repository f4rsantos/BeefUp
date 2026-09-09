import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { signIn, signUp } from "../lib/auth";
import { redeemInvite, setScopes as applyScopes } from "../lib/sync/link";
import { getPref, setPref } from "../lib/prefs";
import { setSupabaseConfig, testConnection } from "../lib/supabaseConfig";

const STEPS = ["scopes", "connect", "account", "confirm", "done"];
const SCOPE_IDS = ["workouts", "nutrition", "measures"];

const CONNECT_REASON_KEYS = {
  "schema-missing": "trainerLinkConnectSchemaMissing",
  unreachable: "trainerLinkConnectUnreachable",
};
const INVALID_LINK_CODES = new Set(["bad-url", "not-https", "bad-host", "bad-key"]);

export default function TrainerLinkModal({ onClose, onLinked }) {
  const { t } = useApp();
  const [pendingInvite, setPendingInvite] = useState(undefined);
  const [step, setStep] = useState("scopes");
  const [mode, setMode] = useState("signup");
  const [scopes, setScopes] = useState(SCOPE_IDS.slice());
  const [scopesPending, setScopesPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultLink, setResultLink] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getPref("pendingTrainerInvite", null).then((inv) => {
      if (!cancelled) setPendingInvite(inv);
    });
    return () => { cancelled = true; };
  }, []);

  const stepIndex = STEPS.indexOf(step);
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 6;
  const hostname = (() => {
    try {
      return pendingInvite ? new URL(pendingInvite.url).hostname : "";
    } catch {
      return pendingInvite?.url || "";
    }
  })();

  function toggleScope(id) {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function dismiss() {
    setPref("pendingTrainerInvite", null);
    onClose();
  }

  async function handleConnect() {
    setSubmitting(true);
    setError("");
    try {
      const probe = await testConnection({ url: pendingInvite.url, anonKey: pendingInvite.anonKey });
      if (!probe.ok) {
        setError(t[CONNECT_REASON_KEYS[probe.reason]] || t.trainerLinkConnectUnknown);
        return;
      }
      await setSupabaseConfig({ url: pendingInvite.url, anonKey: pendingInvite.anonKey });
      setStep("account");
    } catch (e) {
      setError(INVALID_LINK_CODES.has(e.message) ? t.trainerLinkConnectInvalidLink : t.trainerLinkConnectUnknown);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccount() {
    if (!emailValid || !passwordValid) return;
    setSubmitting(true);
    setError("");
    try {
      if (mode === "signup") await signUp(email, password, email.split("@")[0]);
      else await signIn(email, password);
      setStep("confirm");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeem() {
    setSubmitting(true);
    setError("");
    try {
      const redeemed = await redeemInvite(pendingInvite.code);
      if (!redeemed) throw new Error("redeem failed");
      let finalLink = redeemed;
      // Redeeming shares nothing on its own, so a failure here means the
      // student is sharing less than they picked. Say so, never imply it worked.
      try {
        finalLink = await applyScopes(scopes);
        setScopesPending(false);
      } catch {
        setScopesPending(true);
      }
      setResultLink(finalLink);
      onLinked?.(finalLink);
      await setPref("pendingTrainerInvite", null);
      setStep("done");
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-center fade-in" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold" style={{ color: "var(--text)", fontSize: 18 }}>
            {t.trainerLinkButton}
          </span>
          <button className="btn btn-ghost p-2" onClick={dismiss} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        {pendingInvite && step !== "done" && (
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            {t.trainerLinkStep.replace("{n}", stepIndex + 1).replace("{total}", 4)}
          </p>
        )}

        {pendingInvite === null && (
          <p className="text-sm" style={{ color: "var(--muted)", marginTop: 8 }}>
            {t.trainerLinkNeedsInvite}
          </p>
        )}

        {pendingInvite && step === "scopes" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerLinkScopesExplain}</p>
            {SCOPE_IDS.map((id) => (
              <div key={id} className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{t[id]}</p>
                <button
                  role="switch"
                  aria-checked={scopes.includes(id)}
                  aria-label={t[id]}
                  className={`switch ${scopes.includes(id) ? "on" : ""}`}
                  onClick={() => toggleScope(id)}
                />
              </div>
            ))}
            <p className="text-xs" style={{ color: "var(--muted)" }}>{t.trainerScopesNote}</p>
          </div>
        )}

        {pendingInvite && step === "connect" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerLinkConnectExplain}</p>
            <div className="card card-flat" style={{ padding: 12, background: "var(--surface2)" }}>
              <SummaryRow label={t.trainerLinkConnectHostLabel} value={hostname} />
            </div>
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )}

        {pendingInvite && step === "account" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {mode === "signup" ? t.trainerLinkAccountExplain : t.trainerLinkSignInExplain}
            </p>
            <div>
              <label className="section-title">{t.trainerLinkEmailLabel}</label>
              <input
                type="email"
                className="field mt-1"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div>
              <label className="section-title">{t.trainerLinkPasswordLabel}</label>
              <input
                type="password"
                className="field mt-1"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
            <button
              type="button"
              className="btn btn-ghost text-xs"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
            >
              {mode === "signup" ? t.trainerLinkHaveAccount : t.trainerLinkNeedAccount}
            </button>
          </div>
        )}

        {pendingInvite && step === "confirm" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerLinkConfirmExplain}</p>
            <div className="card card-flat" style={{ padding: 12, background: "var(--surface2)" }}>
              <SummaryRow label={t.trainerLinkEmailLabel} value={email} />
              <SummaryRow
                label={t.trainerLinkScopesTitle}
                value={scopes.length ? scopes.map((s) => t[s]).join(", ") : t.trainerLinkScopesNone}
              />
            </div>
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )}

        {pendingInvite && step === "done" && resultLink && (
          <div className="flex flex-col items-center text-center gap-2" style={{ marginTop: 8 }}>
            <div
              style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "var(--grad-accent)",
              }}
            >
              <Check size={28} style={{ color: "#fff" }} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text)", fontSize: 17 }}>
              {t.trainerLinkSuccessTitle.replace("{name}", resultLink.trainerName || "")}
            </p>
            <p className="text-sm" style={{ color: scopesPending ? "var(--warn, #d97706)" : "var(--muted)" }}>
              {scopesPending ? t.trainerLinkScopesPending : t.trainerLinkSuccessDesc}
            </p>
          </div>
        )}

        <div className="flex gap-3" style={{ marginTop: 20 }}>
          {pendingInvite === null && (
            <button className="btn btn-primary flex-1" onClick={onClose}>{t.done}</button>
          )}
          {pendingInvite && step === "scopes" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={dismiss}>{t.cancel}</button>
              <button className="btn btn-primary flex-1" onClick={() => setStep("connect")}>
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {pendingInvite && step === "connect" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={() => setStep("scopes")} disabled={submitting}>
                {t.back}
              </button>
              <button className="btn btn-primary flex-1" disabled={submitting} onClick={handleConnect}>
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {pendingInvite && step === "account" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={() => setStep("connect")} disabled={submitting}>
                {t.back}
              </button>
              <button
                className="btn btn-primary flex-1"
                disabled={!emailValid || !passwordValid || submitting}
                onClick={handleAccount}
              >
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {pendingInvite && step === "confirm" && (
            <button className="btn btn-primary flex-1" disabled={submitting} onClick={handleRedeem}>
              {t.confirm}
            </button>
          )}
          {pendingInvite && step === "done" && (
            <button className="btn btn-primary flex-1" onClick={onClose}>{t.done}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ padding: "4px 0" }}>
      <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-medium truncate" style={{ color: "var(--text)", maxWidth: "60%" }}>
        {value}
      </span>
    </div>
  );
}
