import { useState } from "react";
import { UploadCloud, DownloadCloud, Check, AlertTriangle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getLS, setLS } from "../lib/crypto";
import { extractConfig, pushClients, pullClients } from "../lib/firebaseSync";

export default function SyncView() {
  const { t, clients, saveClient } = useApp();
  const [raw, setRaw] = useState(() => {
    const saved = getLS("firebaseConfig", null);
    return saved ? JSON.stringify(saved, null, 2) : "";
  });
  const [config, setConfig] = useState(() => getLS("firebaseConfig", null));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function saveConfig() {
    setError(""); setStatus("");
    try {
      const cfg = extractConfig(raw);
      setLS("firebaseConfig", cfg);
      setConfig(cfg);
      setRaw(JSON.stringify(cfg, null, 2));
      setStatus(t.dashConfigSaved);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function runSync(action) {
    setError(""); setStatus(""); setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(String(e?.message || e));
    }
    setBusy(false);
  }

  function push() {
    return runSync(async () => {
      await pushClients(config, clients);
      setStatus(`${t.dashPushed} (${clients.length})`);
    });
  }

  function pull() {
    return runSync(async () => {
      const remote = await pullClients(config);
      for (const c of remote) await saveClient(c);
      setStatus(`${t.dashPulled} (${remote.length})`);
    });
  }

  return (
    <div className="dash-sync">
      <div className="card mb-5" style={{ maxWidth: 720 }}>
        <h3 className="dash-card-title">{t.dashSyncSetup}</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.dashSyncDesc}</p>
        <textarea
          className="field"
          style={{ minHeight: 200, fontFamily: "monospace", fontSize: 13, lineHeight: 1.5, resize: "vertical" }}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  projectId: "...",\n  ...\n}'}
        />
        <button className="btn btn-primary mt-4 px-6 py-3" onClick={saveConfig}>{t.save}</button>
      </div>

      {config && (
        <div className="card mb-5" style={{ maxWidth: 720 }}>
          <h3 className="dash-card-title">{config.projectId}</h3>
          <div className="flex gap-3 mt-2">
            <button className="btn btn-primary flex-1 py-3 flex items-center justify-center gap-2" disabled={busy} onClick={push}>
              <UploadCloud size={16} /> {t.dashPush}
            </button>
            <button className="btn btn-ghost flex-1 py-3 flex items-center justify-center gap-2" disabled={busy} onClick={pull}>
              <DownloadCloud size={16} /> {t.dashPull}
            </button>
          </div>
        </div>
      )}

      {status && <p className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}><Check size={15} /> {status}</p>}
      {error && <p className="flex items-center gap-2 text-sm" style={{ color: "var(--accent-2, orange)" }}><AlertTriangle size={15} /> {error}</p>}
    </div>
  );
}
