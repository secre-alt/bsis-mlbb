const SYNC_LABEL = {
  ok: "Live",
  err: "Offline",
  syncing: "Syncing",
  idle: "",
  offline: "Offline",
};
const SYNC_COLOR = {
  ok: "text-rift-500",
  err: "text-blood-500",
  syncing: "text-ember-400",
  idle: "text-ink-500",
  offline: "text-blood-500",
};
const SYNC_DOT = {
  ok: "bg-rift-500",
  err: "bg-blood-500",
  syncing: "bg-ember-500 animate-pulse-dot",
  idle: "bg-ink-600",
  offline: "bg-blood-500",
};

function getStartOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekNumber(dateString, tournamentStartDate) {
  if (!dateString || !tournamentStartDate) return 1;

  const start = getStartOfWeek(tournamentStartDate);
  const current = getStartOfWeek(dateString);
  const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));

  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export default function Hero({ teams, matches, syncStatus }) {
  const completed = matches.filter((m) => m.status === "completed").length;
  const upcoming = matches.filter((m) => m.status === "upcoming").length;
  const tournamentStartDate =
    matches
      .map((m) => m.date)
      .filter(Boolean)
      .sort()[0] ?? "2026-09-09";
  const currentWeek = getWeekNumber(
    new Date().toISOString().split("T")[0],
    tournamentStartDate,
  );

  const stats = [
    { val: teams.length, label: "Teams" },
    { val: matches.length, label: "Matches" },
    { val: completed, label: "Completed" },
    { val: upcoming, label: "Upcoming" },
    { val: `Week ${currentWeek}`, label: "Current week", accent: true },
  ];

  return (
    <div className="border-b border-[var(--line)] bg-[var(--panel)] bg-grid-fade">
      <div className="mx-auto max-w-6xl px-5 py-7">
        <p className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ember-500">
          Season 2026
        </p>
        <h1 className="font-display text-3xl font-bold uppercase leading-none tracking-tight text-[var(--text)] sm:text-4xl">
          BSIS MLBB Intramurals
        </h1>
        <p className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center rounded-full border border-ember-500/35 bg-ember-500/10 px-2 py-1 font-bold uppercase tracking-[0.14em] text-ember-400">
            Week {currentWeek}
          </span>
          <span className="text-[var(--text-soft)]">
            Round robin, single phase
          </span>
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${SYNC_COLOR[syncStatus]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${SYNC_DOT[syncStatus]}`}
            />
            {SYNC_LABEL[syncStatus]}
          </span>
        </p>
        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-4 border-t border-[var(--line)] pt-5">
          {stats.map((s) => (
            <div key={s.label}>
              <div
                className={`text-xl font-bold leading-none ${
                  s.accent ? "text-ember-500" : "text-[var(--text)]"
                }`}
              >
                {s.val}
              </div>
              <div className="mt-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
