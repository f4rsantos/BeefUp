import { useState, useEffect } from "react";
import { LogIn, LogOut, Cloud, Pencil } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getSession, signIn, signUp, signOut, onAuthChange, setProfileRole, isTrainerTakenError } from "../lib/auth";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { getConfigSync } from "../lib/supabaseConfig";
import TrainerSetup from "../onboarding/TrainerSetup";
import InviteCodes from "./InviteCodes";

function hostOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url || "";
  }
}

export default function SyncView() {
  const { t } = useApp();
  const configured = useSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!configured);
  const [editingConfig, setEditingConfig] = useState(false);
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function refreshSession() {
    setReady(false);
    getSession().then((s) => { setSession(s); setReady(true); });
  }

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    function run() {
      setReady(false);
      getSession().then((s) => { if (!cancelled) { setSession(s); setReady(true); } });
    }
    run();
    const unsubscribe = onAuthChange((s) => setSession(s));
    return () => { cancelled = true; unsubscribe?.(); };
  }, [configured]);

  async function submit() {
    setError(""); setBusy(true);
    try {
      const s = mode === "signIn" ? await signIn(email, password) : await signUp(email, password, name.trim());
      if (s) await setProfileRole("trainer");
      setSession(s);
      setPassword("");
    } catch (e) {
      setError(isTrainerTakenError(e) ? t.trainerSetupTrainerTaken : String(e?.message || e));
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

  if (editingConfig) {
    return (
      <div className="dash-sync">
        <div className="dash-panel mb-5" style={{ maxWidth: 640 }}>
          <TrainerSetup
            onCancel={() => setEditingConfig(false)}
            onDone={() => { setEditingConfig(false); refreshSession(); }}
          />
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="dash-sync">
        <div className="dash-panel mb-5" style={{ maxWidth: 640 }}>
          <TrainerSetup />
        </div>
      </div>
    );
  }

  if (!ready) return null;

  const host = hostOf(getConfigSync()?.url);

  if (!session) {
    return (
      <div className="dash-sync">
        <div className="dash-panel mb-5" style={{ maxWidth: 420 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="dash-card-title">{mode === "signIn" ? t.dashSignIn : t.dashSignUp}</h3>
            <button className="btn btn-ghost text-xs flex items-center gap-1" onClick={() => setEditingConfig(true)}>
              <Pencil size={12} /> {host}
            </button>
          </div>
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
          {error && <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="dash-sync" style={{ justifyContent: "flex-start", paddingTop: 24 }}>
      <div className="dash-panel mb-5" style={{ maxWidth: 720 }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="dash-card-title">
              {session.user?.user_metadata?.display_name || session.user?.email}
            </h3>
            <p className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
              <Cloud size={15} /> {t.dashConnected}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-xs flex items-center gap-1" onClick={() => setEditingConfig(true)}>
              <Pencil size={12} /> {host}
            </button>
            <button className="btn btn-ghost flex items-center gap-2" disabled={busy} onClick={doSignOut}>
              <LogOut size={15} /> {t.dashSignOut}
            </button>
          </div>
        </div>
        {error && <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
      </div>

      <InviteCodes />
    </div>
  );
}
