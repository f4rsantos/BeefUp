import { useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "../context/AppContext";
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

  const selected = clients.find((c) => c.id === selectedId) || null;

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
              {clients.length === 0 && (
                <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>{t.dashNoClients}</p>
              )}
              {clients.map((c) => (
                <button
                  key={c.id}
                  className={`dash-list-item ${selectedId === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div style={{ fontWeight: 700, color: "var(--text)" }}>{c.name}</div>
                  {c.info && <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{c.info}</div>}
                </button>
              ))}
            </aside>

            {selected ? (
              <ClientDetail client={selected} onDeleted={() => setSelectedId(null)} />
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
