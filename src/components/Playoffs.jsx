import { useEffect, useState } from "react";
import { getPlayoffState, REGULAR_SEASON_MATCH_COUNT } from "../lib/playoffs";
import { EmptyState, SectionLabel, TeamLogo } from "./shared";

export default function Playoffs({ teams, matches, playoffMatches, getTeam, isAdmin, initializePlayoffs, createGrandFinal, submitPlayoffResult, loading }) {
  const [error, setError] = useState("");
  const state = getPlayoffState(teams, matches, playoffMatches);

  useEffect(() => {
    if (!isAdmin || !state.isUnlocked || state.slots.semifinal_1) return;
    initializePlayoffs().then(({ error: initError }) => setError(initError || ""));
  }, [isAdmin, state.isUnlocked, state.slots.semifinal_1, initializePlayoffs]);

  useEffect(() => {
    if (!isAdmin || !state.semifinalWinners.every(Boolean) || state.slots.grand_final) return;
    createGrandFinal().then(({ error: finalError }) => setError(finalError || ""));
  }, [isAdmin, state.semifinalWinners, state.slots.grand_final, createGrandFinal]);

  if (loading) return <div className="mx-auto max-w-6xl px-5 py-6"><EmptyState title="Loading playoffs" /></div>;
  if (!state.isUnlocked) {
    return <div className="mx-auto max-w-6xl px-5 py-6"><SectionLabel>Playoffs</SectionLabel><EmptyState title="Playoffs locked" sub={`${state.completedRegularMatches} of ${REGULAR_SEASON_MATCH_COUNT} regular-season matches completed.`} /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <SectionLabel>Playoffs · {state.phase}</SectionLabel>
      {error && <p className="mb-4 text-xs text-blood-500">{error}</p>}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SeedList title="Playoff qualifiers" entries={state.qualifiers} getTeam={getTeam} />
        <SeedList title="Eliminated" entries={state.eliminated} getTeam={getTeam} eliminated />
      </div>
      {!state.slots.semifinal_1 ? <EmptyState title="Generating bracket" sub={isAdmin ? "Creating semifinal matchups…" : "An organizer will publish the bracket shortly."} /> : (
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr] lg:items-center">
          <BracketColumn title="Semifinal 1"><PlayoffMatch match={state.slots.semifinal_1} getTeam={getTeam} isAdmin={isAdmin} onSubmit={submitPlayoffResult} /></BracketColumn>
          <BracketColumn title="Grand Final"><PlayoffMatch match={state.slots.grand_final} getTeam={getTeam} isAdmin={isAdmin} onSubmit={submitPlayoffResult} placeholder="Complete both semifinals to reveal finalists." /></BracketColumn>
          <BracketColumn title="Semifinal 2"><PlayoffMatch match={state.slots.semifinal_2} getTeam={getTeam} isAdmin={isAdmin} onSubmit={submitPlayoffResult} /></BracketColumn>
        </div>
      )}
      {state.champion && <div className="mt-6 grid gap-3 sm:grid-cols-2"><Placement label="🏆 Champion" team={getTeam(state.champion)} /><Placement label="🥈 Runner-up" team={getTeam(state.runnerUp)} /></div>}
    </div>
  );
}

function SeedList({ title, entries, getTeam, eliminated }) {
  return <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4"><h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-ember-500">{title}</h2>{entries.map((entry) => { const team = getTeam(entry.id); return <div key={entry.id} className="flex items-center gap-2 border-t border-[var(--line)] py-2 first:border-t-0"><span className="w-7 text-center text-xs font-black text-ember-500">#{entry.rank}</span><TeamLogo team={team} size={23} fontSize={7} /><span className="text-xs font-bold">{team?.abbr} <span className="font-normal text-[var(--text-muted)]">{team?.name}</span></span>{eliminated && <span className="ml-auto text-[9px] font-bold uppercase text-blood-500">Eliminated</span>}</div>; })}</section>;
}
function BracketColumn({ title, children }) { return <section><h2 className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]">{title}</h2>{children}</section>; }
function Placement({ label, team }) { return <div className="flex items-center gap-3 rounded-md border border-ember-500/30 bg-ember-500/10 p-4"><TeamLogo team={team} size={38} fontSize={11} /><div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-ember-500">{label}</div><div className="mt-1 font-display text-lg font-black">{team?.name}</div></div></div>; }

function PlayoffMatch({ match, getTeam, isAdmin, onSubmit, placeholder }) {
  const [games, setGames] = useState([null, null, null]);
  const [message, setMessage] = useState("");
  useEffect(() => setGames(match?.gameResults?.length ? [...match.gameResults, null, null].slice(0, 3) : [null, null, null]), [match]);
  if (!match) return <EmptyState title="Finalists TBD" sub={placeholder} />;
  const teamA = getTeam(match.teamA); const teamB = getTeam(match.teamB);
  const complete = match.status === "completed";
  const save = async () => { const { error } = await onSubmit({ slot: match.slot, gameResults: games, updatedAt: match.updatedAt }); setMessage(error || "Result saved"); };
  const winner = complete ? (match.scoreA > match.scoreB ? teamA : teamB) : null;
  const isDecidedBefore = (index) => games.slice(0, index).filter((game) => game === "A").length === 2 || games.slice(0, index).filter((game) => game === "B").length === 2;
  return <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4">
    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]"><span>BO3</span><span>{complete ? "Final" : "Ready"}</span></div>
    <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><Team team={teamA} /><div className="font-display text-2xl font-black text-ember-500">{complete ? `${match.scoreA}–${match.scoreB}` : "VS"}</div><Team team={teamB} /></div>
    {winner && <div className="border-t border-[var(--line)] pt-2 text-center text-[10px] font-bold uppercase tracking-wider text-rift-500">Winner: {winner.abbr}</div>}
    {isAdmin && !complete && <div className="mt-3 border-t border-[var(--line)] pt-3"><div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Game winners</div><div className="space-y-1.5">{[0,1,2].map((index) => { const disabled = isDecidedBefore(index); return <div key={index} className="grid grid-cols-[32px_1fr_1fr] gap-1"><span className="py-1 text-[10px] text-[var(--text-muted)]">G{index + 1}</span><button disabled={disabled} onClick={() => setGames((current) => current.map((game, i) => i === index ? "A" : game))} className={`rounded-sm border py-1 text-[9px] font-bold disabled:opacity-30 ${games[index] === "A" ? "border-ember-500 bg-ember-500/10 text-ember-500" : "border-[var(--line)]"}`}>{teamA?.abbr}</button><button disabled={disabled} onClick={() => setGames((current) => current.map((game, i) => i === index ? "B" : game))} className={`rounded-sm border py-1 text-[9px] font-bold disabled:opacity-30 ${games[index] === "B" ? "border-ember-500 bg-ember-500/10 text-ember-500" : "border-[var(--line)]"}`}>{teamB?.abbr}</button></div>; })}</div><button onClick={save} className="mt-3 w-full rounded-sm bg-ember-500 py-2 text-[10px] font-bold uppercase tracking-wider text-white">Submit result</button>{message && <p className="mt-2 text-center text-[10px] text-[var(--text-muted)]">{message}</p>}</div>}
  </div>;
}
function Team({ team }) { return <div className="min-w-0"><div className="mx-auto w-fit"><TeamLogo team={team} size={28} fontSize={8} /></div><div className="mt-1 truncate text-[11px] font-black">{team?.abbr}</div></div>; }
