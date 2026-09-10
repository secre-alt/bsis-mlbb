import { getColor } from '../lib/standings';

export function TeamLogo({ team, size = 28, fontSize = 9 }) {
  const c = getColor(team);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold"
      style={{ width: size, height: size, background: c.bg, color: c.text, fontSize }}
    >
      {team.abbr.slice(0, 3)}
    </div>
  );
}

export function SectionLabel({ children }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-500">
      {children}
      <span className="h-px flex-1 bg-ink-800" />
    </div>
  );
}

export function EmptyState({ title, sub }) {
  return (
    <div className="rounded-md border border-dashed border-ink-800 px-5 py-10 text-center">
      <div className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</div>
      {sub && <div className="mt-1 text-[11px] text-ink-700">{sub}</div>}
    </div>
  );
}

export function SkeletonBlock({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-md border border-ink-800">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="h-[52px] animate-shimmer border-b border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%] last:border-b-0"
        />
      ))}
    </div>
  );
}

export function FormDots({ form }) {
  const last5 = form.slice(-5);
  if (!last5.length) return <span className="text-ink-700">—</span>;
  return (
    <div className="flex items-center justify-center gap-1">
      {last5.map((r, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${r === 'W' ? 'bg-rift-500' : 'bg-blood-500'}`}
        />
      ))}
    </div>
  );
}
