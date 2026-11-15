import { useState } from "react";
import { Dumbbell, Apple, Sparkles, TrendingUp, ChevronRight, Check, X } from "lucide-react";
import { useApp } from "../context/useApp";
import { uid, todayISO } from "../lib/planUtils";
import { ACTIVITY, OBJECTIVE, calcGoals } from "../lib/nutritionCalc";
import { getMeasureUnit } from "../lib/measureTypes";
import { buildDemoPreset } from "../lib/demoData";
import { useThemeOptions, useLanguageOptions } from "../lib/usePreferenceOptions";
import NumberField from "../components/NumberField";
import { signIn, signUp, setProfileRole, isTrainerTakenError } from "../lib/auth";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import TrainerSetup from "./TrainerSetup";
import Screen from "../components/ui/Screen";
import LargeTitle from "../components/ui/LargeTitle";
import NavHeader from "../components/ui/NavHeader";
import Segmented from "../components/ui/Segmented";
import ChoiceTiles from "../components/ui/ChoiceTiles";
import Field from "../components/ui/Field";
import Meter from "../components/ui/Meter";
import "./onboarding.css";

function soloSteps(focus) {
  if (focus === "gym") return ["focus", "expFocus", "measures", "loadPlan", "expMeasures"];
  if (focus === "nutrition") return ["focus", "expFocus", "goals", "measures", "expGoals", "expMeasures"];
  return ["focus", "expFocus", "goals", "measures", "expMeasures", "loadPlan", "expGoals"];
}

