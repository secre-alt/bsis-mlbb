import { TeamLogo, SectionLabel, EmptyState, SkeletonBlock } from "./shared";

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
    .reverse();
  const upcoming = matches.filter((m) => m.status === "upcoming");

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:grid-cols-2">
      <div>
        <SectionLabel>Completed</SectionLabel>
        <div className="space-y-2.5">
          {completed.length ? (
            completed.map((m) => (
              <MatchCard key={m.id} match={m} getTeam={getTeam} isResult />
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
              <MatchCard key={m.id} match={m} getTeam={getTeam} />
            ))
          ) : (
            <EmptyState title="All matches complete" />
          )}
        </div>
      </div>
    </div>
  );
}

function MatchCard({ match: m, getTeam, isResult }) {
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;
  const aWin = isResult && m.scoreA > m.scoreB;

  return (
    <div className="relative overflow-hidden rounded-md border border-ink-800 bg-ink-900 p-4">
      <span
        className={`absolute left-0 top-0 h-full w-[3px] ${
          isResult ? (aWin ? "bg-ember-500" : "bg-ink-600") : "bg-ember-500"
        }`}
      />
      <div className="mb-3 flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-ink-600">
        <span>
          Match {m.num} · Round {m.round} · BO3
        </span>
        <span>
          {m.date || ""} {m.time || ""}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <TeamBlock team={ta} dim={isResult && !aWin} />
        <div className="flex items-center gap-2">
          {isResult ? (
            <>
              <span
                className={`font-display text-2xl font-bold ${aWin ? "text-ember-500" : "text-ink-700"}`}
              >
                {m.scoreA}
              </span>
              <span className="text-xs text-ink-700">:</span>
              <span
                className={`font-display text-2xl font-bold ${!aWin ? "text-ember-500" : "text-ink-700"}`}
              >
                {m.scoreB}
              </span>
            </>
          ) : (
            <span className="rounded-sm bg-ink-800 px-3 py-1.5 text-[10px] font-bold text-ink-500">
              VS
            </span>
          )}
        </div>
        <TeamBlock team={tb} dim={isResult && aWin} reverse />
      </div>
      <div
        className={`mt-3 text-center text-[9px] font-bold uppercase tracking-wider ${isResult ? "text-ink-600" : "text-ember-500"}`}
      >
        {isResult
          ? `Final · BO3 · ${aWin ? ta.abbr : tb.abbr} wins`
          : `Upcoming · BO3 · ${m.time || ""}`}
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
      <div className="text-xs font-bold">{team.abbr}</div>
      <div className="hidden text-[9px] text-ink-600 sm:block">
        {team.name.split(" ").slice(0, 2).join(" ")}
      </div>
    </div>
  );
}
