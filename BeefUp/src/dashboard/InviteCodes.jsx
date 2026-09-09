import { useEffect, useState } from "react";
import { Copy, RefreshCw, Trash2, Check } from "lucide-react";
import { useApp } from "../context/AppContext";
import ConfirmModal from "../components/ConfirmModal";
import { listInvites, createInvite, revokeInvite } from "../lib/trainerData";
import { encodeTrainerInvite } from "../lib/trainerInvite";
import { getConfigSync } from "../lib/supabaseConfig";

function formatCode(code) {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

// The link carries this project's config, so a link opened elsewhere knows where to sync.
function buildInviteLink(code) {
  const config = getConfigSync();
  if (!config) return null;
  const payload = encodeTrainerInvite({ url: config.url, anonKey: config.anonKey, code });
  return `${window.location.origin}${window.location.pathname}?t=${payload}`;
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

  async function copyLink(code) {
    const link = buildInviteLink(code);
    if (!link) {
      setError(t.dashInviteLinkUnavailable);
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
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
            <div key={inv.code} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* The link is what the client needs; a bare code cannot reach this project. */}
              <div
                style={{
                  fontFamily: "monospace", fontSize: 12, color: "var(--muted)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  background: "var(--bg)", borderRadius: 8, padding: "8px 10px",
                }}
                title={buildInviteLink(inv.code) || ""}
              >
                {buildInviteLink(inv.code) || t.dashInviteLinkUnavailable}
              </div>

              <div className="flex items-center" style={{ gap: 10 }}>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  style={{ padding: "8px 14px" }}
                  onClick={() => copyLink(inv.code)}
                  aria-label={t.dashCopyInviteLink}
                >
                  {copiedCode === inv.code ? <Check size={15} /> : <Copy size={15} />}
                  {copiedCode === inv.code ? t.dashCopied : t.dashCopyLink}
                </button>

                <span className="text-xs" style={{ color: "var(--muted)", flex: 1 }}>
                  {t.dashInviteCodeLabel}{" "}
                  <span style={{ fontFamily: "monospace", letterSpacing: 1, color: "var(--text)" }}>{formatCode(inv.code)}</span>
                </span>

                <button className="btn-icon" onClick={() => setPendingRevoke(inv.code)} aria-label={t.dashRevoke} title={t.dashRevoke}>
                  <Trash2 size={15} style={{ color: "var(--muted)" }} />
                </button>
              </div>
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
