import { useBrand } from "../lib/useBrand";
import BrandMark from "./BrandMark";

// Small trainer mark above a page title.
export default function BrandStrip() {
  const brand = useBrand();
  if (!brand || (!brand.name && !brand.logo)) return null;
  return (
    <div className="brand-strip">
      <BrandMark />
    </div>
  );
}
