import { useState } from "react";
import { X, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import { signUp } from "../lib/auth";
import { redeemInvite, setScopes as applyScopes } from "../lib/sync/link";

const STEPS = ["code", "scopes", "account", "confirm", "done"];
const SCOPE_IDS = ["workouts", "nutrition", "measures"];

function sanitizeCode(raw) {
  return raw.toUpperCase().replace(/[\s-]/g, "").slice(0, 8);
}

export default function TrainerLinkModal({ onClose, onLinked }) {
  const { t } = useApp();
  const [step, setStep] = useState("code");
  const [code, setCode] = useState("");
  const [scopes, setScopes] = useState(SCOPE_IDS.slice());
  const [scopesPending, setScopesPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultLink, setResultLink] = useState(null);

  const stepIndex = STEPS.indexOf(step);
  const codeValid = code.length === 8;
  const emailValid = /\S+@\S+\.\S+/.test(email);
  const passwordValid = password.length >= 6;

  function toggleScope(id) {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function handleCreateAccount() {
    if (!emailValid || !passwordValid) return;
    setSubmitting(true);
    setError("");
    try {
      await signUp(email, password, email.split("@")[0]);
      setStep("confirm");
    } catch {
      setError(t.trainerLinkAccountFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeem() {
    setSubmitting(true);
    setError("");
    try {
      const redeemed = await redeemInvite(code);
      if (!redeemed) throw new Error("redeem failed");
      let finalLink = redeemed;
      try {
        finalLink = await applyScopes(scopes);
        setScopesPending(false);
      } catch {
        setScopesPending(true);
      }
      setResultLink(finalLink);
      onLinked?.(finalLink);
      setStep("done");
    } catch {
      setError(t.trainerLinkFailed);
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
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        {step !== "done" && (
          <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
            {t.trainerLinkStep.replace("{n}", stepIndex + 1).replace("{total}", 4)}
          </p>
        )}

        {step === "code" && (
          <div className="flex flex-col gap-2" style={{ marginTop: 8 }}>
            <label className="section-title">{t.trainerLinkCodeLabel}</label>
            <input
              className="field"
              style={{ fontSize: 20, letterSpacing: 4, textAlign: "center", fontWeight: 700 }}
              value={code}
              onChange={(e) => setCode(sanitizeCode(e.target.value))}
              placeholder={t.trainerLinkCodePlaceholder}
              maxLength={8}
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs" style={{ color: "var(--muted)" }}>{t.trainerLinkCodeHelp}</p>
            {code.length > 0 && !codeValid && (
              <p className="text-xs" style={{ color: "var(--danger)" }}>{t.trainerLinkCodeInvalid}</p>
            )}
          </div>
        )}

        {step === "scopes" && (
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

        {step === "account" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerLinkAccountExplain}</p>
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
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col gap-3" style={{ marginTop: 8 }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{t.trainerLinkConfirmExplain}</p>
            <div className="card card-flat" style={{ padding: 12, background: "var(--surface2)" }}>
              <SummaryRow label={t.trainerLinkCodeLabel} value={code} />
              <SummaryRow label={t.trainerLinkEmailLabel} value={email} />
              <SummaryRow
                label={t.trainerLinkScopesTitle}
                value={scopes.length ? scopes.map((s) => t[s]).join(", ") : t.trainerLinkScopesNone}
              />
            </div>
            {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>
        )}

        {step === "done" && resultLink && (
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
          {step === "code" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={onClose}>{t.cancel}</button>
              <button className="btn btn-primary flex-1" disabled={!codeValid} onClick={() => setStep("scopes")}>
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {step === "scopes" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={() => setStep("code")}>{t.back}</button>
              <button className="btn btn-primary flex-1" onClick={() => setStep("account")}>
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {step === "account" && (
            <>
              <button className="btn btn-ghost flex-1" onClick={() => setStep("scopes")} disabled={submitting}>
                {t.back}
              </button>
              <button
                className="btn btn-primary flex-1"
                disabled={!emailValid || !passwordValid || submitting}
                onClick={handleCreateAccount}
              >
                {t.trainerLinkNext}
              </button>
            </>
          )}
          {step === "confirm" && (
            <button className="btn btn-primary flex-1" disabled={submitting} onClick={handleRedeem}>
              {t.confirm}
            </button>
          )}
          {step === "done" && (
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
