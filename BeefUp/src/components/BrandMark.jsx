import { useBrand } from "../lib/useBrand";

// Trainer logo and name, else fallback text.
export default function BrandMark({ size = 28, fallback = "", className = "" }) {
  const brand = useBrand();
  const name = brand?.name || fallback;
  if (!brand?.logo && !name) return null;
  return (
    <span className={`brand-mark ${className}`}>
      {brand?.logo && <img src={brand.logo} alt="" width={size} height={size} className="brand-logo" />}
      {name && <span className="brand-mark-name">{name}</span>}
    </span>
  );
}
