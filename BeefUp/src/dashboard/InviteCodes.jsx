import { useEffect, useState } from "react";
import { Copy, RefreshCw, Trash2, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import ConfirmModal from "../components/ConfirmModal";
import { listInvites, createInvite, revokeInvite } from "../lib/trainerData";

function formatCode(code) {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

export default function InviteCodes() {
  const { t } = useApp();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [pendingRevoke, setPendingRevoke] = useState(null);

  async function load() {
    setLoading(true);
    try {
      setInvites(await listInvites());
    } catch (e) {
      setError(String(e?.message || e));
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    listInvites()
      .then((list) => { if (!cancelled) setInvites(list); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function generate() {
    setError(""); setBusy(true);
    try {
      await createInvite();
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    }
    setBusy(false);
  }

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 1500);
    } catch {
      // Clipboard access can be denied; the code is still visible on screen.
    }
  }

  async function revoke() {
    const code = pendingRevoke;
    setPendingRevoke(null);
    setBusy(true);
    try {
      await revokeInvite(code);
      await load();
    } catch (e) {
      setError(String(e?.message || e));
    }
    setBusy(false);
  }

  return (
    <div className="card mb-5" style={{ maxWidth: 720 }}>
      <h3 className="dash-card-title">{t.dashInvites}</h3>
      <p className="text-sm mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{t.dashInvitesDesc}</p>

      <button className="btn btn-primary flex items-center justify-center gap-2 px-6 py-3 mb-5" disabled={busy} onClick={generate}>
        <RefreshCw size={16} /> {t.dashNewInvite}
      </button>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>—</p>
      ) : invites.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>{t.dashNoInvites}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {invites.map((inv) => (
            <div key={inv.code} className="dash-day">
              <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, letterSpacing: 2, color: "var(--text)", flex: 1 }}>
                {formatCode(inv.code)}
              </span>
              <button className="btn-icon" onClick={() => copy(inv.code)} aria-label={t.dashCopyCode} title={t.dashCopyCode}>
                {copiedCode === inv.code ? <Check size={15} style={{ color: "var(--accent)" }} /> : <Copy size={15} style={{ color: "var(--muted)" }} />}
              </button>
              <button className="btn-icon" onClick={() => setPendingRevoke(inv.code)} aria-label={t.dashRevoke} title={t.dashRevoke}>
                <Trash2 size={15} style={{ color: "var(--muted)" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm mt-3" style={{ color: "var(--accent-2, orange)" }}>{error}</p>}

      {pendingRevoke && (
        <ConfirmModal
          title={t.dashRevokeInviteTitle}
          message={t.cannotUndo}
          cancelLabel={t.cancel}
          confirmLabel={t.dashRevoke}
          onCancel={() => setPendingRevoke(null)}
          onConfirm={revoke}
        />
      )}
    </div>
  );
}
