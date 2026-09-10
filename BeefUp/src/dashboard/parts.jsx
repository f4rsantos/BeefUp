import { Lock } from "lucide-react";

// One empty state for the whole dashboard. A bare "—" reads as broken and is
// indistinguishable from loading, which is what this replaces.
export function Empty({ children }) {
  return <p className="dash-empty">{children}</p>;
}

// Loading has to look different from empty, or the trainer can't tell a slow
// network from a student with no data.
export function Skeleton({ rows = 3 }) {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer dash-skeleton-row" />
      ))}
    </div>
  );
}

// Authorship, the one rule that makes every list in the dashboard readable:
// an accent edge means the trainer wrote this row, nothing means it's the
// student's own. The lock is the student-owned counterpart of the edge.
export function AuthorBadge({ mine, t }) {
  if (mine) return <span className="dash-author">{t.dashPrescribedByYou}</span>;
  return (
    <span className="dash-author">
      <Lock size={11} /> {t.dashClientOwn}
    </span>
  );
}
