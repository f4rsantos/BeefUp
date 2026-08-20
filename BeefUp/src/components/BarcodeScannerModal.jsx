import { useEffect, useRef, useState } from "react";
import { X, ScanLine } from "lucide-react";
import { loadBarcodeDetector } from "../lib/barcodeDetector";
import { foodProvider } from "../lib/foodProvider";
import { RateLimitError } from "../lib/openFoodFacts";

const SCAN_INTERVAL_MS = 300;
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export default function BarcodeScannerModal({ lang, t, onFound, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const aliveRef = useRef(true);
  const [state, setState] = useState("starting"); // starting | scanning | looking | notfound | limited | error | denied | nocamera
  const [retryAfter, setRetryAfter] = useState(0);

  function runLoop() {
    clearInterval(intervalRef.current);
    setState("scanning");
    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !detectorRef.current) return;
      try {
        const codes = await detectorRef.current.detect(video);
        if (codes.length > 0) void handleCode(codes[0].rawValue);
      } catch {
        // frame ilegível, tenta a próxima
      }
    }, SCAN_INTERVAL_MS);
  }

  async function handleCode(code) {
    clearInterval(intervalRef.current);
    setState("looking");
    try {
      const food = await foodProvider.getByBarcode(code, lang);
      if (!aliveRef.current) return;
      if (food) {
        onFound(food);
      } else {
        setState("notfound");
      }
    } catch (err) {
      if (!aliveRef.current) return;
      if (err instanceof RateLimitError) {
        setRetryAfter(Math.max(1, Math.ceil(err.retryAfterMs / 1000)));
        setState("limited");
      } else {
        setState("error");
      }
    }
  }

  useEffect(() => {
    aliveRef.current = true;

    async function start() {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (err) {
        if (!aliveRef.current) return;
        setState(err?.name === "NotFoundError" ? "nocamera" : "denied");
        return;
      }
      if (!aliveRef.current) {
        stream.getTracks().forEach((tr) => tr.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const DetectorClass = await loadBarcodeDetector();
      if (!aliveRef.current) return;
      detectorRef.current = new DetectorClass({ formats: FORMATS });
      runLoop();
    }

    start();

    return () => {
      aliveRef.current = false;
      clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="flex flex-col" style={{ position: "absolute", inset: 0, background: "#000" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ flex: 1, objectFit: "cover", width: "100%" }}
        />

        <button
          className="btn-icon"
          onClick={onClose}
          aria-label={t.close}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(0,0,0,0.5)", borderRadius: 999, padding: 8,
          }}
        >
          <X size={22} color="#fff" />
        </button>

        {state === "scanning" && (
          <div
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "70%", maxWidth: 320, aspectRatio: "2 / 1",
              border: "2px solid rgba(255,255,255,0.8)", borderRadius: 12,
            }}
          />
        )}

        <div
          className="flex flex-col items-center gap-3"
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 20px 32px", background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}
        >
          {(state === "starting" || state === "looking") && (
            <p style={{ color: "#fff", fontSize: 14 }}>
              <ScanLine size={16} style={{ display: "inline", verticalAlign: -3, marginRight: 6 }} />
              {state === "starting" ? t.scanPreparingCamera : t.searchingFood}
            </p>
          )}
          {state === "scanning" && (
            <p style={{ color: "#fff", fontSize: 14 }}>{t.scanAimAtBarcode}</p>
          )}
          {state === "notfound" && (
            <>
              <p style={{ color: "#fff", fontSize: 14 }}>{t.scanProductNotFound}</p>
              <button className="btn btn-ghost py-2 px-4 text-sm" onClick={runLoop}>{t.scanTryAgain}</button>
            </>
          )}
          {state === "limited" && (
            <p style={{ color: "#fbbf24", fontSize: 14 }}>{t.foodSearchLimit.replace("{n}", retryAfter)}</p>
          )}
          {state === "error" && (
            <>
              <p style={{ color: "#f87171", fontSize: 14 }}>{t.foodSearchFailed}</p>
              <button className="btn btn-ghost py-2 px-4 text-sm" onClick={runLoop}>{t.retry}</button>
            </>
          )}
          {state === "denied" && (
            <p style={{ color: "#f87171", fontSize: 14, textAlign: "center" }}>{t.scanCameraDenied}</p>
          )}
          {state === "nocamera" && (
            <p style={{ color: "#f87171", fontSize: 14, textAlign: "center" }}>{t.scanNoCamera}</p>
          )}
        </div>
      </div>
    </div>
  );
}
