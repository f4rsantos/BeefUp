import { useApp } from "../context/useApp";
import { useIsDesktop } from "../lib/useIsDesktop";
import { useSupabaseConfigured } from "../lib/useSupabaseConfig";
import { useBrand } from "../lib/useBrand";
import AppearancePanel from "../components/AppearancePanel";
import LargeTitle from "../components/ui/LargeTitle";
import BrandSettings from "./BrandSettings";

// The appearance preferences a trainer can actually use. Sound (there are no
// timers here), section visibility (there is no bottom nav), linking to a
// trainer (they are one) and the demo plan (it seeds a solo user's own
// workouts) all belong to the phone app, so they are deliberately absent.
export default function DashboardSettings() {
  const { t } = useApp();
  const configured = useSupabaseConfigured();
  const brand = useBrand();
  // Phone header already shows this title.
  const isDesktop = useIsDesktop();

  return (
    <div className="dash-cal">
      <div className="dash-settings">
        {isDesktop && <LargeTitle title={t.settingsTitle} />}
        {configured && <BrandSettings />}
        <AppearancePanel />
        {brand && <p className="brand-credit">{t.brandCredit}</p>}
      </div>
    </div>
  );
}
