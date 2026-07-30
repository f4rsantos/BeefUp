import { AppProvider, useApp } from "./context/AppContext";
import WorkoutPage from "./pages/WorkoutPage";
import ActiveWorkout from "./pages/ActiveWorkout";
import HistoryPage from "./pages/HistoryPage";
import ExercisesPage from "./pages/ExercisesPage";
import ProfilePage from "./pages/ProfilePage";
import MeasuresPage from "./pages/MeasuresPage";
import SettingsPage from "./pages/SettingsPage";
import WorkoutPicker from "./pages/WorkoutPicker";
import PlanSettings from "./pages/PlanSettings";
import WorkoutSettings from "./pages/WorkoutSettings";
import NutritionPage from "./pages/NutritionPage";
import Onboarding from "./onboarding/Onboarding";
import HelperDashboard from "./dashboard/HelperDashboard";
import MiniWorkoutBar from "./components/MiniWorkoutBar";
import ConfirmModal from "./components/ConfirmModal";
import { Dumbbell, Apple, TrendingUp, Settings, Play } from "lucide-react";
import { todaysPlanEntry, uid } from "./lib/planUtils";
import { decodeWorkoutShare } from "./lib/workoutShare";
import { useState, useEffect } from "react";

const TABS = [
  { id: "home", Icon: Dumbbell, labelPt: "Treino", labelEn: "Workout" },
  { id: "nutrition", Icon: Apple, labelPt: "Nutrição", labelEn: "Nutrition" },
  { id: "progress", Icon: TrendingUp, labelPt: "Progresso", labelEn: "Progress" },
  { id: "settings", Icon: Settings, labelPt: "Definições", labelEn: "Settings" },
];

function NavTabButton({ Icon, label, active, onClick }) {
  return (
    <button className={`nav-tab ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={22} />
      <span>{label}</span>
    </button>
  );
}

function AppInner() {
  const [tab, setTab] = useState("home"); // bottom nav tab
  const [overlay, setOverlay] = useState(null); // 'pickWorkout' | 'planSettings' | ... | null
  const [workoutMinimized, setWorkoutMinimized] = useState(false);
  const [planSettingsPlanId, setPlanSettingsPlanId] = useState(null);
  const [workoutSettingsView, setWorkoutSettingsView] = useState("main");
  const [workoutSettingsWorkout, setWorkoutSettingsWorkout] = useState(null);
  const [incomingShare, setIncomingShare] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("w");
    return code ? decodeWorkoutShare(code) : null;
  });
  const { activeWorkout, setActiveWorkout, lang, plans, activePlanId, workouts, onboarded, focus, appMode, t, saveWorkout } = useApp();
  const isDesktop = useIsDesktop();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("w")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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

  // A workout already running wins: Re-open the running one instead of creating another one.
  function goActive(workoutInfo) {
    if (activeWorkout) {
      setWorkoutMinimized(false);
      setOverlay(null);
      return;
    }
    setActiveWorkout({ ...workoutInfo, startedAt: Date.now() });
    setWorkoutMinimized(false);
    setOverlay(null);
  }

  function endWorkout() {
    setActiveWorkout(null);
    setWorkoutMinimized(false);
    setOverlay(null);
  }

  function closeOverlay() {
    setPlanSettingsPlanId(null);
    setWorkoutSettingsView("main");
    setWorkoutSettingsWorkout(null);
    setOverlay(null);
  }

  // Start FAB: jump straight into today's scheduled workout if there is one, otherwise open the workout picker. Only reachable when no workout is running the FAB is hidden while one is.
  function handleStart() {
    const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
    const entry = todaysPlanEntry(activePlan);
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

  const workoutExpanded = activeWorkout !== null && !workoutMinimized;
  const showNav = overlay === null && !workoutExpanded;

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
            onViewHistory={() => setOverlay("history")}
            onViewExercises={() => setOverlay("exercises")}
          />
        )}
        {overlay === null && tab2 === "nutrition" && showNutrition && <NutritionPage />}
        {overlay === null && tab2 === "progress" && (
          <ProfilePage
            onOpenMeasures={() => setOverlay("measures")}
            onViewHistory={() => setOverlay("history")}
          />
        )}
        {overlay === null && tab2 === "settings" && <SettingsPage />}

        {/* Overlays (full-screen, cover nav) */}
        {overlay === "history" && <HistoryPage onBack={closeOverlay} />}
        {overlay === "exercises" && <ExercisesPage onBack={closeOverlay} />}
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
        {overlay === "measures" && <MeasuresPage onBack={closeOverlay} />}

        {/* Stays mounted while minimized */}
        {activeWorkout && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: "var(--bg)",
              display: workoutMinimized ? "none" : "block",
            }}
          >
            <ActiveWorkout
              key={activeWorkout.startedAt}
              onEnd={endWorkout}
              onMinimize={() => setWorkoutMinimized(true)}
            />
          </div>
        )}
      </div>

      {activeWorkout && workoutMinimized && overlay === null && (
        <MiniWorkoutBar
          startedAt={activeWorkout.startedAt}
          workoutName={activeWorkout.workoutName}
          onExpand={() => setWorkoutMinimized(false)}
          label={t.startWorkout}
        />
      )}

      {incomingShare && (
        <ConfirmModal
          title={t.importWorkoutTitle}
          message={`${lang === "pt" ? incomingShare.namePt : incomingShare.name} — ${incomingShare.exercises.length} ${t.exercises}`}
          cancelLabel={t.cancel}
          confirmLabel={t.importWorkout}
          onCancel={() => setIncomingShare(null)}
          onConfirm={async () => {
            await saveWorkout({ id: uid(), ...incomingShare });
            setIncomingShare(null);
          }}
        />
      )}

      {/* Bottom nav — hidden during overlays */}
      {showNav && (
        <nav className="bottom-nav">
          {TABS.slice(0, 2)
            .filter(({ id }) => (id === "home" ? showGym : id === "nutrition" ? showNutrition : true))
            .map(({ id, Icon, labelPt, labelEn }) => (
              <NavTabButton
                key={id}
                Icon={Icon}
                label={lang === "pt" ? labelPt : labelEn}
                active={tab2 === id}
                onClick={() => setTab(id)}
              />
            ))}

          {showGym && !activeWorkout && (
            <button
              className="nav-fab"
              onClick={handleStart}
              aria-label={lang === "pt" ? "Iniciar treino" : "Start workout"}
            >
              <Play size={26} fill="currentColor" />
            </button>
          )}

          {TABS.slice(2).map(({ id, Icon, labelPt, labelEn }) => (
            <NavTabButton
              key={id}
              Icon={Icon}
              label={lang === "pt" ? labelPt : labelEn}
              active={tab2 === id}
              onClick={() => setTab(id)}
            />
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
