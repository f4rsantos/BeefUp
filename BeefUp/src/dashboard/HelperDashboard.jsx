import { useEffect, useState } from "react";
import { Plus, Link as LinkIcon, Search, Settings } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { listTrainerLinks } from "../lib/trainerData";
import { isDashDemo, DEMO_STUDENTS } from "./demoFixture";
import CalendarView from "./CalendarView";
import ClientDetail from "./ClientDetail";
import DashboardSettings from "./DashboardSettings";
import SyncView from "./SyncView";
import "./dashboard.css";

export default function HelperDashboard() {
  const { t } = useApp();
  const [tab, setTab] = useState("clients");
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState(() => (isDashDemo() ? DEMO_STUDENTS : []));
  const configured = useSupabaseConfigured();

  useEffect(() => {
    if (isDashDemo() || !configured) return;
    let cancelled = false;
    listTrainerLinks()
      .then((links) => {
        if (cancelled) return;
        setClients(links.map((l) => ({ id: l.clientId, linkedUserId: l.clientId, name: l.name, scopes: l.scopes })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [configured]);

  const selected = clients.find((c) => c.id === selectedId) || null;
  const shown = query.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : clients;

  return (
    <div className="dash-root">
      <header className="dash-header">
        <span className="dash-brand">BeefUp</span>
        <div className="dash-tabs">
          <button className={`dash-tab ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>{t.dashClients}</button>
          <button className={`dash-tab ${tab === "calendar" ? "active" : ""}`} onClick={() => setTab("calendar")}>{t.dashCalendar}</button>
        </div>
        <div style={{ flex: 1 }} />
        {/* Account lives here rather than as a third tab: it is a destination
            you visit rarely, not a peer of the two you work in daily. */}
        <button
          className={`dash-account ${tab === "sync" ? "active" : ""}`}
          onClick={() => setTab("sync")}
        >
          <span className={`dash-dot ${configured ? "on" : ""}`} />
          {configured ? t.dashConnected : t.dashAccount}
        </button>
        <button
          className={`dash-icon-tab ${tab === "settings" ? "active" : ""}`}
          onClick={() => setTab("settings")}
          aria-label={t.settingsTitle}
          title={t.settingsTitle}
        >
          <Settings size={17} />
        </button>
      </header>

      <div className="dash-body">
        {tab === "calendar" && <CalendarView students={clients} />}
        {tab === "sync" && <SyncView />}
        {tab === "settings" && <DashboardSettings />}

        {tab === "clients" && (
          <div className="dash-clients">
            <aside className="dash-list">
              <div className="dash-search">
                <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.dashSearchClients}
                  aria-label={t.dashSearchClients}
                />
              </div>
              <button className="btn btn-primary flex items-center justify-center gap-2 mb-2" onClick={() => setTab("sync")}>
                <Plus size={16} /> {t.dashInviteClient}
              </button>
              {clients.length === 0 && (
                <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>{t.dashNoClients}</p>
              )}
              {clients.length > 0 && shown.length === 0 && (
                <p className="text-sm text-center mt-4" style={{ color: "var(--muted)" }}>{t.noResults}</p>
              )}
              {shown.map((c) => (
                <button
                  key={c.id}
                  className={`dash-list-item ${selectedId === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex items-center gap-2">
                    <LinkIcon size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    <div style={{ fontWeight: "var(--d-w-em)", color: "var(--text)" }}>{c.name}</div>
                  </div>
                </button>
              ))}
            </aside>

            {selected ? (
              <ClientDetail key={selected.id} client={selected} onUnlinked={() => setSelectedId(null)} />
            ) : (
              <div style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
                {t.dashSelectClient}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
