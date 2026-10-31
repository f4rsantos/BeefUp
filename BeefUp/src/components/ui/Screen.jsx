import { useDockScroll } from "./DockContext";

export default function Screen({ children, gap, className = "", scrollClassName = "", after }) {
  const onScroll = useDockScroll();
  return (
    <div className={`screen ${className}`}>
      <div
        className={`screen-scroll fade-in ${scrollClassName}`}
        style={gap != null ? { "--screen-gap": `${gap}px` } : undefined}
        onScroll={onScroll}
      >
        {children}
      </div>
      {after}
    </div>
  );
}
