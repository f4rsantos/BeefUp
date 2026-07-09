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
import WorkoutSettings from "./pages/WorkoutSettings";
import { useState } from "react";
import { Dumbbell, Settings, User } from "lucide-react";

const TABS = [
  { id: "home", Icon: Dumbbell, labelPt: "Treino", labelEn: "Workout" },
  { id: "profile", Icon: User, labelPt: "Perfil", labelEn: "Profile" },
  {
    id: "settings",
    Icon: Settings,
    labelPt: "Definições",
    labelEn: "Settings",
  },
];

function AppInner() {
  const [tab, setTab] = useState("home"); // bottom nav tab
  const [overlay, setOverlay] = useState(null); // 'active' | 'pickWorkout' | 'planSettings' | null
  const [planSettingsPlanId, setPlanSettingsPlanId] = useState(null);
  const [workoutSettingsView, setWorkoutSettingsView] = useState("main");
  const [workoutSettingsWorkout, setWorkoutSettingsWorkout] = useState(null);
  const { setActiveWorkout, lang, activePlanId } = useApp();

  function goActive(workoutInfo) {
    setActiveWorkout(workoutInfo);
    setOverlay("active");
  }

  function endWorkout() {
    setActiveWorkout(null);
    setOverlay(null);
  }

  function closeOverlay() {
    setPlanSettingsPlanId(null);
    setWorkoutSettingsView("main");
    setWorkoutSettingsWorkout(null);
    setOverlay(null);
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
      {/* Main content area */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Tab views */}
        {overlay === null && tab === "home" && (
          <WorkoutPage
            onStartWorkout={goActive}
            onPickWorkout={() => setOverlay("pickWorkout")}
            onManagePlans={() => {
              setPlanSettingsPlanId(null);
              setOverlay("planSettings");
            }}
            onCreateWorkout={() => {
              setWorkoutSettingsView("editWorkout");
              setWorkoutSettingsWorkout(null);
              setOverlay("workoutSettings");
            }}
            onManageWorkouts={() => {
              setWorkoutSettingsView("main");
              setPlanSettingsPlanId(null);
              setWorkoutSettingsWorkout(null);
              setOverlay("workoutSettings");
            }}
            onEditWorkout={(workout) => {
              setWorkoutSettingsWorkout(workout);
              setWorkoutSettingsView("editWorkout");
              setOverlay("workoutSettings");
            }}
            onViewPlanDetails={() => {
              setPlanSettingsPlanId(activePlanId);
              setOverlay("planSettings");
            }}
            onViewHistory={() => setTab("history")}
          />
        )}
        {overlay === null && tab === "history" && <HistoryPage />}
        {overlay === null && tab === "profile" && (
          <ProfilePage
            onOpenStatistics={() => setOverlay("statistics")}
            onOpenMeasures={() => setOverlay("measures")}
          />
        )}
        {overlay === null && tab === "settings" && <SettingsPage />}

        {/* Overlays (full-screen, cover nav) */}
        {overlay === "active" && <ActiveWorkout onEnd={endWorkout} />}
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
        {overlay === "planSettings" && (
          <PlanSettings onBack={closeOverlay} initialPlanId={planSettingsPlanId} />
        )}
        {overlay === "workoutSettings" && (
          <WorkoutSettings
            onBack={closeOverlay}
            initialView={workoutSettingsView}
            initialWorkout={workoutSettingsWorkout}
          />
        )}
        {overlay === "statistics" && <StatisticsPage onBack={closeOverlay} />}
        {overlay === "measures" && <MeasuresPage onBack={closeOverlay} />}
      </div>

      {/* Bottom nav — hidden during active workout */}
      {showNav && (
        <nav className="bottom-nav">
          {TABS.map(({ id, Icon, labelPt, labelEn }) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
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
