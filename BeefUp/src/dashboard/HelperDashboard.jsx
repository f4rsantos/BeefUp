import { useEffect, useMemo, useState } from "react";
import { Plus, Link as LinkIcon, User } from "lucide-react";
import { useApp } from "../context/AppContext";
import { isConfigured } from "../lib/supabaseClient";
import { listTrainerLinks } from "../lib/trainerData";
import CalendarView from "./CalendarView";
import ClientDetail from "./ClientDetail";
import CreateClientModal from "./CreateClientModal";
import SyncView from "./SyncView";
import "./dashboard.css";

export default function HelperDashboard() {
  const { t, clients } = useApp();
  const [tab, setTab] = useState("clients");
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [linkedClients, setLinkedClients] = useState([]);

  useEffect(() => {
    if (!isConfigured()) return;
    let cancelled = false;
    listTrainerLinks()
      .then((links) => {
        if (cancelled) return;
        setLinkedClients(links.map((l) => ({ id: l.clientId, linkedUserId: l.clientId, name: l.name, scopes: l.scopes })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allClients = useMemo(() => [...clients, ...linkedClients], [clients, linkedClients]);
  const selected = allClients.find((c) => c.id === selectedId) || null;

  return (
    <div className="dash-root">
      <header className="dash-header">
        <span className="dash-brand">BeefUp</span>
        <div className="dash-tabs">
          <button className={`dash-tab ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>{t.dashClients}</button>
          <button className={`dash-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>{t.dashCalendar}</button>
          <button className={`dash-tab ${tab === "sync" ? "active" : ""}`} onClick={() => setTab("sync")}>{t.dashSync}</button>
        </div>
        <div style={{ flex: 1 }} />
      </header>

      <div className="dash-body">
        {tab === "calendar" && <CalendarView />}
        {tab === "sync" && <SyncView />}

        {tab === "clients" && (
          <div className="dash-clients">
            <aside className="dash-list">
              <button className="btn btn-primary flex items-center justify-center gap-2" onClick={() => setCreating(true)}>
                <Plus size={16} /> {t.dashNewClient}
              </button>
              {allClients.length === 0 && (
                <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>{t.dashNoClients}</p>
              )}
              {allClients.map((c) => (
                <button
                  key={c.id}
                  className={`dash-list-item ${selectedId === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex items-center gap-2">
                    {c.linkedUserId ? <LinkIcon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} /> : <User size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />}
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
                  </div>
                  {c.linkedUserId ? (
                    <div className="text-xs" style={{ color: "var(--accent)" }}>{t.dashLinked}</div>
                  ) : c.info ? (
                    <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{c.info}</div>
                  ) : null}
                </button>
              ))}
            </aside>

            {selected ? (
              <ClientDetail key={selected.id} client={selected} onDeleted={() => setSelectedId(null)} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
                {t.dashSelectClient}
              </div>
            )}
          </div>
        )}
      </div>

      {creating && (
        <CreateClientModal onClose={() => setCreating(false)} onCreated={(c) => { setTab("clients"); setSelectedId(c.id); }} />
      )}
    </div>
  );
}
