import { useState } from "react";
import { Dumbbell, Apple, Sparkles, TrendingUp, ChevronRight, ChevronLeft, Sun, Moon, Monitor, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, todayISO } from "../lib/planUtils";
import { ACTIVITY, OBJECTIVE, calcGoals } from "../lib/nutritionCalc";
import { getMeasureUnit } from "../lib/measureTypes";
import { buildDemoPreset } from "../lib/demoData";
import "./onboarding.css";

function soloSteps(focus) {
  if (focus === "gym") return ["focus", "expFocus", "measures", "loadPlan", "expMeasures"];
  if (focus === "nutrition") return ["focus", "expFocus", "goals", "measures", "expGoals", "expMeasures"];
  return ["focus", "expFocus", "goals", "measures", "expMeasures", "loadPlan", "expGoals"];
}

export default function Onboarding() {
  const { t, completeOnboarding, addMeasurement, setNutritionGoals, saveWorkout, savePlan, setActivePlan, theme, setTheme, lang, setLang } = useApp();
  const [mode, setMode] = useState(null);
  const [idx, setIdx] = useState(0);
  const [focus, setFocus] = useState("both");
  const [measures, setMeasures] = useState({ height: "", weight: "", chest: "", biceps: "", quadriceps: "", waist: "" });
  const [calc, setCalc] = useState({ sex: "male", age: 28, height: 175, weight: 75, activity: 1.55, obj: 0 });
  const [loadPlan, setLoadPlan] = useState(true);

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
      <div className="ob-root">
        <div className="ob-frame" style={{ paddingBottom: 0, flex: "0 0 auto" }}>
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            <h1 className="ob-title">{t.obWelcome}</h1>
            <Prefs theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />
          </div>
          <p className="ob-sub">{t.obWelcomeSub}</p>
        </div>
        <div className="ob-modes">
          <button className="ob-mode ob-mode--start hero" onClick={() => startMode("solo")}>
            <Dumbbell size={32} />
            <span className="ob-mode-title">{t.obStart}</span>
            <span className="ob-mode-desc">{t.obStartDesc}</span>
          </button>
          <button
            className="ob-mode ob-mode--coach ob-mode--disabled"
            disabled
            aria-disabled="true"
            tabIndex={-1}
          >
            <TrendingUp size={24} />
            <span className="ob-mode-title">
              {t.obHelping}
              <span className="ob-focus-badge">{t.unavailable}</span>
            </span>
            <span className="ob-mode-desc">{t.obHelpingDesc}</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "helper") {
    return (
      <Frame t={t} onBack={back} total={0} current={0} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}>
        <FocusStep t={t} value={focus} onChange={setFocus} />
        <div className="ob-spacer" />
        <button className="btn btn-primary w-full" onClick={() => completeOnboarding({ mode: "helper", focus })}>
          {t.obFinish}
        </button>
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

  return (
    <Frame t={t} onBack={back} total={steps.length} current={idx} theme={theme} setTheme={setTheme} lang={lang} setLang={setLang}>
      {step === "focus" && <FocusStep t={t} value={focus} onChange={setFocus} />}

      {step === "expFocus" && (
        <Explainer
          icon={focus === "nutrition" ? <Apple size={32} /> : <Dumbbell size={32} />}
          title={focus === "nutrition" ? t.obExpNutritionTitle : t.obExpGymTitle}
          body={focus === "nutrition" ? t.obExpNutritionBody : t.obExpGymBody}
        />
      )}

      {step === "measures" && (
        <>
          <h1 className="ob-title">{t.obMeasuresTitle}</h1>
          <p className="ob-sub">{t.obMeasuresSub}</p>
          <div className="grid grid-cols-2 gap-3">
            {measureFields.map((m) => (
              <div key={m}>
                <label className="section-title">{t[`measureType_${m}`]}</label>
                <div className="ob-field-unit-wrap mt-1">
                  <input
                    className="field ob-field-unit-input"
                    type="number"
                    placeholder={t.obSkip}
                    value={measures[m]}
                    onChange={(e) => setMeasures({ ...measures, [m]: e.target.value })}
                  />
                  <span className="ob-field-unit">{getMeasureUnit(m)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === "expMeasures" && (
        <Explainer icon={<TrendingUp size={32} />} title={t.obExpMeasuresTitle} body={t.obExpMeasuresBody} />
      )}

      {step === "goals" && <GoalsStep t={t} calc={calc} setCalc={setCalc} />}

      {step === "expGoals" && (
        <Explainer icon={<Sparkles size={32} />} title={t.obExpGoalsTitle} body={t.obExpGoalsBody} />
      )}

      {step === "loadPlan" && <LoadPlanStep t={t} value={loadPlan} onChange={setLoadPlan} />}

      <div className="ob-spacer" />
      <button className="btn btn-primary w-full flex items-center justify-center gap-1" onClick={next}>
        {isLast ? t.obFinish : t.obNext}
        {!isLast && <ChevronRight size={18} />}
      </button>
    </Frame>
  );
}

function Prefs({ theme, setTheme, lang, setLang }) {
  const themes = [["light", Sun], ["dark", Moon], ["system", Monitor]];
  return (
    <div className="flex items-center gap-3">
      <div className="ob-pref-group">
        {themes.map(([id, Icon]) => (
          <button key={id} className={`ob-pref-btn ${theme === id ? "active" : ""}`} onClick={() => setTheme(id)} aria-label={id}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div className="ob-pref-group">
        {["pt", "en"].map((id) => (
          <button key={id} className={`ob-pref-btn ob-pref-btn--lang ${lang === id ? "active" : ""}`} onClick={() => setLang(id)}>
            {id.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepDots({ total, current }) {
  if (total <= 1) return null;
  return (
    <div className="ob-dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`ob-dot ${i === current ? "active" : ""}`} />
      ))}
    </div>
  );
}

function Frame({ children, t, onBack, total, current, theme, setTheme, lang, setLang }) {
  return (
    <div className="ob-root">
      <div className="ob-frame">
        <div className="ob-header">
          <div className="ob-header-side">
            <button className="btn-back" onClick={onBack} aria-label={t.back}>
              <ChevronLeft size={22} style={{ color: "var(--text)" }} />
            </button>
          </div>
          <StepDots total={total} current={current} />
          <div className="ob-header-side ob-header-side--end">
            <Prefs theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadPlanStep({ t, value, onChange }) {
  const opts = [
    { id: true, Icon: Check, label: t.obLoadPlanYes, desc: t.obLoadPlanYesDesc },
    { id: false, Icon: X, label: t.obLoadPlanNo, desc: t.obLoadPlanNoDesc },
  ];
  return (
    <>
      <h1 className="ob-title">{t.obLoadPlanTitle}</h1>
      <p className="ob-sub">{t.obLoadPlanSub}</p>
      <div className="flex flex-col gap-3">
        {opts.map(({ id, Icon, label, desc }) => (
          <button
            key={String(id)}
            className={`card ob-focus-card flex items-center gap-3 ${value === id ? "card-elevated active" : ""}`}
            onClick={() => onChange(id)}
          >
            <Icon size={24} style={{ color: "var(--accent)" }} />
            <div>
              <span className="ob-focus-label">{label}</span>
              <div className="ob-focus-desc">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function FocusStep({ t, value, onChange }) {
  const opts = [
    { id: "gym", Icon: Dumbbell, label: t.obFocusGym, desc: t.obFocusGymDesc },
    { id: "nutrition", Icon: Apple, label: t.obFocusNutrition, desc: t.obFocusNutritionDesc },
    { id: "both", Icon: Sparkles, label: t.obFocusBoth, desc: t.obFocusBothDesc },
  ];
  return (
    <>
      <h1 className="ob-title">{t.obFocusTitle}</h1>
      <div className="flex flex-col gap-3">
        {opts.map(({ id, Icon, label, desc }) => (
          <button
            key={id}
            className={`card ob-focus-card flex items-center gap-3 ${value === id ? "card-elevated active" : ""}`}
            onClick={() => onChange(id)}
          >
            <Icon size={24} style={{ color: "var(--accent)" }} />
            <div>
              <span className="ob-focus-label">{label}</span>
              <div className="ob-focus-desc">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function GoalsStep({ t, calc, setCalc }) {
  return (
    <>
      <h1 className="ob-title">{t.obGoalsTitle}</h1>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t.age} value={calc.age} onChange={(v) => setCalc({ ...calc, age: v })} />
        <Field label={t.height} unit={getMeasureUnit("height")} value={calc.height} onChange={(v) => setCalc({ ...calc, height: v })} />
        <Field label={t.bodyWeight} unit={getMeasureUnit("weight")} value={calc.weight} onChange={(v) => setCalc({ ...calc, weight: v })} />
      </div>
      <div>
        <label className="section-title">{t.activity}</label>
        <div className="flex gap-2 mt-1" style={{ flexWrap: "wrap" }}>
          {ACTIVITY.map((a) => (
            <button key={a.id} className={`chip ${calc.activity === a.f ? "active" : ""}`} onClick={() => setCalc({ ...calc, activity: a.f })}>
              {t[a.id]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="section-title">{t.goal}</label>
        <div className="flex gap-2 mt-1">
          {OBJECTIVE.map((o) => (
            <button key={o.id} className={`chip ${calc.obj === o.d ? "active" : ""}`} style={{ flex: 1, justifyContent: "center", padding: 9 }} onClick={() => setCalc({ ...calc, obj: o.d })}>
              {t[o.id]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function Field({ label, unit, value, onChange }) {
  return (
    <div>
      <label className="section-title">{label}</label>
      {unit ? (
        <div className="ob-field-unit-wrap mt-1">
          <input className="field ob-field-unit-input" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
          <span className="ob-field-unit">{unit}</span>
        </div>
      ) : (
        <input className="field mt-1" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Explainer({ icon, title, body }) {
  return (
    <div className="ob-explainer fade-in">
      <div className="ob-explainer-icon">{icon}</div>
      <h2 className="ob-explainer-title">{title}</h2>
      <p className="ob-explainer-body">{body}</p>
    </div>
  );
}
