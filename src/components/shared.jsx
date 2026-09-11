import { getColor } from "../lib/standings";

export function TeamLogo({ team, size = 28, fontSize = 9 }) {
  const c = getColor(team);
  const monogramColor = team?.abbr?.toUpperCase() === "PAMP" ? "#fff" : c.text;
  const monogram = (team?.abbr || "?")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div
      role="img"
      aria-label={`${team?.name || team?.abbr || "Team"} monogram`}
      className="relative flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden shadow-[0_3px_10px_rgba(0,0,0,0.28)]"
        style={{
          background: c.bg,
          clipPath: "polygon(50% 0%, 94% 19%, 85% 77%, 50% 100%, 15% 77%, 6% 19%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-[12%]"
        style={{
          background: "rgba(8, 12, 20, 0.72)",
          clipPath: "polygon(50% 0%, 92% 20%, 81% 75%, 50% 100%, 19% 75%, 8% 20%)",
        }}
      />
      <span
        aria-hidden="true"
        className="absolute left-[21%] right-[21%] top-[20%] h-[8%]"
        style={{ background: c.bg, transform: "skewX(-24deg)" }}
      />
      {team?.logoUrl && (
        <img
          src={team.logoUrl}
          alt=""
          className="absolute inset-[12%] z-10 h-[76%] w-[76%] object-cover"
          style={{
            clipPath: "polygon(50% 0%, 92% 20%, 81% 75%, 50% 100%, 19% 75%, 8% 20%)",
          }}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <span
        className="relative z-10 font-display font-black leading-none tracking-[-0.12em]"
        style={{ color: monogramColor, fontSize, textShadow: "0 2px 3px rgba(0,0,0,0.5)" }}
      >
        {monogram}
      </span>
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
      <div className="text-xs font-bold uppercase tracking-wider text-ink-500">
        {title}
      </div>
      {sub && <div className="mt-1 text-[11px] text-ink-700">{sub}</div>}
    </div>
  );
}

export function SkeletonBlock({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--line)]">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="h-[52px] animate-shimmer border-b border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%] last:border-b-0"
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
          className={`h-1.5 w-1.5 rounded-full ${r === "W" ? "bg-rift-500" : "bg-blood-500"}`}
        />
      ))}
    </div>
  );
}
