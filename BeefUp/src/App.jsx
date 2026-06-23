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
import { useState } from "react";
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
  const { setActiveWorkout, lang, plans, activePlanId, workouts, sessions } = useApp();

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
        {overlay === null && tab === "home" && (
          <WorkoutPage
            onStartWorkout={goActive}
            onPickWorkout={() => setOverlay("pickWorkout")}
            onManageWorkouts={() => setOverlay("planSettings")}
            onViewHistory={() => setOverlay("history")}
          />
        )}
        {overlay === null && tab === "nutrition" && <NutritionPage />}
        {overlay === null && tab === "progress" && (
          <ProfilePage
            onOpenStatistics={() => setOverlay("statistics")}
            onOpenMeasures={() => setOverlay("measures")}
            onViewHistory={() => setOverlay("history")}
          />
        )}
        {overlay === null && tab === "settings" && <SettingsPage />}

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
          {TABS.slice(0, 2).map(({ id, Icon, labelPt, labelEn }) => (
            <button
              key={id}
              className={`nav-tab ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={22} />
              <span>{lang === "pt" ? labelPt : labelEn}</span>
            </button>
          ))}

          <button
            className="nav-fab"
            onClick={handleStart}
            aria-label={lang === "pt" ? "Iniciar treino" : "Start workout"}
          >
            <Play size={26} fill="currentColor" />
          </button>

          {TABS.slice(2).map(({ id, Icon, labelPt, labelEn }) => (
            <button
              key={id}
              className={`nav-tab ${tab === id ? "active" : ""}`}
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

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
