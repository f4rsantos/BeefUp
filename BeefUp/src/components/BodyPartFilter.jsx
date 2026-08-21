import { RotateCcw } from "lucide-react";
import HumanBody from "./HumanBody";
import { getBodyPartLabel, BODY_PART_POSITIONS } from "../lib/exerciseTree";
import "./BodyPartFilter.css";

// Mapeia cada bodyPart do filtro para os grupos finos que HumanBody.jsx
const BODY_PART_MUSCLE_GROUPS = {
  chest: { front: ["Pectorals"], back: [] },
  back: { front: [], back: ["Lats", "Trapezius"] },
  shoulders: { front: ["Deltoids"], back: ["Deltoids"] },
  "upper arms": { front: ["Biceps"], back: ["Triceps"] },
  waist: { front: ["Abs", "Obliques"], back: [] },
  "upper legs": { front: ["Quads", "Adductors"], back: ["Hamstrings", "Glutes"] },
  "lower legs": { front: ["Calves"], back: ["Calves"] },
  cardio: { front: [], back: [] },
  neck: { front: [], back: [] },
};

const MUSCLE_GROUP_TO_BODY_PART = { front: {}, back: {} };
for (const [bp, views] of Object.entries(BODY_PART_MUSCLE_GROUPS)) {
  for (const view of ["front", "back"]) {
    for (const group of views[view]) MUSCLE_GROUP_TO_BODY_PART[view][group] = bp;
  }
}

function BodyLabelRow({ label, active, side, y, onClick }) {
  return (
    <button
      className={`body-label-row ${active ? "active" : ""}`}
      style={{ top: `${y}%`, textAlign: side === "left" ? "right" : "left" }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function BodyPartFilter({ bodyPart, setBodyPart, bodyView, setBodyView, lang, t }) {
  const positions = BODY_PART_POSITIONS[bodyView];
  const entries = Object.entries(positions);
  const leftEntries = entries.filter(([, pos]) => pos.side === "left");
  const rightEntries = entries.filter(([, pos]) => pos.side === "right");

  function toggle(bp) {
    setBodyPart(bodyPart === bp ? null : bp);
  }

  const highlightedMuscles = bodyPart ? BODY_PART_MUSCLE_GROUPS[bodyPart]?.[bodyView] ?? [] : [];

  function handleSilhouetteClick(e) {
    const region = e.target.closest?.(".muscle-region");
    const bp = region && MUSCLE_GROUP_TO_BODY_PART[bodyView][region.id];
    if (bp) toggle(bp);
  }

  return (
    <div className="body-filter-panel">
      <div className="body-filter-columns">
        <div className="body-filter-col body-filter-col-left">
          {leftEntries.map(([bp, pos]) => (
            <BodyLabelRow
              key={bp}
              side="left"
              y={pos.y}
              label={getBodyPartLabel(bp, lang)}
              active={bodyPart === bp}
              onClick={() => toggle(bp)}
            />
          ))}
        </div>

        <div className="body-filter-silhouette">
          <div className="body-filter-hitarea" onClick={handleSilhouetteClick}>
            <HumanBody view={bodyView} highlightedMuscles={highlightedMuscles} />
          </div>
          <svg className="body-filter-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {entries.map(([bp, pos]) => (
              <line
                key={bp}
                x1={pos.x}
                y1={pos.y}
                x2={pos.side === "left" ? 0 : 100}
                y2={pos.y}
                className={bodyPart === bp ? "active" : ""}
              />
            ))}
          </svg>
          {entries.map(([bp, pos]) => (
            <button
              key={bp}
              className={`body-marker ${bodyPart === bp ? "active" : ""}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => toggle(bp)}
              aria-label={getBodyPartLabel(bp, lang)}
            />
          ))}
        </div>

        <div className="body-filter-col body-filter-col-right">
          {rightEntries.map(([bp, pos]) => (
            <BodyLabelRow
              key={bp}
              side="right"
              y={pos.y}
              label={getBodyPartLabel(bp, lang)}
              active={bodyPart === bp}
              onClick={() => toggle(bp)}
            />
          ))}
        </div>
      </div>

      <div className="body-filter-footer">
        <button
          className={`chip ${bodyPart === "cardio" ? "active" : ""}`}
          onClick={() => toggle("cardio")}
        >
          {getBodyPartLabel("cardio", lang)}
        </button>
        <button
          className="btn btn-ghost body-rotate-btn"
          onClick={() => setBodyView(bodyView === "front" ? "back" : "front")}
        >
          <RotateCcw size={14} />
          {t.rotateBody}
        </button>
      </div>
    </div>
  );
}
