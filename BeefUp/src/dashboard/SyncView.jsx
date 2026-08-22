import { useState, useEffect } from "react";
import { LogIn, LogOut, Cloud, CloudOff } from "lucide-react";
import { useApp } from "../context/AppContext";
import { isConfigured, getSession, signIn, signUp, signOut, onAuthChange } from "../lib/auth";
import InviteCodes from "./InviteCodes";

export default function SyncView() {
  const { t } = useApp();
  const configured = isConfigured();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!configured);
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    getSession().then((s) => { if (!cancelled) { setSession(s); setReady(true); } });
    const unsubscribe = onAuthChange((s) => setSession(s));
    return () => { cancelled = true; unsubscribe?.(); };
  }, [configured]);

  async function submit() {
    setError(""); setBusy(true);
    try {
      const s = mode === "signIn" ? await signIn(email, password) : await signUp(email, password, name.trim());
      setSession(s);
      setPassword("");
    } catch (e) {
      setError(String(e?.message || e));
    }
    setBusy(false);
  }

  async function doSignOut() {
    setBusy(true);
    try {
      await signOut();
      setSession(null);
    } catch (e) {
      setError(String(e?.message || e));
    }
    setBusy(false);
  }

  if (!configured) {
    return (
      <div className="dash-sync">
        <div className="card mb-5" style={{ maxWidth: 720 }}>
          <h3 className="dash-card-title">{t.dashAccount}</h3>
          <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <CloudOff size={15} /> {t.dashSyncUnavailable}
          </p>
        </div>
      </div>
    );
  }

  if (!ready) return null;

  if (!session) {
    return (
      <div className="dash-sync">
        <div className="card mb-5" style={{ maxWidth: 420 }}>
          <h3 className="dash-card-title">{mode === "signIn" ? t.dashSignIn : t.dashSignUp}</h3>
          <div className="flex flex-col gap-3">
            {mode === "signUp" && (
              <div>
                <label className="section-title">{t.dashDisplayName}</label>
                <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            )}
            <div>
              <label className="section-title">{t.dashEmail}</label>
              <input className="field mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="section-title">{t.dashPassword}</label>
              <input
                className="field mt-1"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              />
            </div>
            <button className="btn btn-primary py-3 flex items-center justify-center gap-2" disabled={busy || !email || !password} onClick={submit}>
              <LogIn size={16} /> {mode === "signIn" ? t.dashSignIn : t.dashSignUp}
            </button>
            <button className="btn btn-ghost text-sm" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(""); }}>
              {mode === "signIn" ? t.dashNeedAccount : t.dashHaveAccount}
            </button>
          </div>
          {error && <p className="text-sm mt-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-sync" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
      <div className="card mb-5" style={{ maxWidth: 720 }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="dash-card-title" style={{ marginBottom: 4 }}>
              {session.user?.user_metadata?.display_name || session.user?.email}
            </h3>
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
              <Cloud size={15} /> {t.dashConnected}
            </p>
          </div>
          <button className="btn btn-ghost flex items-center gap-2" disabled={busy} onClick={doSignOut}>
            <LogOut size={15} /> {t.dashSignOut}
          </button>
        </div>
        {error && <p className="text-sm mt-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}
      </div>

      <InviteCodes />
    </div>
  );
}
