import { useState } from "react";
import { useApp } from "../context/useApp";
import {
  BACK_OFF_PERCENTS, MAX_DROPS, MAX_PERCENT, REP_TARGETS, backOffWeight, dropSetWeights, formatKg, oneRepMax, roundTo, targetRepsWeight, weightForReps,
} from "../lib/calculators";
import NumberField from "./NumberField";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import Segmented from "./ui/Segmented";
import "./CalculatorModal.css";

function Rows({ rows }) {
  return (
    <ul className="calc-rows">
      {rows.map(({ label, value }) => (
        <li key={label} className="calc-row">
          <span className="text-muted">{label}</span>
          <span className="calc-value text-body">{value}</span>
        </li>
      ))}
    </ul>
  );
}

function OneRm({ weight, reps, t }) {
  const max = oneRepMax(weight, reps);
  if (max === null) return null;
  return (
    <>
      <div className="calc-result">
        <p className="field-label">{t.oneRMResult}</p>
        <p className="calc-big text-body">{formatKg(Math.round(max * 10) / 10)} <span>kg</span></p>
      </div>
      <Rows
        rows={REP_TARGETS.map((n) => ({
          label: `${n} ${t.reps.toLowerCase()}`,
          value: `${formatKg(roundTo(weightForReps(max, n)))} kg`,
        }))}
      />
    </>
  );
}

function BackOff({ weight }) {
  if (backOffWeight(weight, 0) === null) return null;
  return (
    <Rows
      rows={BACK_OFF_PERCENTS.map((percent) => ({
        label: `−${percent}%`,
        value: `${formatKg(backOffWeight(weight, percent))} kg`,
      }))}
    />
  );
}

function DropSet({ weight, drops, percent, t }) {
  const weights= dropSetWeights(weight, drops, percent);
  if (!weights) return null;
  const cut= Math.min(parseFloat(percent), MAX_PERCENT);
  return (
    <Rows
      rows={weights.map((kg, i) => ({
        label: i === 0 ? t.calcDropStart : `${t.calcDrop} ${i} (−${formatKg(cut)}%)`,
        value: `${formatKg(kg)} kg`,
      }))}
    />
  );
}

function TargetReps({ weight, reps, target, t }) {
  const kg= targetRepsWeight(weight, reps, target);
  if (kg === null) return null;
  return (
    <div className="calc-result">
      <p className="field-label">{t.calcTargetResult.replace("{n}", Math.floor(parseFloat(target)))}</p>
      <p className="calc-big text-body">{formatKg(roundTo(kg))} <span>kg</span></p>
    </div>
  );
}

export default function CalculatorModal({ initialWeight = "", initialReps = "", onClose }) {
  const { t } = useApp();
  const [tab, setTab] = useState("oneRm");
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [drops, setDrops] = useState("3");
  const [percent, setPercent] = useState("20");
  const [target, setTarget] = useState("");

  const tabs = [
    { id: "oneRm", label: "1RM" },
    { id: "backOff", label: t.calcBackOff },
    { id: "dropSet", label: t.calcDropSet },
    { id: "target", label: t.calcTarget },
  ];
  const weightLabel = { oneRm: t.weight, backOff: t.calcTopSet, dropSet: t.calcDropStartKg, target: t.calcLifted }[tab];
  const formula = {
    oneRm: t.calcFormulaOneRm, backOff: t.calcFormulaBackOff, dropSet: t.calcFormulaDropSet, target: t.calcFormulaTarget,
  }[tab];

  return (
    <Modal title={t.calculators} onClose={onClose} closeLabel={t.cancel} dismissOnBackdrop>
      <div className="modal-stack">
        <Segmented label={t.calculators} value={tab} onChange={setTab} options={tabs} />
        <div className="flex gap-3">
          <Field className="flex-1" label={weightLabel}>
            <NumberField className="field w-full" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          {(tab === "oneRm" || tab === "target") && (
            <Field className="flex-1" label={tab === "target" ? t.calcDoneReps : t.reps}>
              <NumberField className="field w-full" allowDecimal={false} placeholder="reps" value={reps} onChange={(e) => setReps(e.target.value)} />
            </Field>
          )}
        </div>
        {tab === "dropSet" && (
          <div className="flex gap-3">
            <Field className="flex-1" label={t.calcDrops}>
              <NumberField className="field w-full" allowDecimal={false} placeholder={`1–${MAX_DROPS}`} value={drops} onChange={(e) => setDrops(e.target.value)} />
            </Field>
            <Field className="flex-1" label={t.calcPercent}>
              <NumberField className="field w-full" placeholder={`1–${MAX_PERCENT}`} value={percent} onChange={(e) => setPercent(e.target.value)} />
            </Field>
          </div>
        )}
        {tab === "target" && (
          <Field label={t.calcTargetReps}>
            <NumberField className="field w-full" allowDecimal={false} placeholder="reps" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
        )}
        {tab === "oneRm" && <OneRm weight={weight} reps={reps} t={t} />}
        {tab === "backOff" && <BackOff weight={weight} />}
        {tab === "dropSet" && <DropSet weight={weight} drops={drops} percent={percent} t={t} />}
        {tab === "target" && <TargetReps weight={weight} reps={reps} target={target} t={t} />}
        <p className="calc-formula text-muted">{formula}</p>
      </div>
    </Modal>
  );
}
