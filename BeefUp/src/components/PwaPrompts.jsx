import { useApp } from "../context/AppContext";
import usePwa from "../lib/usePwa";
import { Download, RefreshCw, X } from "lucide-react";

function Banner({ Icon, title, desc, action, onAction, onDismiss, dismissLabel, aboveNav }) {
  return (
    <div
      className="fade-in"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        // Clear the bottom nav when it is showing, otherwise sit at the screen edge.
        bottom: aboveNav ? "calc(84px + env(safe-area-inset-bottom))" : "calc(12px + env(safe-area-inset-bottom))",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 14,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: 36,
          height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: "var(--accent-soft)",
          color: "var(--accent)",
        }}
      >
        <Icon size={18} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {desc}
        </p>
      </div>

      {action && (
        <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={onAction}>
          {action}
        </button>
      )}

      <button
        aria-label={dismissLabel}
        title={dismissLabel}
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          border: "none",
          borderRadius: 8,
          background: "transparent",
          color: "var(--muted)",
          cursor: "pointer",
        }}
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
