import { useEffect, useState, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import { getPref, setPref } from "./prefs";

const DISMISS_KEY = "pwaInstallDismissedAt";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 14; // ask again after two weeks

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari does not implement display-mode, it sets navigator.standalone.
    window.navigator.standalone === true
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac, so also check for touch.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function dismissedRecently(at) {
  return at > 0 && Date.now() - at < DISMISS_MS;
}

export default function usePwa() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);
  // `beforeinstallprompt` fires synchronously and cannot await a read, so the
  // dismissal timestamp is kept in a ref that the async load fills in.
  const dismissedAt = useRef(0);

  useEffect(() => {
    if (isStandalone()) return;

    let cancelled = false;

    function onBeforeInstallPrompt(e) {
      // Chrome fires this when the app meets the installability criteria.
      // Keeping the event lets us show our own button instead of the mini-infobar.
      e.preventDefault();
      if (!dismissedRecently(dismissedAt.current)) setInstallPrompt(e);
    }

    function onInstalled() {
      setInstallPrompt(null);
      setShowIosHint(false);
      dismissedAt.current = 0;
      setPref(DISMISS_KEY, 0);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    getPref(DISMISS_KEY, 0).then((at) => {
      if (cancelled) return;
      dismissedAt.current = Number(at) || 0;
      // iOS has no beforeinstallprompt, so the only option is to explain the manual flow.
      if (isIos() && !dismissedRecently(dismissedAt.current)) setShowIosHint(true);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onOfflineReady: () => setOfflineReady(true),
    });
    setUpdateSW(() => update);
  }, []);

  async function install() {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (outcome === "dismissed") {
      dismissedAt.current = Date.now();
      setPref(DISMISS_KEY, dismissedAt.current);
    }
    return outcome === "accepted";
  }

  function dismissInstall() {
    dismissedAt.current = Date.now();
    setPref(DISMISS_KEY, dismissedAt.current);
    setInstallPrompt(null);
    setShowIosHint(false);
  }

  function applyUpdate() {
    setNeedRefresh(false);
    if (updateSW) updateSW(true);
  }

  return {
    canInstall: Boolean(installPrompt),
    showIosHint,
    install,
    dismissInstall,
    needRefresh,
    applyUpdate,
    offlineReady,
    dismissOfflineReady: () => setOfflineReady(false),
  };
}
