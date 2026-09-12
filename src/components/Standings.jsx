import { useEffect, useRef, useState } from "react";
import { ClipboardPenLine, Pencil, Trash2 } from "lucide-react";
import { calcStandings } from "../lib/standings";
import { getTournamentStartDate, getWeekNumber } from "../lib/schedule";
import {
  TeamLogo,
  SectionLabel,
  EmptyState,
  SkeletonBlock,
  FormDots,
} from "./shared";

const COLS = ["RANK", "Team", "MP", "W-L", "GW", "GL", "+/-", "Form", "PTS"];

export default function Standings({
  teams,
  matches,
  getTeam,
  loading,
  isAdmin = false,
  onEnterResult,
  onEditMatch,
  onDeleteMatch,
}) {
  const [showAllResults, setShowAllResults] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const standingsRef = useRef(null);

  useEffect(() => {
    if (expandedTeamId === null) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      const clickedRow =
        target instanceof Element ? target.closest("[data-team-row]") : null;

      if (!clickedRow) {
        if (standingsRef.current && !standingsRef.current.contains(target)) {
          setExpandedTeamId(null);
          return;
        }

        setExpandedTeamId(null);
        return;
      }

      if (clickedRow.dataset.teamId !== String(expandedTeamId)) {
        setExpandedTeamId(null);
      }
    };

    const handleScroll = () => {
      setExpandedTeamId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [expandedTeamId]);

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
    .slice()
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.date || 0).getTime() -
        new Date(a.completedAt || a.date || 0).getTime(),
    );
  const visibleResults = showAllResults ? latest : latest.slice(0, 3);
  const tournamentStartDate = getTournamentStartDate(matches);
  const upcoming = matches
    .filter((m) => m.status === "upcoming")
    .slice()
    .sort((a, b) => {
      const aTime = parseMatchDate(a.date, a.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseMatchDate(b.date, b.time)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime || Number(a.num) - Number(b.num);
    })
    .slice(0, 3);

  return (
    <div
      ref={standingsRef}
      className="mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[1fr_320px]"
    >
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-ember-500 shadow-[0_0_10px_rgba(255,120,56,0.7)]" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ember-400">
            Standings
          </span>
        </div>
        {standings.length ? (
          <div className="overflow-hidden rounded-xl border border-ember-500/20 bg-[linear-gradient(180deg,var(--accent-soft),var(--panel))] shadow-[0_12px_24px_rgba(15,23,42,0.12)]">
            <div className="hidden grid-cols-[32px_1fr_32px_44px_36px_36px_40px_48px_44px] gap-1 bg-[rgba(17,24,39,0.9)] px-4 py-2.5 sm:grid">
              <div className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {COLS[0]}
              </div>
              <div className="pl-3 text-left text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {COLS[1]}
              </div>
              {COLS.slice(2).map((c) => (
                <div
                  key={c}
                  className="text-center text-[9px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]"
                >
                  {c}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[28px_minmax(0,1fr)_24px_34px_24px_24px_34px] items-center gap-1 bg-[var(--panel-soft)] px-2 py-1.5 text-center text-[7px] font-black uppercase tracking-[0.08em] text-[var(--text-muted)] sm:hidden">
              <span className="text-center">Rank</span>
              <span className="text-left">Team</span>
              <span>MP</span>
              <span>W-L</span>
              <span>GW</span>
              <span>GL</span>
              <span className="text-center">Pts</span>
            </div>
            {standings.map((s) => {
              const team = getTeam(s.id);
              if (!team) return null;
              const rank = s.rank;
              return (
                <div
                  key={s.id}
                  data-team-row
                  data-team-id={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setExpandedTeamId((current) =>
                      current === s.id ? null : s.id,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedTeamId((current) =>
                        current === s.id ? null : s.id,
                      );
                    }
                  }}
                  className={`relative grid grid-cols-[28px_minmax(0,1fr)_24px_34px_24px_24px_34px] items-center gap-1 border-t border-[var(--line)] px-2 py-3 first:border-t-0 transition-all duration-200 hover:border-ember-500/30 hover:bg-[var(--panel-soft)] hover:shadow-[inset_0_0_0_1px_rgba(255,90,31,0.06)] sm:grid-cols-[32px_1fr_32px_44px_36px_36px_40px_48px_44px] sm:gap-1 sm:px-4 sm:py-0 sm:min-h-[56px] ${
                    rank === 1
                      ? "bg-[linear-gradient(90deg,var(--accent-soft),rgba(255,120,56,0.02))] hover:bg-[linear-gradient(90deg,rgba(255,120,56,0.14),rgba(255,120,56,0.04))]"
                      : rank === 2
                        ? "bg-[rgba(148,163,184,0.03)]"
                        : rank === 3
                          ? "bg-[rgba(245,158,11,0.03)]"
                          : "bg-[var(--panel)]"
                  } ${expandedTeamId === s.id ? "shadow-[inset_0_0_0_1px_rgba(255,120,56,0.2)]" : ""}`}
                >
                  <span
                    className={`absolute left-0 top-0 h-full w-[3px] ${
                      rank === 1
                        ? "bg-ember-500 shadow-[0_0_16px_rgba(255,120,56,0.6)]"
                        : rank === 2
                          ? "bg-slate-400"
                          : rank === 3
                            ? "bg-amber-500"
                            : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-center text-sm font-black ${
                      rank === 1
                        ? "bg-ember-500/15 text-ember-500 ring-1 ring-ember-500/35 shadow-[0_0_0_1px_rgba(255,120,56,0.18)]"
                        : rank === 2
                          ? "bg-slate-300 text-slate-700 ring-1 ring-slate-400/80 shadow-[0_0_0_1px_rgba(148,163,184,0.2)]"
                          : rank === 3
                            ? "bg-amber-200 text-amber-800 ring-1 ring-amber-500/60 shadow-[0_0_0_1px_rgba(245,158,11,0.18)]"
                            : "bg-[var(--panel-soft)] text-[var(--text-muted)] ring-1 ring-[var(--line)]"
                    }`}
                  >
                    {rank}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo team={team} size={22} fontSize={7} />
                    <div className="min-w-0">
                      <div className="standings-short-name truncate text-[11px] font-black tracking-[0.08em] text-[var(--text)]">
                        {team.abbr}
                      </div>
                      <div className="hidden truncate text-[9px] text-[var(--text-muted)] sm:block">
                        {team.name}
                      </div>
                    </div>
                  </div>
                  <MobileCell>{s.mp}</MobileCell>
                  <MobileCell className="text-rift-500">{s.w}-{s.l}</MobileCell>
                  <MobileCell>{s.gw}</MobileCell>
                  <MobileCell>{s.gl}</MobileCell>
                  <MobileCell className="text-ember-500">{s.pts}</MobileCell>
                  <Cell hideOnMobile>{s.mp}</Cell>
                  <Cell hideOnMobile className="text-rift-500">{s.w}-{s.l}</Cell>
                  <Cell hideOnMobile>{s.gw}</Cell>
                  <Cell hideOnMobile>{s.gl}</Cell>
                  <Cell
                    hideOnMobile
                    className={
                      s.diff > 0
                        ? "text-rift-500"
                        : s.diff < 0
                          ? "text-blood-500"
                          : "text-[var(--text-muted)]"
                    }
                  >
                    {s.diff > 0 ? `+${s.diff}` : s.diff}
                  </Cell>
                  <div className="hidden justify-center sm:flex">
                    <FormDots form={s.form} />
                  </div>
                  <div className="relative hidden items-center justify-center sm:flex">
                    <div className="text-center text-[12px] font-black text-ember-500 sm:text-sm">
                      {s.pts}
                    </div>
                    <span
                      className={`absolute -right-0.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] transition-transform duration-200 sm:hidden ${
                        expandedTeamId === s.id ? "rotate-180" : ""
                      }`}
                    >
                      ▾
                    </span>
                  </div>

                  {expandedTeamId === s.id && (
                    <div className="col-span-full mt-2 grid grid-cols-3 gap-2 rounded-sm border border-[var(--line)] bg-[var(--panel-soft)] p-2 sm:hidden">
                      {[
                        ["MP", s.mp],
                        ["W-L", `${s.w}-${s.l}`],
                        ["GW", s.gw],
                        ["GL", s.gl],
                        ["+/-", s.diff > 0 ? `+${s.diff}` : s.diff],
                        ["Form", <FormDots key="form" form={s.form} />],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-sm border border-[var(--line)] bg-[var(--panel)] px-1.5 py-2 text-center"
                        >
                          <div className="text-[7px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {label}
                          </div>
                          <div className="mt-1 text-[11px] font-bold text-[var(--text)]">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No teams yet" />
        )}
        <p className="mt-2 px-1 text-[10px] text-[var(--text-muted)]">
          Sorted by points → wins → game differential → game wins
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg border border-ember-500/20 bg-[linear-gradient(180deg,var(--accent-soft),var(--panel-soft))] p-2.5 shadow-[0_8px_18px_rgba(255,120,56,0.08)]">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="inline-flex h-2 w-2 rounded-full bg-ember-500 shadow-[0_0_12px_rgba(255,120,56,0.7)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-ember-400">
              Next up
            </span>
          </div>
          <div className="space-y-2.5">
            {upcoming.length ? (
              upcoming.map((m) => (
                <UpcomingCard
                  key={m.id}
                  match={m}
                  getTeam={getTeam}
                  week={getWeekNumber(m.date, tournamentStartDate)}
                  isAdmin={isAdmin}
                  onEnterResult={onEnterResult}
                  onEditMatch={onEditMatch}
                  onDeleteMatch={onDeleteMatch}
                />
              ))
            ) : (
              <EmptyState title="No upcoming matches" />
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)]/70 p-2.5">
          <div className="mb-2 px-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              All results
            </span>
          </div>
          <div className="mb-3">
            <div className="space-y-2.5">
              {visibleResults.length ? (
                visibleResults.map((m) => (
                  <ResultCard
                    key={m.id}
                    match={m}
                    getTeam={getTeam}
                    week={getWeekNumber(m.date, tournamentStartDate)}
                  />
                ))
              ) : (
                <EmptyState title="No results yet" />
              )}
            </div>
          </div>
          {latest.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllResults((current) => !current)}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-ink-700 bg-ink-800/50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-ink-500 transition-all duration-200 hover:border-ember-500/50 hover:bg-ember-500/5 hover:text-ember-400"
            >
              <span>{showAllResults ? "Show less" : "Show all"}</span>
              <span
                className={`text-[10px] leading-none transition-transform duration-200 ${
                  showAllResults ? "rotate-180" : ""
                }`}
              >
                ↓
              </span>
            </button>
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

function ResultCard({ match: m, getTeam, week }) {
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;
  const aWin = m.scoreA > m.scoreB;
  return (
    <div className="group relative overflow-hidden rounded-sm border border-ink-800 bg-ink-900 p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-500/40 hover:shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-ink-700 transition-colors duration-200 group-hover:bg-ember-500" />
      <div className="mb-1 flex justify-between font-mono text-[8px] font-bold uppercase tracking-wider text-ink-600">
        <span>
          Match {m.num} · Week {week} · BO3
        </span>
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <TeamCol team={ta} score={m.scoreA} winner={aWin} />
        <div className="text-[9px] font-bold text-ink-700">:</div>
        <TeamCol team={tb} score={m.scoreB} winner={!aWin} />
      </div>
      <div className="mt-1 text-center text-[8px] font-bold uppercase tracking-wider text-ink-600">
        Final · BO3 · {aWin ? ta.abbr : tb.abbr} wins
      </div>
    </div>
  );
}

function TeamCol({ team, score, winner }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <TeamLogo team={team} size={22} fontSize={7} />
      <div
        className={`text-[9px] font-bold ${winner ? "text-white" : "text-ink-600"}`}
      >
        {team.abbr}
      </div>
      <div
        className={`font-display text-base font-bold ${winner ? "text-ember-500" : "text-ink-700"}`}
      >
        {score}
      </div>
    </div>
  );
}

function UpcomingCard({
  match: m,
  getTeam,
  week,
  isAdmin,
  onEnterResult,
  onEditMatch,
  onDeleteMatch,
}) {
  const [deleting, setDeleting] = useState(false);
  const ta = getTeam(m.teamA);
  const tb = getTeam(m.teamB);
  if (!ta || !tb) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Delete Match ${m.num}? This cannot be undone.`)) return;
    setDeleting(true);
    await onDeleteMatch?.(m);
    setDeleting(false);
  };
  return (
    <div className="group relative overflow-hidden rounded-md border border-ink-800 bg-ink-900 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ember-500/40 hover:shadow-[0_12px_20px_rgba(0,0,0,0.08)]">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-ember-500 transition-colors duration-200 group-hover:bg-amber-400" />
      <div className="mb-2 flex justify-between font-mono text-[9px] font-bold uppercase tracking-wider text-ink-600">
        <span>
          Match {m.num} · Week {week} · BO3
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
          <span>Upcoming · BO3</span>
        </span>
        <LiveCountdown date={m.date} time={m.time} />
      </div>
      {isAdmin && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onEnterResult?.(m)}
            aria-label="Input result"
            title="Input result"
            className="flex min-h-8 items-center justify-center rounded-sm border border-ember-500/40 bg-ember-500/10 px-1.5 py-2 text-ember-400 transition hover:bg-ember-500 hover:text-white sm:gap-1 sm:text-[8px] sm:font-black sm:uppercase sm:tracking-[0.12em]"
          >
            <ClipboardPenLine size={14} className="sm:hidden" />
            <span className="hidden sm:inline">Input result</span>
          </button>
          <button
            type="button"
            onClick={() => onEditMatch?.(m)}
            aria-label="Edit match"
            title="Edit match"
            className="flex min-h-8 items-center justify-center rounded-sm border border-ink-700 bg-ink-800 px-1.5 py-2 text-ink-300 transition hover:border-ember-500/50 hover:text-ember-400 sm:gap-1 sm:text-[8px] sm:font-black sm:uppercase sm:tracking-[0.12em]"
          >
            <Pencil size={14} className="sm:hidden" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            aria-label="Delete match"
            title="Delete match"
            className="flex min-h-8 items-center justify-center rounded-sm border border-blood-500/35 bg-blood-500/10 px-1.5 py-2 text-blood-500 transition hover:bg-blood-500 hover:text-white disabled:opacity-50 sm:gap-1 sm:text-[8px] sm:font-black sm:uppercase sm:tracking-[0.12em]"
          >
            {deleting ? (
              <span className="text-[8px] font-black uppercase sm:text-inherit">Deleting…</span>
            ) : (
              <>
                <Trash2 size={14} className="sm:hidden" />
                <span className="hidden sm:inline">Delete</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function MobileCell({ children, className = "" }) {
  return (
    <div className={`text-center text-[10px] font-bold text-[var(--text)] sm:hidden ${className}`}>
      {children}
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
  const time24 = normalizedTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const hour24 = time24
    ? Number(time24[1])
    : matchTime
    ? Number(matchTime[1]) +
      (matchTime[3].toUpperCase() === "PM" && Number(matchTime[1]) !== 12
        ? 12
        : 0) +
      (matchTime[3].toUpperCase() === "AM" && Number(matchTime[1]) === 12
        ? -12
        : 0)
    : 19;
  const minute = time24 ? Number(time24[2]) : matchTime ? Number(matchTime[2]) : 0;

  const dateString = `${date}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  const parsed = new Date(dateString);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
