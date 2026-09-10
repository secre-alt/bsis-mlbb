import { useEffect, useState } from "react";
import { calcStandings } from "../lib/standings";
import {
  TeamLogo,
  SectionLabel,
  EmptyState,
  SkeletonBlock,
  FormDots,
} from "./shared";

const COLS = ["#", "Team", "MP", "W", "L", "GW", "GL", "+/-", "Form", "PTS"];

export default function Standings({ teams, matches, getTeam, loading }) {
  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[1fr_320px]">
        <SkeletonBlock />
        <div />
      </div>
    );
  }

  const standings = calcStandings(teams, matches);
  const latest = matches
    .filter((m) => m.status === "completed")
    .slice(-3)
    .reverse();
  const upcoming = matches.filter((m) => m.status === "upcoming").slice(0, 3);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[1fr_320px]">
      <div>
        <SectionLabel>Standings</SectionLabel>
        {standings.length ? (
          <div className="overflow-hidden rounded-md border border-ink-800">
            <div className="hidden grid-cols-[32px_1fr_32px_32px_32px_36px_36px_40px_48px_44px] gap-1 bg-ink-950 px-4 py-2 sm:grid">
              {COLS.map((c, i) => (
                <div
                  key={c}
                  className={`text-[9px] font-bold uppercase tracking-wider text-ink-600 ${
                    i === 1 ? "text-left" : "text-center"
                  }`}
                >
                  {c}
                </div>
              ))}
            </div>
            {standings.map((s, i) => {
              const team = getTeam(s.id);
              if (!team) return null;
              const rank = i + 1;
              return (
                <div
                  key={s.id}
                  className={`relative grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-ink-800 px-4 py-3 first:border-t-0 hover:bg-slate-200/80 sm:grid-cols-[32px_1fr_32px_32px_32px_36px_36px_40px_48px_44px] sm:gap-1 sm:py-0 sm:min-h-[52px] ${
                    rank === 1 ? "bg-ember-500/[0.06]" : ""
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-[3px] ${
                      rank === 1
                        ? "bg-ember-500"
                        : rank === 2
                          ? "bg-ink-500"
                          : rank === 3
                            ? "bg-amber-800"
                            : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`text-center text-sm font-bold ${rank === 1 ? "text-ember-500" : "text-ink-500"}`}
                  >
                    {rank}
                  </div>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TeamLogo team={team} />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">
                        {team.abbr}
                      </div>
                      <div className="truncate text-[10px] text-ink-500">
                        {team.name}
                      </div>
                    </div>
                  </div>
                  <Cell hideOnMobile>{s.mp}</Cell>
                  <Cell hideOnMobile className="text-rift-500">
                    {s.w}
                  </Cell>
                  <Cell hideOnMobile className="text-blood-500">
                    {s.l}
                  </Cell>
                  <Cell hideOnMobile>{s.gw}</Cell>
                  <Cell hideOnMobile>{s.gl}</Cell>
                  <Cell
                    hideOnMobile
                    className={
                      s.diff > 0
                        ? "text-rift-500"
                        : s.diff < 0
                          ? "text-blood-500"
                          : "text-ink-600"
                    }
                  >
                    {s.diff > 0 ? `+${s.diff}` : s.diff}
                  </Cell>
                  <div className="hidden justify-center sm:flex">
                    <FormDots form={s.form} />
                  </div>
                  <div className="text-center text-sm font-extrabold text-ember-500">
                    {s.pts}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No teams yet" />
        )}
        <p className="mt-2 px-1 text-[10px] text-ink-700">
          Sorted by points → wins → game differential → game wins
        </p>
      </div>

      <div>
        <SectionLabel>Latest results</SectionLabel>
        <div className="mb-6 space-y-2.5">
          {latest.length ? (
            latest.map((m) => (
              <ResultCard key={m.id} match={m} getTeam={getTeam} />
            ))
          ) : (
            <EmptyState title="No results yet" />
          )}
        </div>
        <SectionLabel>Next up</SectionLabel>
        <div className="space-y-2.5">
          {upcoming.length ? (
            upcoming.map((m) => (
              <UpcomingCard key={m.id} match={m} getTeam={getTeam} />
            ))
          ) : (
            <EmptyState title="No upcoming matches" />
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ children, className = "", hideOnMobile }) {
  return (
    <div
      className={`text-center text-xs font-semibold text-ink-300 ${hideOnMobile ? "hidden sm:block" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

function ResultCard({ match: m, getTeam }) {
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;
  const aWin = m.scoreA > m.scoreB;
  return (
    <div className="relative overflow-hidden rounded-md border border-ink-800 bg-ink-900 p-3.5">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-ink-700" />
      <div className="mb-2 flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-ink-600">
        <span>
          Match {m.num} · R{m.round}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <TeamCol team={ta} score={m.scoreA} winner={aWin} />
        <div className="text-[11px] font-bold text-ink-700">:</div>
        <TeamCol team={tb} score={m.scoreB} winner={!aWin} />
      </div>
      <div className="mt-2 text-center text-[9px] font-bold uppercase tracking-wider text-ink-600">
        Final · {aWin ? ta.abbr : tb.abbr} wins
      </div>
    </div>
  );
}

function TeamCol({ team, score, winner }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <TeamLogo team={team} size={30} fontSize={9} />
      <div
        className={`text-[11px] font-bold ${winner ? "text-white" : "text-ink-600"}`}
      >
        {team.abbr}
      </div>
      <div
        className={`font-display text-xl font-bold ${winner ? "text-ember-500" : "text-ink-700"}`}
      >
        {score}
      </div>
    </div>
  );
}

function UpcomingCard({ match: m, getTeam }) {
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;
  return (
    <div className="relative overflow-hidden rounded-md border border-ink-800 bg-ink-900 p-3.5">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-ember-500" />
      <div className="mb-2 flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-ink-600">
        <span>
          Match {m.num} · R{m.round}
        </span>
        <span className="text-ember-500">{m.time || ""}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TeamLogo team={ta} size={26} fontSize={8} />
          <span className="text-xs font-bold">{ta.abbr}</span>
        </div>
        <span className="rounded-sm bg-ink-800 px-2 py-1 text-[9px] font-bold text-ink-500">
          VS
        </span>
        <div className="flex flex-row-reverse items-center gap-2">
          <TeamLogo team={tb} size={26} fontSize={8} />
          <span className="text-xs font-bold">{tb.abbr}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-wider text-ember-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ember-500 shadow-[0_0_10px_rgba(255,90,31,0.7)]" />
          <span>Upcoming</span>
        </span>
        <LiveCountdown date={m.date} time={m.time} />
      </div>
    </div>
  );
}

function LiveCountdown({ date, time }) {
  const [label, setLabel] = useState(() => getCountdownLabel(date, time));

  useEffect(() => {
    const update = () => setLabel(getCountdownLabel(date, time));
    update();

    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [date, time]);

  return (
    <span className="inline-flex items-center rounded-full border border-ember-500/30 bg-ember-500/10 px-2 py-1 text-[10px] font-black tracking-[0.14em] text-ember-500">
      {label}
    </span>
  );
}

function getCountdownLabel(date, time) {
  if (!date) return "TBD";

  const target = parseMatchDate(date, time);
  if (!target) return "TBD";

  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "LIVE";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}D ${hours}H`;
  if (hours > 0) return `${hours}H ${minutes}M`;
  if (minutes > 0) return `${minutes}M ${seconds}S`;
  return `${seconds}S`;
}

function parseMatchDate(date, time) {
  if (!date) return null;

  const normalizedTime = (time || "7:00 PM").trim();
  const matchTime = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const hour24 = matchTime
    ? Number(matchTime[1]) +
      (matchTime[3].toUpperCase() === "PM" && Number(matchTime[1]) !== 12
        ? 12
        : 0) +
      (matchTime[3].toUpperCase() === "AM" && Number(matchTime[1]) === 12
        ? -12
        : 0)
    : 19;
  const minute = matchTime ? Number(matchTime[2]) : 0;

  const dateString = `${date}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const parsed = new Date(dateString);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
