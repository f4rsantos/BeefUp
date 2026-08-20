function SkeletonBlock({ height, style }) {
  return <div className="shimmer" style={{ height, borderRadius: 20, flexShrink: 0, ...style }} />;
}

export default function ProfileSkeleton() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg)" }}>
      <div
        className="flex-1 overflow-y-auto pb-4 flex flex-col gap-4 scrollbar-hide"
        style={{ paddingTop: "var(--page-py-top)", paddingLeft: "var(--page-px)", paddingRight: "var(--page-px)" }}
      >
        <SkeletonBlock height={30} style={{ width: 140, borderRadius: 10 }} />
        <SkeletonBlock height={44} style={{ borderRadius: 14 }} />
        <SkeletonBlock height={110} style={{ borderRadius: 24 }} />
        <SkeletonBlock height={140} />
        <SkeletonBlock height={220} />
        <SkeletonBlock height={140} />
      </div>
    </div>
  );
}