export default function Onboarding() {
  const { t, completeOnboarding, addMeasurement, setNutritionGoals, saveWorkout, savePlan, setActivePlan } = useApp();
  const [mode, setMode] = useState(null);
  const [idx, setIdx] = useState(0);
  const [focus, setFocus] = useState("both");
  const [measures, setMeasures] = useState({ height: "", weight: "", chest: "", biceps: "", quadriceps: "", waist: "" });
  const [calc, setCalc] = useState({ sex: "male", age: 28, height: 175, weight: 75, activity: 1.55, obj: 0 });
  const [loadPlan, setLoadPlan] = useState(true);
  const [account, setAccount] = useState({ name: "", email: "", password: "", existing: false });
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");

  const supabaseConfigured = useSupabaseConfigured();

  function startMode(m) {
    setMode(m);
    setIdx(0);
  }

  function back() {
    if (idx === 0) { setMode(null); return; }
    setIdx((i) => i - 1);
  }

  if (mode === null) {
    return (
      <Shell>
        <Screen gap={24}>
          <div className="ob-topbar">
            <Prefs />
          </div>
          <div>
            <LargeTitle title={t.obWelcome} />
            <p className="large-title-eyebrow" style={{ marginTop: 6 }}>{t.obWelcomeSub}</p>
          </div>
          <div className="ob-modes">
            <ModeCard icon={Dumbbell} title={t.obStart} meta={t.obStartDesc} onClick={() => startMode("solo")} />
            <ModeCard icon={TrendingUp} title={t.obHelping} meta={t.obHelpingDesc} onClick={() => startMode("helper")} />
          </div>
        </Screen>
      </Shell>
    );
  }

  async function submitAccount() {
    setAccountBusy(true);
    setAccountError("");
    try {
      let session;
      if (account.existing) {
        session = await signIn(account.email.trim(), account.password);
      } else {
        session = await signUp(account.email.trim(), account.password, account.name.trim() || account.email.trim());
      }
      if (!session) {
        // Email confirmation is required on this project: signUp() succeeds
        // but returns no session until the link is clicked, so there is no
        // one to call setProfileRole() for yet.
        setAccountError(t.obHelperConfirmEmail);
        return;
      }
      await setProfileRole("trainer");
      completeOnboarding({ mode: "helper" });
    } catch (e) {
      setAccountError(isTrainerTakenError(e) ? t.trainerSetupTrainerTaken : (e?.message || t.obHelperAccountFailed));
    } finally {
      setAccountBusy(false);
    }
  }

  if (mode === "helper") {
    // Dev-only escape hatch: skip account creation and go straight to the
    // trainer dashboard. import.meta.env.DEV is false in production builds,
    // so this button is stripped there. Pair with ?dash-demo=1 for fake students.
    const devSkip = import.meta.env.DEV && (
      <button className="btn btn-ghost text-sm w-full" onClick={() => completeOnboarding({ mode: "helper" })}>
        Skip (dev)
      </button>
    );

    if (!supabaseConfigured) {
      return (
        <Frame t={t} onBack={back}>
          <TrainerSetup />
          {devSkip}
        </Frame>
      );
    }

    const canSubmit =
      account.email.trim() && account.password && (account.existing || account.name.trim());
    return (
      <Frame
        t={t}
        onBack={back}
        title={account.existing ? t.obHelperSignIn : t.obHelperCreateAccount}
        sub={t.obHelperAccountWhy}
      >
        <div className="modal-stack">
          {!account.existing && (
            <Field label={t.dashDisplayName} htmlFor="ob-name">
              <input
                id="ob-name"
                className="field"
                value={account.name}
                onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
              />
            </Field>
          )}
          <Field label={t.dashEmail} htmlFor="ob-email">
            <input
              id="ob-email"
              className="field"
              type="email"
              autoComplete="email"
              value={account.email}
              onChange={(e) => setAccount((a) => ({ ...a, email: e.target.value }))}
            />
          </Field>
          <Field label={t.dashPassword} htmlFor="ob-password">
            <input
              id="ob-password"
              className="field"
              type="password"
              autoComplete={account.existing ? "current-password" : "new-password"}
              value={account.password}
              onChange={(e) => setAccount((a) => ({ ...a, password: e.target.value }))}
            />
          </Field>
          {accountError && <p className="modal-text text-danger">{accountError}</p>}
          <button
            className="text-button"
            onClick={() => { setAccount((a) => ({ ...a, existing: !a.existing })); setAccountError(""); }}
          >
            {account.existing ? t.dashNeedAccount : t.dashHaveAccount}
          </button>
        </div>
        <div className="ob-spacer" />
        <button className="btn btn-primary w-full" onClick={submitAccount} disabled={!canSubmit || accountBusy}>
          {accountBusy ? "…" : t.obHelperContinue}
        </button>
        {devSkip}
      </Frame>
    );
  }

  const steps = soloSteps(focus);
  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  async function next() {
    if (isLast) return finish();
    setIdx((i) => i + 1);
  }

  async function finish() {
    const date = todayISO();
    const measureValues = focus === "gym" ? measures : { ...measures, height: calc.height, weight: calc.weight };
    const entries = Object.entries(measureValues)
      .map(([type, raw]) => [type, parseFloat(raw)])
      .filter(([, n]) => !isNaN(n) && n > 0);
    await Promise.all(entries.map(([type, n]) => addMeasurement({ id: uid(), date, type, value: n })));
    if (focus !== "gym") {
      setNutritionGoals(calcGoals({
        ...calc,
        age: +calc.age || 28,
        height: +calc.height || 175,
        weight: +calc.weight || 75,
      }));
    }
    if (loadPlan) {
      const demo = buildDemoPreset();
      await Promise.all(demo.workouts.map((workout) => saveWorkout(workout)));
      await savePlan(demo.plan);
      await setActivePlan(demo.plan.id);
    }
    completeOnboarding({ mode: "solo", focus });
  }

  const measureFields = focus === "gym"
    ? ["height", "weight", "chest", "biceps", "quadriceps", "waist"]
    : ["chest", "biceps", "quadriceps", "waist"];

  const explainer = {
    expFocus: {
      icon: focus === "nutrition" ? Apple : Dumbbell,
      title: focus === "nutrition" ? t.obExpNutritionTitle : t.obExpGymTitle,
      body: focus === "nutrition" ? t.obExpNutritionBody : t.obExpGymBody,
    },
    expMeasures: { icon: TrendingUp, title: t.obExpMeasuresTitle, body: t.obExpMeasuresBody },
    expGoals: { icon: Sparkles, title: t.obExpGoalsTitle, body: t.obExpGoalsBody },
  }[step];

  const titles = {
    focus: [t.obFocusTitle],
    measures: [t.obMeasuresTitle, t.obMeasuresSub],
    goals: [t.obGoalsTitle],
    loadPlan: [t.obLoadPlanTitle, t.obLoadPlanSub],
  };
  const [title, sub] = explainer ? [explainer.title] : titles[step];

  return (
    <Frame t={t} onBack={back} total={steps.length} current={idx} title={title} sub={sub}>
      {step === "focus" && <FocusStep t={t} value={focus} onChange={setFocus} />}

      {explainer && <Explainer key={step} icon={explainer.icon} body={explainer.body} />}

      {step === "measures" && (
        <div className="grid grid-cols-2 gap-3">
          {measureFields.map((m) => (
            <UnitField
              key={m}
              id={`ob-${m}`}
              label={t[`measureType_${m}`]}
              unit={getMeasureUnit(m)}
              placeholder={t.obSkip}
              value={measures[m]}
              onChange={(v) => setMeasures({ ...measures, [m]: v })}
            />
          ))}
        </div>
      )}

      {step === "goals" && <GoalsStep t={t} calc={calc} setCalc={setCalc} />}

      {step === "loadPlan" && <LoadPlanStep t={t} value={loadPlan} onChange={setLoadPlan} />}

      {!explainer && <div className="ob-spacer" />}
      <button className="btn btn-primary w-full flex items-center justify-center gap-1" onClick={next}>
        {isLast ? t.obFinish : t.obNext}
        {!isLast && <ChevronRight size={18} />}
      </button>
    </Frame>
  );
}

// Same background and column width as the main app shell.
function Shell({ children }) {
  return <div className="ob-root app-shell">{children}</div>;
}

