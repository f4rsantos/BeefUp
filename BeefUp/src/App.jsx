import { AppProvider } from "./context/AppContext";
import { useApp } from "./context/useApp";
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
import TrainerLinkModal from "./components/TrainerLinkModal";
import { Dumbbell, Apple, TrendingUp, Settings, Play } from "lucide-react";
import { todaysPlanEntry, uid } from "./lib/planUtils";
import { decodeWorkoutShare } from "./lib/workoutShare";
import { decodeTrainerInvite } from "./lib/trainerInvite";
import { useSync } from "./lib/sync/useSync";
import { getPref, setPref } from "./lib/prefs";
import { useModalFocus } from "./lib/useModalFocus";
import { useState, useEffect, lazy, Suspense } from "react";
import ProfileSkeleton from "./pages/ProfileSkeleton";
import { DockContext } from "./components/ui/DockContext";

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

const DOCK_HEIGHT = {
  hidden: "0px",
  tabs: "calc(64px + max(14px, env(safe-area-inset-bottom)))",
  tabsWithPlayer: "calc(130px + max(14px, env(safe-area-inset-bottom)))",
};

function NavTabButton({ Icon, label, active, onClick }) {
  return (
    <button
      className={`tab-bar-item ${active ? "active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={22} strokeWidth={active ? 2.4 : 2} />
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
  const [incomingTrainerInvite] = useState(() => {
    const payload = new URLSearchParams(window.location.search).get("t");
    return payload ? decodeTrainerInvite(payload) : null;
  });
  const [showTrainerLinkModal, setShowTrainerLinkModal] = useState(false);
  const [dockCompact, setDockCompact] = useState(false);
  const { activeWorkout, setActiveWorkout, plans, activePlanId, workouts, onboarded, sectionPrefs, appMode, t, saveWorkout } = useApp();
  // App-wide: Settings used to be the only caller, so data only reached the
  // trainer while that tab happened to be open.
  useSync();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("w")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("t")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Survives onboarding: a first-time invitee has no account yet when the link opens.
  useEffect(() => {
    if (incomingTrainerInvite) setPref("pendingTrainerInvite", incomingTrainerInvite);
  }, [incomingTrainerInvite]);

  useEffect(() => {
    if (!onboarded) return;
    let cancelled = false;
    getPref("pendingTrainerInvite", null).then((pending) => {
      if (!cancelled && pending) setShowTrainerLinkModal(true);
    });
    return () => { cancelled = true; };
  }, [onboarded]);

  if (!onboarded) return <Onboarding />;

  if (appMode === "helper") {
    return (
      <Suspense fallback={<PageFallback />}>
        <HelperDashboard />
      </Suspense>
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
  const showMiniPlayer = activeWorkout !== null && workoutMinimized && overlay === null;
  const dockHeight = !showNav ? DOCK_HEIGHT.hidden : showMiniPlayer ? DOCK_HEIGHT.tabsWithPlayer : DOCK_HEIGHT.tabs;
  const visibleTabs = TABS.filter(({ id }) => (id === "home" ? showGym : id === "nutrition" ? showNutrition : true));
  const activeTabIndex = Math.max(0, visibleTabs.findIndex(({ id }) => id === tab2));

  function selectTab(id) {
    setDockCompact(false);
    setTab(id);
  }

  return (
    <DockContext.Provider value={setDockCompact}>
      <div
        className="app-shell"
        data-dock={dockCompact && !showMiniPlayer ? "compact" : "full"}
        style={{
          height: "100%",
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          background: "var(--canvas, var(--bg))",
          "--dock-h": dockHeight,
          "--screen-bottom": `calc(${dockHeight} + 28px)`,
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
                background: "var(--canvas, var(--bg))",
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

        {incomingShare && (
          <ConfirmModal
            title={t.importWorkoutTitle}
            message={`${incomingShare.name}: ${incomingShare.exercises.length} ${t.exercises}`}
            cancelLabel={t.cancel}
            confirmLabel={t.importWorkout}
            onCancel={() => setIncomingShare(null)}
            onConfirm={async () => {
              await saveWorkout({ id: uid(), ...incomingShare });
              setIncomingShare(null);
            }}
          />
        )}

        {showTrainerLinkModal && (
          <TrainerLinkModal
            onClose={() => setShowTrainerLinkModal(false)}
            onLinked={() => setShowTrainerLinkModal(false)}
          />
        )}

        {showNav && (
          <div className="tab-dock">
            {showMiniPlayer && (
              <MiniWorkoutBar
                startedAt={activeWorkout.startedAt}
                workoutName={activeWorkout.workoutName}
                onExpand={() => setWorkoutMinimized(false)}
                label={t.startWorkout}
              />
            )}
            <div className="tab-dock-row">
              <nav className="tab-bar glass" style={{ "--count": visibleTabs.length, "--index": activeTabIndex }}>
                <span className="tab-bar-lens" aria-hidden="true" />
                {visibleTabs.map(({ id, Icon, tKey }) => (
                  <NavTabButton
                    key={id}
                    Icon={Icon}
                    label={t[tKey]}
                    active={tab2 === id}
                    onClick={() => selectTab(id)}
                  />
                ))}
              </nav>
              {showGym && !activeWorkout && (
                <button className="tab-action" onClick={handleStart} aria-label={t.startWorkoutAria}>
                  <Play size={24} fill="currentColor" strokeWidth={0} />
                </button>
              )}
            </div>
          </div>
        )}

        <PwaPrompts aboveNav={showNav} />
      </div>
    </DockContext.Provider>
  );
}

export default function App() {
  useModalFocus();
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
