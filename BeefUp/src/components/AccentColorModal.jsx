import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PRESET_ACCENTS, hexToRgb, rgbToHex, hsvToRgb, rgbToHsv } from "../lib/colorTheme";

const WHEEL_SIZE = 180;
const RADIUS = WHEEL_SIZE / 2;

function drawWheel(canvas, value) {
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(WHEEL_SIZE, WHEEL_SIZE);
  for (let y = 0; y < WHEEL_SIZE; y++) {
    for (let x = 0; x < WHEEL_SIZE; x++) {
      const dx = x - RADIUS;
      const dy = y - RADIUS;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (y * WHEEL_SIZE + x) * 4;
      if (dist > RADIUS) {
        image.data[i + 3] = 0;
        continue;
      }
      let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (hue < 0) hue += 360;
      const sat = Math.min(1, dist / RADIUS);
      const { r, g, b } = hsvToRgb(hue, sat, value);
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export default function AccentColorModal({ value, onSelectPreset, onPickCustom, onClose, t }) {
  const canvasRef = useRef(null);
  const initialHsv = rgbToHsv(hexToRgb(value));
  const [brightness, setBrightness] = useState(initialHsv.v);
  const [marker, setMarker] = useState(() => {
    const r = initialHsv.s * RADIUS;
    const angle = (initialHsv.h * Math.PI) / 180;
    return { x: RADIUS + r * Math.cos(angle), y: RADIUS + r * Math.sin(angle) };
  });

  useEffect(() => {
    if (canvasRef.current) drawWheel(canvasRef.current, brightness);
  }, [brightness]);

  function pickAt(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - RADIUS;
    const dy = y - RADIUS;
    const dist = Math.min(RADIUS, Math.sqrt(dx * dx + dy * dy));
    let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    const sat = dist / RADIUS;
    const angle = (hue * Math.PI) / 180;
    setMarker({ x: RADIUS + dist * Math.cos(angle), y: RADIUS + dist * Math.sin(angle) });
    onPickCustom(rgbToHex(hsvToRgb(hue, sat, brightness)));
  }

  function handlePointer(e) {
    e.preventDefault();
    pickAt(e.clientX, e.clientY);
  }

  function handleBrightness(e) {
    const v = Number(e.target.value) / 100;
    setBrightness(v);
    const dx = marker.x - RADIUS;
    const dy = marker.y - RADIUS;
    const dist = Math.min(RADIUS, Math.sqrt(dx * dx + dy * dy));
    let hue = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    onPickCustom(rgbToHex(hsvToRgb(hue, dist / RADIUS, v)));
  }

  return (
    <div className="modal-overlay" style={{ alignItems: "center" }} onClick={onClose}>
      <div className="modal-center" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-base" style={{ color: "var(--text)" }}>
            {t.accentColor}
          </span>
          <button className="btn btn-ghost p-2" onClick={onClose} aria-label={t.cancel}>
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col items-center" style={{ flexShrink: 0 }}>
            <div
              style={{ position: "relative", width: WHEEL_SIZE, height: WHEEL_SIZE, touchAction: "none" }}
              onPointerDown={handlePointer}
              onPointerMove={(e) => e.buttons === 1 && handlePointer(e)}
            >
              <canvas
                ref={canvasRef}
                width={WHEEL_SIZE}
                height={WHEEL_SIZE}
                style={{ borderRadius: "50%", display: "block" }}
              />
              <div
                style={{
                  position: "absolute",
                  left: marker.x,
                  top: marker.y,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(brightness * 100)}
              onChange={handleBrightness}
              style={{ width: WHEEL_SIZE, marginTop: 14 }}
              aria-label={t.accentColor}
            />
          </div>

          <div className="flex flex-col gap-2" style={{ flex: 1, minWidth: 0 }}>
            {PRESET_ACCENTS.map(({ id, hex, label }) => (
              <button
                key={id}
                className="flex items-center gap-2"
                style={{ background: "none", border: "none", padding: "4px 2px", cursor: "pointer" }}
                onClick={() => onSelectPreset(id)}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: hex,
                    flexShrink: 0,
                    border: value === hex ? "2px solid var(--text)" : "2px solid transparent",
                  }}
                />
                <span className="text-xs truncate" style={{ color: "var(--text)" }}>{t[label]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
