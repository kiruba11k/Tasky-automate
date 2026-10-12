/** Colour-banded card wrapping one project's tasks on the dashboard. */
export function ProjectCard({ color, title, meta, children }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
      style={{ borderLeft: `6px solid ${color}` }}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ background: `${color}14` }}>
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <p className="flex-1 font-bold">{title}</p>
        {meta && <span className="text-xs font-medium text-muted">{meta}</span>}
      </div>
      {children}
    </div>
  );
}

export default ProjectCard;
