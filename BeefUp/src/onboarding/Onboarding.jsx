import { useState } from "react";
import { Dumbbell, Apple, Sparkles, TrendingUp, ChevronRight, Sun, Moon, Monitor } from "lucide-react";
import { useApp } from "../context/AppContext";
import { uid, todayISO } from "../lib/planUtils";
import { ACTIVITY, OBJECTIVE, calcGoals } from "../lib/nutritionCalc";
import "./onboarding.css";

function soloSteps(focus) {
  const steps = ["focus", "expFocus"];
  steps.push("measures", "expMeasures");
  if (focus !== "gym") steps.push("goals", "expGoals");
  return steps;
}

export default function Onboarding() {
  const { t, completeOnboarding, addMeasurement, setNutritionGoals, theme, setTheme, lang, setLang } = useApp();
  const [mode, setMode] = useState(null);
  const [idx, setIdx] = useState(0);
  const [focus, setFocus] = useState("both");
  const [measures, setMeasures] = useState({ height: "", weight: "", chest: "", biceps: "", quadriceps: "", waist: "" });
  const [calc, setCalc] = useState({ sex: "male", age: 28, height: 175, weight: 75, activity: 1.55, obj: 0 });

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
          <button className="ob-mode ob-mode--start" onClick={() => startMode("solo")}>
            <Dumbbell size={32} />
            <span className="ob-mode-title">{t.obStart}</span>
            <span className="ob-mode-desc">{t.obStartDesc}</span>
          </button>
          <button className="ob-mode ob-mode--coach" onClick={() => startMode("helper")}>
            <TrendingUp size={24} />
            <span className="ob-mode-title">{t.obHelping}</span>
            <span className="ob-mode-desc">{t.obHelpingDesc}</span>
          </button>
        </div>
      </div>
    );
  }

  function startMode(m) {
    setMode(m);
    setIdx(0);
  }

  if (mode === "helper") {
    return (
      <Frame>
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
    for (const [type, raw] of Object.entries(measures)) {
      const n = parseFloat(raw);
      if (!isNaN(n) && n > 0) await addMeasurement({ id: uid(), date, type, value: n });
    }
    if (focus !== "gym") {
      setNutritionGoals(calcGoals({
        ...calc,
        age: +calc.age || 28,
        height: +calc.height || 175,
        weight: +calc.weight || 75,
      }));
    }
    completeOnboarding({ mode: "solo", focus });
  }

  const calcSeeded = {
    ...calc,
    height: +measures.height || calc.height,
    weight: +measures.weight || calc.weight,
  };

  return (
    <Frame>
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
            {["height", "weight", "chest", "biceps", "quadriceps", "waist"].map((m) => (
              <div key={m}>
                <label className="section-title">{t[`measureType_${m}`]}</label>
                <input
                  className="field mt-1"
                  type="number"
                  placeholder={t.obSkip}
                  value={measures[m]}
                  onChange={(e) => setMeasures({ ...measures, [m]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {step === "expMeasures" && (
        <Explainer icon={<TrendingUp size={32} />} title={t.obExpMeasuresTitle} body={t.obExpMeasuresBody} />
      )}

      {step === "goals" && <GoalsStep t={t} calc={calcSeeded} setCalc={setCalc} />}

      {step === "expGoals" && (
        <Explainer icon={<Sparkles size={32} />} title={t.obExpGoalsTitle} body={t.obExpGoalsBody} />
      )}

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
          <button key={id} className={`ob-pref-btn ${lang === id ? "active" : ""}`} onClick={() => setLang(id)} style={{ fontSize: 12, fontWeight: 700, width: 34 }}>
            {id.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div className="ob-root">
      <div className="ob-frame">{children}</div>
    </div>
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
            className={`card flex items-center gap-3 ${value === id ? "card-elevated" : ""}`}
            style={{ textAlign: "left", borderColor: value === id ? "var(--accent)" : undefined, borderWidth: 1, borderStyle: "solid" }}
            onClick={() => onChange(id)}
          >
            <Icon size={24} style={{ color: "var(--accent)" }} />
            <div>
              <div style={{ fontWeight: 700, color: "var(--text)" }}>{label}</div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{desc}</div>
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
        <Field label={t.height} value={calc.height} onChange={(v) => setCalc({ ...calc, height: v })} />
        <Field label={t.bodyWeight} value={calc.weight} onChange={(v) => setCalc({ ...calc, weight: v })} />
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
        <label className="section-title">{t.objective}</label>
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

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="section-title">{label}</label>
      <input className="field mt-1" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Explainer({ icon, title, body }) {
  return (
    <div className="ob-explainer fade-in">
      <div className="ob-explainer-icon">{icon}</div>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{title}</h2>
      <p style={{ fontSize: 15, color: "var(--muted)", maxWidth: 320 }}>{body}</p>
    </div>
  );
}
