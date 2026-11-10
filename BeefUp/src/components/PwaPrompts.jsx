import { useApp } from "../context/useApp";
import usePwa from "../lib/usePwa";
import { Download, RefreshCw, X } from "lucide-react";
import "./PwaPrompts.css";

function Banner({ Icon, title, desc, action, onAction, onDismiss, dismissLabel, aboveNav }) {
  return (
    <div
      className="fade-in glass pwa-banner"
      style={{ bottom: aboveNav ? "calc(var(--dock-h, 0px) + 12px)" : "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <div className="pwa-icon">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-body">
          {title}
        </p>
        <p className="text-xs text-muted">
          {desc}
        </p>
      </div>

      {action && (
        <button className="btn btn-primary flex-shrink-0" onClick={onAction}>
          {action}
        </button>
      )}

      <button className="text-muted pwa-dismiss"
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function PwaPrompts({ aboveNav = false }) {
  const { t } = useApp();
  const {
    canInstall,
    showIosHint,
    install,
    dismissInstall,
    needRefresh,
    applyUpdate,
  } = usePwa();

  // An available update matters more than an install invite, so it wins the slot.
  if (needRefresh) {
    return (
      <Banner
        Icon={RefreshCw}
        title={t.pwaUpdateTitle}
        desc={t.pwaUpdateDesc}
        action={t.pwaUpdate}
        onAction={applyUpdate}
        onDismiss={applyUpdate}
        dismissLabel={t.pwaDismiss}
        aboveNav={aboveNav}
      />
    );
  }

  if (canInstall) {
    return (
      <Banner
        Icon={Download}
        title={t.pwaInstallTitle}
        desc={t.pwaInstallDesc}
        action={t.pwaInstall}
        onAction={install}
        onDismiss={dismissInstall}
        dismissLabel={t.pwaDismiss}
        aboveNav={aboveNav}
      />
    );
  }

  if (showIosHint) {
    return (
      <Banner
        Icon={Download}
        title={t.pwaInstallTitle}
        desc={t.pwaInstallIosDesc}
        onDismiss={dismissInstall}
        dismissLabel={t.pwaDismiss}
        aboveNav={aboveNav}
      />
    );
  }

  return null;
}
