import { AppProvider, useApp } from "./context/AppContext";
import WorkoutPage from "./pages/WorkoutPage";
import ActiveWorkout from "./pages/ActiveWorkout";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import StatisticsPage from "./pages/StatisticsPage";
import MeasuresPage from "./pages/MeasuresPage";
import SettingsPage from "./pages/SettingsPage";
import WorkoutPicker from "./pages/WorkoutPicker";
import PlanSettings from "./pages/PlanSettings";
import NutritionPage from "./pages/NutritionPage";
import Onboarding from "./onboarding/Onboarding";
import HelperDashboard from "./dashboard/HelperDashboard";
import { useState, useEffect } from "react";
import { Dumbbell, Apple, TrendingUp, Settings, Play } from "lucide-react";
import { todaysPlanEntry } from "./lib/planUtils";

const TABS = [
  { id: "home", Icon: Dumbbell, labelPt: "Treino", labelEn: "Workout" },
  { id: "nutrition", Icon: Apple, labelPt: "Nutrição", labelEn: "Nutrition" },
  { id: "progress", Icon: TrendingUp, labelPt: "Progresso", labelEn: "Progress" },
  { id: "settings", Icon: Settings, labelPt: "Definições", labelEn: "Settings" },
];

function AppInner() {
  const [tab, setTab] = useState("home");
  const [overlay, setOverlay] = useState(null);
  const { setActiveWorkout, lang, plans, activePlanId, workouts, sessions, onboarded, focus, appMode, t } = useApp();
  const isDesktop = useIsDesktop();

  if (!onboarded) return <Onboarding />;

  if (appMode === "helper") {
    if (isDesktop) return <HelperDashboard />;
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32, textAlign: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)", maxWidth: 320 }}>{t.obDesktopOnly}</p>
      </div>
    );
  }

  const showGym = focus !== "nutrition";
  const showNutrition = focus !== "gym";
  let tab2 = tab;
  if (tab === "nutrition" && !showNutrition) tab2 = "home";
  if (tab === "home" && !showGym) tab2 = "nutrition";

  function goActive(workoutInfo) {
    setActiveWorkout(workoutInfo);
    setOverlay("active");
  }

  function endWorkout() {
    setActiveWorkout(null);
    setOverlay(null);
  }

  function closeOverlay() {
    setOverlay(null);
  }

  // Start FAB: jump straight into today's scheduled workout if there is one,
  // otherwise open the workout picker.
  function handleStart() {
    const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
    const entry = todaysPlanEntry(activePlan, sessions);
    if (entry?.type === "workout") {
      const w = workouts.find((x) => x.id === entry.workoutId);
      if (w) {
        goActive({
          workoutId: w.id,
          workoutName: lang === "pt" ? w.namePt || w.name : w.name,
        });
        return;
      }
    }
    setOverlay("pickWorkout");
  }

  const showNav = overlay === null;

  return (
    <div
      style={{
        height: "100%",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {overlay === null && tab2 === "home" && showGym && (
          <WorkoutPage
            onStartWorkout={goActive}
            onPickWorkout={() => setOverlay("pickWorkout")}
            onManageWorkouts={() => setOverlay("planSettings")}
            onViewHistory={() => setOverlay("history")}
          />
        )}
        {overlay === null && tab2 === "nutrition" && showNutrition && <NutritionPage />}
        {overlay === null && tab2 === "progress" && (
          <ProfilePage
            onOpenStatistics={() => setOverlay("statistics")}
            onOpenMeasures={() => setOverlay("measures")}
            onViewHistory={() => setOverlay("history")}
          />
        )}
        {overlay === null && tab2 === "settings" && <SettingsPage />}

        {/* Overlays (full-screen, cover nav) */}
        {overlay === "active" && <ActiveWorkout onEnd={endWorkout} />}
        {overlay === "history" && <HistoryPage onBack={closeOverlay} />}
        {overlay === "pickWorkout" && (
          <WorkoutPicker
            onSelect={(w) =>
              goActive({
                workoutId: w.id,
                workoutName: lang === "pt" ? w.namePt || w.name : w.name,
              })
            }
            onBack={closeOverlay}
          />
        )}
        {overlay === "planSettings" && <PlanSettings onBack={closeOverlay} />}
        {overlay === "statistics" && <StatisticsPage onBack={closeOverlay} />}
        {overlay === "measures" && <MeasuresPage onBack={closeOverlay} />}
      </div>

      {/* Bottom nav — hidden during overlays */}
      {showNav && (
        <nav className="bottom-nav">
          {TABS.slice(0, 2)
            .filter(({ id }) => (id === "home" ? showGym : id === "nutrition" ? showNutrition : true))
            .map(({ id, Icon, labelPt, labelEn }) => (
              <button
                key={id}
                className={`nav-tab ${tab2 === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                <Icon size={22} />
                <span>{lang === "pt" ? labelPt : labelEn}</span>
              </button>
            ))}

          {showGym && (
            <button
              className="nav-fab"
              onClick={handleStart}
              aria-label={lang === "pt" ? "Iniciar treino" : "Start workout"}
            >
              <Play size={26} fill="currentColor" />
            </button>
          )}

          {TABS.slice(2).map(({ id, Icon, labelPt, labelEn }) => (
            <button
              key={id}
              className={`nav-tab ${tab2 === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={22} />
              <span>{lang === "pt" ? labelPt : labelEn}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 900px)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const fn = (e) => setDesktop(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
