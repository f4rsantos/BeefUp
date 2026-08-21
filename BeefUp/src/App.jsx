import { AppProvider, useApp } from "./context/AppContext";
import WorkoutPage from "./pages/WorkoutPage";
import ActiveWorkout from "./pages/ActiveWorkout";
import HistoryPage from "./pages/HistoryPage";
import ExercisesPage from "./pages/ExercisesPage";
import SettingsPage from "./pages/SettingsPage";
import WorkoutPicker from "./pages/WorkoutPicker";
import PlanSettings from "./pages/PlanSettings";
import WorkoutSettings from "./pages/WorkoutSettings";
import NutritionPage from "./pages/NutritionPage";
import Onboarding from "./onboarding/Onboarding";
import MiniWorkoutBar from "./components/MiniWorkoutBar";
import ConfirmModal from "./components/ConfirmModal";
import PwaPrompts from "./components/PwaPrompts";
import { Dumbbell, Apple, TrendingUp, Settings, Play } from "lucide-react";
import { todaysPlanEntry, uid } from "./lib/planUtils";
import { decodeWorkoutShare } from "./lib/workoutShare";
import { useState, useEffect, lazy, Suspense } from "react";
import ProfileSkeleton from "./pages/ProfileSkeleton";

const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const MeasuresPage = lazy(() => import("./pages/MeasuresPage"));
const HelperDashboard = lazy(() => import("./dashboard/HelperDashboard"));

function PageFallback() {
  return <div style={{ height: "100%", background: "var(--bg)" }} />;
}

const TABS = [
  { id: "home", Icon: Dumbbell, tKey: "homeTitle" },
  { id: "nutrition", Icon: Apple, tKey: "nutrition" },
  { id: "progress", Icon: TrendingUp, tKey: "progress" },
  { id: "settings", Icon: Settings, tKey: "settings" },
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
  const { activeWorkout, setActiveWorkout, plans, activePlanId, workouts, onboarded, sectionPrefs, appMode, t, saveWorkout } = useApp();
  const isDesktop = useIsDesktop();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("w")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  if (!onboarded) return <Onboarding />;

  if (appMode === "helper") {
    if (isDesktop) {
      return (
        <Suspense fallback={<PageFallback />}>
          <HelperDashboard />
        </Suspense>
      );
    }
    return (
      <div style={{ height: "100%", display: "grid", placeItems: "center", padding: 32, textAlign: "center", background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)", maxWidth: 320 }}>{t.obDesktopOnly}</p>
      </div>
    );
  }

  const showGym = sectionPrefs.gym;
  const showNutrition = sectionPrefs.nutrition;
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
          workoutName: w.name,
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
          <Suspense fallback={<ProfileSkeleton />}>
            <ProfilePage
              onOpenMeasures={() => setOverlay("measures")}
            />
          </Suspense>
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
                workoutName: w.name,
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
        {overlay === "measures" && (
          <Suspense fallback={<PageFallback />}>
            <MeasuresPage onBack={closeOverlay} />
          </Suspense>
        )}

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
          message={`${incomingShare.name} — ${incomingShare.exercises.length} ${t.exercises}`}
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
            .map(({ id, Icon, tKey }) => (
              <NavTabButton
                key={id}
                Icon={Icon}
                label={t[tKey]}
                active={tab2 === id}
                onClick={() => setTab(id)}
              />
            ))}

          {showGym && !activeWorkout && (
            <button
              className="nav-fab"
              onClick={handleStart}
              aria-label={t.startWorkoutAria}
            >
              <Play size={26} fill="currentColor" />
            </button>
          )}

          {TABS.slice(2).map(({ id, Icon, tKey }) => (
            <NavTabButton
              key={id}
              Icon={Icon}
              label={t[tKey]}
              active={tab2 === id}
              onClick={() => setTab(id)}
            />
          ))}
        </nav>
      )}

      <PwaPrompts aboveNav={showNav} />
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
