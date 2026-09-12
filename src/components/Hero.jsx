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

export default function Hero({
  teams,
  matches,
  syncStatus,
  onlineVisitors,
  isAdmin,
}) {
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
  ];

  return (
    <section className="border-b border-[var(--line)] bg-[var(--panel)]">
      <div className="mx-auto max-w-6xl px-5 py-5 sm:py-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <span>BSIS Intramurals</span>
              <span className="h-1 w-1 bg-ember-500" />
              <span>2026</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-[var(--text)] sm:text-2xl">
              Mobile Legends: Bang Bang
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>Regular season</span>
              <span aria-hidden="true">/</span>
              <span>Week {currentWeek}</span>
              <span className={`ml-1 inline-flex items-center gap-1.5 font-medium ${SYNC_COLOR[syncStatus]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${SYNC_DOT[syncStatus]}`} />
                {SYNC_LABEL[syncStatus]}
              </span>
              {isAdmin && onlineVisitors !== null && (
                <span className="text-[var(--text-muted)]">{onlineVisitors} viewing</span>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 border-y border-[var(--line)] sm:min-w-[320px] sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-3 py-2.5 odd:border-r odd:border-[var(--line)] [&:nth-child(-n+2)]:border-b [&:nth-child(-n+2)]:border-[var(--line)] sm:border-b-0 sm:odd:border-r-0 sm:border-l sm:border-[var(--line)] sm:first:border-l-0 sm:px-4">
                <dt className="text-[9px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {s.label}
                </dt>
                <dd className={`mt-1 text-base font-semibold tabular-nums ${s.accent ? "text-ember-500" : "text-[var(--text)]"}`}>
                  {s.val}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
