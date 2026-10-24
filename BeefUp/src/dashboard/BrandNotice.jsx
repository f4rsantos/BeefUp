import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { useApp } from "../context/useApp";
import { useBrand } from "../lib/useBrand";
import { refreshOwnBrand } from "../lib/brand";
import { db } from "../lib/db";

const DISMISSED_KEY = "brand:noticeDismissed";

// Points a trainer with no brand to Definições.
export default function BrandNotice({ onOpen }) {
  const { t } = useApp();
  const brand = useBrand();
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      refreshOwnBrand().then(() => true, () => false),
      db.getSetting(DISMISSED_KEY, false),
    ]).then(([ok, done]) => {
      if (cancelled) return;
      setChecked(ok);
      setDismissed(!!done);
    });
    return () => { cancelled = true; };
  }, []);

  if (!checked || brand || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    db.setSetting(DISMISSED_KEY, true);
  }

  return (
    <div className="dash-schema-banner" role="status">
      <Palette size={18} className="dash-schema-banner-icon" style={{ color: "var(--accent)" }} aria-hidden="true" />
      <div className="dash-schema-banner-text">
        <p className="dash-schema-banner-title">{t.brandNoticeTitle}</p>
        <p className="dash-schema-banner-body">{t.brandNoticeBody}</p>
      </div>
      <div className="dash-schema-banner-actions">
        <button className="btn btn-primary text-sm" onClick={onOpen}>{t.brandNoticeOpen}</button>
        <button className="btn btn-ghost text-sm" onClick={dismiss}>{t.brandNoticeLater}</button>
      </div>
    </div>
  );
}
