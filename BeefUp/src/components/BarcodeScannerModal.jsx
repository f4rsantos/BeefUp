import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey } from "../lib/useEscapeKey";
import { X, ScanLine } from "lucide-react";
import { loadBarcodeDetector } from "../lib/barcodeDetector";
import { foodProvider } from "../lib/foodProvider";
import { RateLimitError } from "../lib/openFoodFacts";
import "./BarcodeScannerModal.css";

const SCAN_INTERVAL_MS = 300;
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export default function BarcodeScannerModal({ lang, t, onFound, onClose }) {
  useEscapeKey(onClose);
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

  return createPortal(
    <div role="dialog" aria-modal="true" className="modal-overlay bs-overlay">
      <div className="flex flex-col bs-stage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="bs-video"
        />

        <button
          className="btn-icon bs-close"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={22} color="#fff" />
        </button>

        {state === "scanning" && (
          <div className="bs-frame" />
        )}

        <div
          className="flex flex-col items-center gap-3 bs-footer"
        >
          {(state === "starting" || state === "looking") && (
            <p className="bs-msg">
              <ScanLine className="bs-icon" size={16} />
              {state === "starting" ? t.scanPreparingCamera : t.searchingFood}
            </p>
          )}
          {state === "scanning" && (
            <p className="bs-msg">{t.scanAimAtBarcode}</p>
          )}
          {state === "notfound" && (
            <>
              <p className="bs-msg">{t.scanProductNotFound}</p>
              <button className="btn btn-ghost py-2 px-4 text-sm" onClick={runLoop}>{t.scanTryAgain}</button>
            </>
          )}
          {state === "limited" && (
            <p className="bs-msg bs-msg-warn">{t.foodSearchLimit.replace("{n}", retryAfter)}</p>
          )}
          {state === "error" && (
            <>
              <p className="bs-msg bs-msg-error">{t.foodSearchFailed}</p>
              <button className="btn btn-ghost py-2 px-4 text-sm" onClick={runLoop}>{t.retry}</button>
            </>
          )}
          {state === "denied" && (
            <p className="bs-msg bs-msg-error bs-center">{t.scanCameraDenied}</p>
          )}
          {state === "nocamera" && (
            <p className="bs-msg bs-msg-error bs-center">{t.scanNoCamera}</p>
          )}
        </div>
      </div>
    </div>,
    document.querySelector(".app-shell") ?? document.body
  );
}
