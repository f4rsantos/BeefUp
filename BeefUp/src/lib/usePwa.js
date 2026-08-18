import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

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

function dismissedRecently() {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return at > 0 && Date.now() - at < DISMISS_MS;
}

export default function usePwa() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    if (isStandalone()) return;

    function onBeforeInstallPrompt(e) {
      // Chrome fires this when the app meets the installability criteria.
      // Keeping the event lets us show our own button instead of the mini-infobar.
      e.preventDefault();
      if (!dismissedRecently()) setInstallPrompt(e);
    }

    function onInstalled() {
      setInstallPrompt(null);
      setShowIosHint(false);
      localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no beforeinstallprompt, so the only option is to explain the manual flow.
    if (isIos() && !dismissedRecently()) setShowIosHint(true);

    return () => {
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
    if (outcome === "dismissed") localStorage.setItem(DISMISS_KEY, String(Date.now()));
    return outcome === "accepted";
  }

  function dismissInstall() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
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
