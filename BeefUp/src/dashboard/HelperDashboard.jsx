import { useEffect, useMemo, useState } from "react";
import { Settings, Users, Calendar, ArrowLeftRight, ChevronLeft } from "lucide-react";
import { useApp } from "../context/useApp";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { useIsDesktop } from "../lib/useIsDesktop";
import { listTrainerLinks } from "../lib/trainerData";
import { isDashDemo, DEMO_STUDENTS } from "./demoFixture";
import CalendarView from "./CalendarView";
import ClientDetail from "./ClientDetail";
import DashboardSettings from "./DashboardSettings";
import SyncView from "./SyncView";
import SchemaUpdateBanner from "./SchemaUpdateBanner";
import BrandNotice from "./BrandNotice";
import BrandMark from "../components/BrandMark";
import StudentHome from "./StudentHome";
import TabBar from "../components/ui/TabBar";
import Segmented from "../components/ui/Segmented";
import IconButton from "../components/ui/IconButton";
import LargeTitle from "../components/ui/LargeTitle";
import "./dashboard.css";

export default function HelperDashboard() {
  const { t, clients: annotations } = useApp();
  const [tab, setTab] = useState("clients");
  const [selectedId, setSelectedId] = useState(null);
  const [clientNav, setClientNav] = useState({ section: "overview", gym: "plan", nutrition: "goals", measures: "log" });
  const [roster, setRoster] = useState(() => (isDashDemo() ? DEMO_STUDENTS : []));
  const configured = useSupabaseConfigured();
  const isDesktop = useIsDesktop();
  const [status, setStatus] = useState("loading");
  const [reloadKey, setReloadKey] = useState(0);
  const remote = configured && !isDashDemo();
  const loading = remote && status === "loading";
  const failed = remote && status === "error";
  // The trainer's private nickname wins everywhere below this line.
  const clients = useMemo(() => roster.map((c) => {
    const alias = annotations.find((a) => a.id === c.id)?.alias;
    return alias ? { ...c, name: alias, realName: c.name } : c;
  }), [roster, annotations]);

  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    listTrainerLinks()
      .then((links) => {
        if (cancelled) return;
        setRoster(links.map((l) => ({ id: l.clientId, linkedUserId: l.clientId, name: l.name, scopes: l.scopes })));
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn("Failed to load students:", e);
        setStatus("error");
      });
    return () => { cancelled = true; };
  }, [remote, reloadKey, tab]);

  // Sharing can change while the dashboard stays open.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setReloadKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function retry() {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }

  const selected = clients.find((c) => c.id === selectedId) || null;

  // The four destinations. On desktop they split between the header's tabs and
  // its right cluster; on a phone they are one bottom bar, thumb-reachable.
  const destinations = [
    { id: "clients", Icon: Users, label: t.dashClients },
    { id: "calendar", Icon: Calendar, label: t.dashCalendar },
    { id: "sync", Icon: ArrowLeftRight, label: t.dashAccount },
    { id: "settings", Icon: Settings, label: t.settingsTitle },
  ];
  const current = destinations.find((d) => d.id === tab) || destinations[0];

  function go(id) {
    setTab(id);
    if (id === "clients") setSelectedId(null);
  }

  const tabs = destinations.map(({ id, Icon, label }) => ({ id, Icon, label }));

  return (
    <div className={`dash-root app-shell ${isDesktop ? "" : "has-dock"}`}>
      <div className="dash-top">
      <header className="dash-header">
        {isDesktop ? (
          <>
            <BrandMark fallback="BeefUp" className="dash-brand" />
            <div className="dash-tabs">
              <Segmented
                options={[
                  { id: "clients", label: t.dashClients },
                  { id: "calendar", label: t.dashCalendar },
                ]}
                value={tab === "calendar" ? "calendar" : tab === "clients" ? "clients" : null}
                onChange={go}
                label={t.dashSections}
              />
            </div>
            <div style={{ flex: 1 }} />
            {/* Account lives here rather than as a third tab: it is a destination
                you visit rarely, not a peer of the two you work in daily. */}
            <button
              className={`btn dash-account ${tab === "sync" ? "active" : ""}`}
              onClick={() => setTab("sync")}
            >
              <span className={`dash-dot ${configured ? "on" : ""}`} />
              {configured ? t.dashConnected : t.dashAccount}
            </button>
            <IconButton
              icon={Settings}
              label={t.settingsTitle}
              variant={tab === "settings" ? "tint" : ""}
              onClick={() => setTab("settings")}
            />
          </>
        ) : tab === "clients" && selected ? (
          <button type="button" className="nav-back" onClick={() => setSelectedId(null)} aria-label={t.dashClients} title={t.dashClients}>
            <ChevronLeft size={24} strokeWidth={2.4} style={{ marginLeft: -2 }} />
          </button>
        ) : (
          <LargeTitle title={current.label} />
        )}
      </header>
      {remote && <SchemaUpdateBanner />}
      {remote && tab !== "settings" && <BrandNotice onOpen={() => setTab("settings")} />}
      </div>

      <div className="dash-body">
        {tab === "calendar" && <CalendarView students={clients} />}
        {tab === "sync" && <SyncView />}
        {tab === "settings" && <DashboardSettings />}

        {tab === "clients" && (selected ? (
          <ClientDetail
            key={selected.id}
            client={selected}
            students={clients}
            onSwitch={setSelectedId}
            nav={clientNav}
            onNav={(patch) => setClientNav((n) => ({ ...n, ...patch }))}
            onUnlinked={() => { setSelectedId(null); setReloadKey((k) => k + 1); }}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <StudentHome
            students={clients}
            loading={loading}
            failed={failed}
            onRetry={retry}
            onOpen={setSelectedId}
            onInvite={() => setTab("sync")}
          />
        ))}
      </div>

      {!isDesktop && (
        <div className="tab-dock">
          <div className="tab-dock-row">
            <TabBar tabs={tabs} active={tab} onSelect={go} label={t.dashSections} />
          </div>
        </div>
      )}
    </div>
  );
}