// Same option sources as Settings, shown compact (icons only for theme).
function Prefs() {
  const { t } = useApp();
  const theme = useThemeOptions();
  const lang = useLanguageOptions();
  const themeOptions = theme.options.map(({ id, icon: Icon, label }) => ({
    id,
    label,
    content: <Icon size={16} strokeWidth={2.2} />,
  }));
  const langOptions = lang.options.map(({ id }) => ({ id, label: id.toUpperCase() }));
  return (
    <div className="ob-prefs">
      <div className="ob-prefs-theme">
        <Segmented {...theme} options={themeOptions} label={t.theme} />
      </div>
      <div className="ob-prefs-lang">
        <Segmented {...lang} options={langOptions} label={t.language} />
      </div>
    </div>
  );
}

function Frame({ children, t, onBack, total = 0, current = 0, title, sub }) {
  return (
    <Shell>
      <Screen gap={20}>
        <NavHeader title={title} onBack={onBack} backLabel={t.back} actions={<Prefs />} />
        {sub && <p className="large-title-eyebrow ob-sub">{sub}</p>}
        {total > 1 && <Meter value={current + 1} max={total} />}
        {children}
      </Screen>
    </Shell>
  );
}

function FocusStep({ t, value, onChange }) {
  const opts = [
    { id: "gym", icon: Dumbbell, label: t.obFocusGym, desc: t.obFocusGymDesc },
    { id: "nutrition", icon: Apple, label: t.obFocusNutrition, desc: t.obFocusNutritionDesc },
    { id: "both", icon: Sparkles, label: t.obFocusBoth, desc: t.obFocusBothDesc },
  ];
  return <ChoiceWithHint options={opts} value={value} onChange={onChange} label={t.obFocusTitle} />;
}

function LoadPlanStep({ t, value, onChange }) {
  const opts = [
    { id: "yes", icon: Check, label: t.obLoadPlanYes, desc: t.obLoadPlanYesDesc },
    { id: "no", icon: X, label: t.obLoadPlanNo, desc: t.obLoadPlanNoDesc },
  ];
  return (
    <ChoiceWithHint
      options={opts}
      value={value ? "yes" : "no"}
      onChange={(id) => onChange(id === "yes")}
      label={t.obLoadPlanTitle}
    />
  );
}

// ChoiceTiles plus the selected option's description underneath.
function ChoiceWithHint({ options, value, onChange, label }) {
  const selected = options.find((o) => o.id === value);
  return (
    <div className="modal-stack">
      <ChoiceTiles options={options} value={value} onChange={onChange} label={label} />
      {selected?.desc && <p className="list-footer" style={{ paddingTop: 0 }}>{selected.desc}</p>}
    </div>
  );
}

function GoalsStep({ t, calc, setCalc }) {
  const activityOptions = ACTIVITY.map((a) => ({ id: a.f, label: t[a.id] }));
  const objectiveOptions = OBJECTIVE.map((o) => ({ id: o.d, label: t[o.id] }));
  return (
    <div className="modal-stack">
      <div className="grid grid-cols-3 gap-2">
        <UnitField id="ob-age" label={t.age} allowDecimal={false} value={calc.age} onChange={(v) => setCalc({ ...calc, age: v })} />
        <UnitField id="ob-height" label={t.height} unit={getMeasureUnit("height")} value={calc.height} onChange={(v) => setCalc({ ...calc, height: v })} />
        <UnitField id="ob-weight" label={t.bodyWeight} unit={getMeasureUnit("weight")} value={calc.weight} onChange={(v) => setCalc({ ...calc, weight: v })} />
      </div>
      <Field label={t.activity}>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {activityOptions.map((a) => (
            <button key={a.id} className={`chip ${calc.activity === a.id ? "active" : ""}`} onClick={() => setCalc({ ...calc, activity: a.id })}>
              {a.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t.goal}>
        <Segmented options={objectiveOptions} value={calc.obj} onChange={(obj) => setCalc({ ...calc, obj })} label={t.goal} />
      </Field>
    </div>
  );
}

function UnitField({ id, label, unit, value, onChange, allowDecimal, placeholder }) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="ob-field-unit-wrap">
        <NumberField
          id={id}
          className={`field ${unit ? "ob-field-unit-input" : "w-full"}`}
          allowDecimal={allowDecimal}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span className="ob-field-unit">{unit}</span>}
      </div>
    </Field>
  );
}

// Same card as the home page's plan card.
function ModeCard({ icon: Icon, title, meta, onClick }) {
  return (
    <button className="card feature-card" onClick={onClick}>
      <span className="feature-card-orb">
        <Icon size={24} strokeWidth={2.2} />
      </span>
      <span className="flex-1" style={{ minWidth: 0 }}>
        <span className="feature-card-title" style={{ display: "block" }}>{title}</span>
        <span className="feature-card-meta" style={{ display: "block" }}>{meta}</span>
      </span>
      <ChevronRight className="text-muted" size={20} strokeWidth={2.4} />
    </button>
  );
}

function Explainer({ icon: Icon, body }) {
  return (
    <div className="ob-explainer fade-in">
      <span className="feature-card-orb ob-explainer-orb">
        <Icon size={40} strokeWidth={2} />
      </span>
      <p className="empty-state-text ob-explainer-body">{body}</p>
    </div>
  );
}
