import { TeamLogo, SectionLabel, EmptyState, SkeletonBlock } from "./shared";
import { formatMatchDate, getTournamentStartDate, getWeekNumber } from "../lib/schedule";

export default function Matches({ matches, getTeam, loading }) {
  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:grid-cols-2">
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  const completed = matches
    .filter((m) => m.status === "completed")
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.completedAt || a.date || 0).getTime() || 0;
      const bTime = new Date(b.completedAt || b.date || 0).getTime() || 0;
      return bTime - aTime || Number(b.num) - Number(a.num);
    });
  const upcoming = matches.filter((m) => m.status === "upcoming");
  const tournamentStartDate = getTournamentStartDate(matches);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:grid-cols-2">
      <div>
        <SectionLabel>Completed</SectionLabel>
        <div className="space-y-2.5">
          {completed.length ? (
            completed.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                getTeam={getTeam}
                week={getWeekNumber(m.date, tournamentStartDate)}
                isResult
              />
            ))
          ) : (
            <EmptyState title="No completed matches" />
          )}
        </div>
      </div>
      <div>
        <SectionLabel>Upcoming</SectionLabel>
        <div className="space-y-2.5">
          {upcoming.length ? (
            upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                getTeam={getTeam}
                week={getWeekNumber(m.date, tournamentStartDate)}
              />
            ))
          ) : (
            <EmptyState title="All matches complete" />
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match: m, getTeam, week, isResult }) {
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;
  const aWin = isResult && m.scoreA > m.scoreB;

  return (
    <div className="relative overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-500/40 hover:shadow-[0_14px_26px_rgba(15,23,42,0.08)]">
      <span
        className={`absolute left-0 top-0 h-full w-[3px] ${
          isResult ? (aWin ? "bg-ember-500" : "bg-ink-600") : "bg-ember-500"
        }`}
      />
      <div className="mb-3 flex items-center justify-between gap-2 font-mono text-[9px] font-bold uppercase tracking-wider">
        <span className="text-[var(--text-muted)]">
          Match {m.num} · Week {week} · BO3
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 ${
            isResult
              ? "border-ember-500/20 bg-ember-500/10 text-ember-400"
              : "border-ember-500/20 bg-ember-500/10 text-ember-500"
          }`}
        >
          {isResult ? "Final" : "Upcoming"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <TeamBlock team={ta} dim={isResult && !aWin} />
        <div className="flex min-w-[74px] items-center justify-center gap-2">
          {isResult ? (
            <>
              <span
                className={`font-display text-2xl font-black leading-none ${aWin ? "text-ember-500" : "text-[var(--text-muted)]"}`}
              >
                {m.scoreA}
              </span>
              <span className="text-xs font-bold text-[var(--text-faint)]">
                :
              </span>
              <span
                className={`font-display text-2xl font-black leading-none ${!aWin ? "text-ember-500" : "text-[var(--text-muted)]"}`}
              >
                {m.scoreB}
              </span>
            </>
          ) : (
            <span className="rounded-sm border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
              VS
            </span>
          )}
        </div>
        <TeamBlock team={tb} dim={isResult && aWin} reverse />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-faint)]">
          {isResult ? "Result" : "Scheduled"}
        </div>
        <div
          className={`text-right text-[9px] font-bold uppercase tracking-wider ${isResult ? "text-[var(--text-muted)]" : "text-ember-500"}`}
        >
          {isResult ? `${aWin ? ta.abbr : tb.abbr} wins` : `${formatMatchDate(m.date)} · ${m.time || "Time TBD"}`}
        </div>
      </div>
    </div>
  );
}

function TeamBlock({ team, dim, reverse }) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1 ${dim ? "opacity-40" : ""}`}
    >
      <TeamLogo team={team} size={32} fontSize={10} />
      <div className="text-xs font-black tracking-[0.08em] text-[var(--text)]">
        {team.abbr}
      </div>
      <div className="hidden text-[9px] text-[var(--text-muted)] sm:block">
        {team.name.split(" ").slice(0, 2).join(" ")}
      </div>
    </div>
  );
}
