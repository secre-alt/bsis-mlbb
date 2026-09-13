import { useEffect, useState } from "react";
import { getPlayoffState, initialSemifinals, REGULAR_SEASON_MATCH_COUNT } from "../lib/playoffs";
import { EmptyState, SectionLabel, TeamLogo } from "./shared";

export default function Playoffs({ teams, matches, playoffMatches, getTeam, isAdmin, initializePlayoffs, createGrandFinal, submitPlayoffResult, loading }) {
  const [error, setError] = useState("");
  const state = getPlayoffState(teams, matches, playoffMatches);
  useEffect(() => { if (isAdmin && state.isUnlocked && !state.slots.semifinal_1) initializePlayoffs().then(({ error: initError }) => setError(initError || "")); }, [isAdmin, state.isUnlocked, state.slots.semifinal_1, initializePlayoffs]);
  useEffect(() => { if (isAdmin && state.semifinalWinners.every(Boolean) && !state.slots.grand_final) createGrandFinal().then(({ error: finalError }) => setError(finalError || "")); }, [isAdmin, state.semifinalWinners, state.slots.grand_final, createGrandFinal]);
  if (loading) return <div className="mx-auto max-w-6xl px-5 py-6"><EmptyState title="Loading playoffs" /></div>;
  if (!state.isUnlocked && !isAdmin) return <div className="mx-auto max-w-6xl px-5 py-6"><SectionLabel>Playoffs</SectionLabel><EmptyState title="Playoffs locked" sub={`${state.completedRegularMatches} of ${REGULAR_SEASON_MATCH_COUNT} regular-season matches completed.`} /></div>;
  const preview = initialSemifinals(state.standings);
  const seedMap = Object.fromEntries(state.qualifiers.map((team, index) => [team.id, index + 1]));
  if (isAdmin && !state.isUnlocked && !state.slots.semifinal_1 && preview.length === 2) {
    state.slots.semifinal_1 = { ...preview[0], gameResults: [], status: "preview" };
    state.slots.semifinal_2 = { ...preview[1], gameResults: [], status: "preview" };
  }
  return <div className="mx-auto max-w-6xl px-5 py-6">
    <SectionLabel>Playoffs - {state.phase}</SectionLabel>
    {error && <p className="mb-4 text-xs text-blood-500">{error}</p>}
    <div className="mb-6 grid gap-3 sm:grid-cols-2"><SeedList title="Playoff qualifiers" entries={state.qualifiers} getTeam={getTeam} /><SeedList title="Eliminated" entries={state.eliminated} getTeam={getTeam} eliminated /></div>
    {!state.slots.semifinal_1 ? <EmptyState title="Generating bracket" sub={isAdmin ? "Creating semifinal matchups..." : "An organizer will publish the bracket shortly."} /> : <BracketBoard state={state} getTeam={getTeam} seedMap={seedMap} isAdmin={isAdmin && state.isUnlocked} onSubmit={submitPlayoffResult} />}
    {state.finalPlacements.length > 0 && <FinalPlacements placements={state.finalPlacements} getTeam={getTeam} />}
  </div>;
}

function SeedList({ title, entries, getTeam, eliminated }) { return <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-4"><h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-ember-500">{title}</h2>{entries.map((entry) => { const team = getTeam(entry.id); return <div key={entry.id} className="flex items-center gap-2 border-t border-[var(--line)] py-2 first:border-t-0"><span className="w-7 text-center text-xs font-black text-ember-500">#{entry.rank}</span><TeamLogo team={team} size={23} fontSize={7} /><span className="text-xs font-bold">{team?.abbr} <span className="font-normal text-[var(--text-muted)]">{team?.name}</span></span>{eliminated && <span className="ml-auto text-[9px] font-bold uppercase text-blood-500">Eliminated</span>}</div>; })}</section>; }

function BracketBoard({ state, getTeam, seedMap, isAdmin, onSubmit }) {
  const [selectedSlot, setSelectedSlot] = useState("semifinal_1");
  const selectedMatch = state.slots[selectedSlot];
  const chooseMatch = (match) => { if (isAdmin && match) setSelectedSlot(match.slot); };
  return <>
    <section className="relative mt-2 h-[280px] overflow-hidden border border-[var(--line)] bg-[var(--panel)] sm:h-[330px] md:h-[390px]" style={{ minHeight: 280 }}>
      <div className="absolute" style={{ left: "4%", top: "7%", width: "34%" }}><RoundHeading label="Semifinals" /></div><div className="absolute" style={{ left: "60%", top: "7%", width: "34%" }}><RoundHeading label="Grand Final" /></div>
      <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 38 31 H 50 V 52 H 60" fill="none" stroke="rgba(255,90,31,.85)" strokeWidth=".5" /><path d="M 38 69 H 50 V 52" fill="none" stroke="rgba(255,90,31,.85)" strokeWidth=".5" /><circle cx="50" cy="52" r=".9" fill="#ff5a1f" /></svg>
      <div className="absolute inset-0 z-10">
        <div className="absolute" style={{ left: "4%", top: "31%", width: "34%", transform: "translateY(-50%)" }}><MatchBox match={state.slots.semifinal_1} getTeam={getTeam} seedMap={seedMap} onChoose={chooseMatch} selected={selectedSlot === "semifinal_1"} interactive={isAdmin} /></div>
        <div className="absolute" style={{ left: "4%", top: "69%", width: "34%", transform: "translateY(-50%)" }}><MatchBox match={state.slots.semifinal_2} getTeam={getTeam} seedMap={seedMap} onChoose={chooseMatch} selected={selectedSlot === "semifinal_2"} interactive={isAdmin} /></div>
        <div className="absolute" style={{ left: "60%", top: "50%", width: "34%", transform: "translateY(-50%)" }}><MatchBox match={state.slots.grand_final} getTeam={getTeam} seedMap={seedMap} onChoose={chooseMatch} selected={selectedSlot === "grand_final"} interactive={isAdmin} placeholder="Winners of both semifinals" /></div>
      </div>
    </section>
    {isAdmin && selectedMatch && !selectedMatch.status.includes("completed") && <ResultEditor match={selectedMatch} getTeam={getTeam} onSubmit={onSubmit} />}
  </>;
}
function RoundHeading({ label, className = "" }) { return <h2 className={`text-center text-[10px] font-black uppercase tracking-[0.18em] text-ember-500 ${className}`}>{label}</h2>; }

function MatchBox({ match, getTeam, seedMap, onChoose, selected, interactive, placeholder }) {
  if (!match) return <div className="w-full"><div className="mb-1 flex h-4 items-center justify-between px-1 text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-muted)]"><span>Grand Final</span><span>BO3</span></div><div className="space-y-1"><FixtureRow label="Winner of Match 1" score="-" /><FixtureRow label="Winner of Match 2" score="-" /></div></div>;
  const complete = match.status === "completed";
  const teamA = getTeam(match.teamA); const teamB = getTeam(match.teamB);
  const content = <><div className="mb-1 flex h-4 items-center justify-between px-1 text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-muted)]"><span>{match.slot === "grand_final" ? "Grand Final" : "Semifinal"}</span><span>{complete ? "Final" : match.status === "live" ? "Live" : "BO3"}</span></div><div className="space-y-1"><FixtureRow team={teamA} score={match.scoreA} /><FixtureRow team={teamB} score={match.scoreB} /></div></>;
  return interactive ? <button type="button" onClick={() => onChoose(match)} className={`block w-full text-left transition ${selected ? "drop-shadow-[0_0_8px_rgba(255,90,31,.35)]" : "hover:drop-shadow-[0_0_8px_rgba(255,90,31,.2)]"}`}>{content}</button> : <div className="w-full">{content}</div>;
}
function FixtureRow({ team, label, score }) { return <div className="flex h-8 items-center gap-2 border border-[var(--line)] bg-[var(--panel-strong)] px-2 shadow-[0_4px_12px_var(--shadow)]">{team && <TeamLogo team={team} size={18} fontSize={5} />}<span className="min-w-0 flex-1 truncate text-[10px] font-black">{label || team?.abbr || "TBD"}</span><span className="border-l border-[var(--line)] pl-2 text-right font-display text-sm font-black text-ember-500">{score ?? "-"}</span></div>; }
function ChampionBox({ champion, getTeam }) { const team = champion ? getTeam(champion) : null; return <div className={`border px-3 py-4 text-center ${team ? "border-rift-500/50 bg-rift-500/10" : "border-dashed border-[var(--line)] bg-[var(--panel-strong)]"}`}><div className={`text-[8px] font-black uppercase tracking-[.16em] ${team ? "text-rift-500" : "text-[var(--text-muted)]"}`}>{team ? "Champion" : "TBD"}</div><div className="mx-auto my-3 w-fit"><TeamLogo team={team} size={38} fontSize={10} /></div><div className="truncate text-[11px] font-black">{team?.abbr || "Final Winner"}</div></div>; }

function ResultEditor({ match, getTeam, onSubmit }) {
  const [games, setGames] = useState([null, null, null]); const [message, setMessage] = useState(""); const [revision, setRevision] = useState(match.updatedAt); const [saving, setSaving] = useState(false);
  useEffect(() => { setGames(match.gameResults?.length ? [...match.gameResults, null, null].slice(0, 3) : [null, null, null]); setMessage(""); setRevision(match.updatedAt); }, [match]);
  const teamA = getTeam(match.teamA); const teamB = getTeam(match.teamB);
  const decidedBefore = (index) => games.slice(0, index).filter((game) => game === "A").length === 2 || games.slice(0, index).filter((game) => game === "B").length === 2;
  const gameLocked = (index) => saving || Boolean(games[index]) || (index > 0 && games.slice(0, index).some((game) => !game)) || decidedBefore(index);
  const saveGame = async (index, winner) => { if (gameLocked(index)) return; const previousGames = games; const nextGames = games.map((game, i) => i === index ? winner : game); setGames(nextGames); setSaving(true); setMessage("Saving live score..."); try { const { error, updatedAt } = await onSubmit({ slot: match.slot, gameResults: nextGames, updatedAt: revision }); if (error) { setGames(previousGames); setMessage(error); } else { setRevision(updatedAt || revision); setMessage("Live score saved"); } } catch { setGames(previousGames); setMessage("Unable to save the live score. Try again."); } finally { setSaving(false); } };
  return <section className="mt-4 border border-[var(--line)] bg-[var(--panel)] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-[10px] font-black uppercase tracking-[.16em] text-ember-500">Record {match.slot === "grand_final" ? "Grand Final" : "Semifinal"}</h2><span className="text-[9px] font-bold uppercase text-[var(--text-muted)]">Save each game live</span></div><div className="border-t border-[var(--line)] pt-3"><div className="grid gap-1.5 sm:max-w-lg">{[0, 1, 2].map((index) => <div key={index} className="grid grid-cols-[34px_1fr_1fr] gap-1"><span className="py-1.5 text-[10px] text-[var(--text-muted)]">G{index + 1}</span><button disabled={gameLocked(index)} onClick={() => saveGame(index, "A")} className={`border py-1.5 text-[10px] font-bold disabled:opacity-30 ${games[index] === "A" ? "border-ember-500 bg-ember-500/10 text-ember-500" : "border-[var(--line)]"}`}>{teamA?.abbr}</button><button disabled={gameLocked(index)} onClick={() => saveGame(index, "B")} className={`border py-1.5 text-[10px] font-bold disabled:opacity-30 ${games[index] === "B" ? "border-ember-500 bg-ember-500/10 text-ember-500" : "border-[var(--line)]"}`}>{teamB?.abbr}</button></div>)}</div></div>{message && <p className="mt-3 text-[10px] text-[var(--text-muted)]">{message}</p>}</section>;
}
function FinalPlacements({ placements, getTeam }) { return <section className="mt-6"><SectionLabel>Final placements</SectionLabel><div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--panel)]">{placements.map((placement) => { const team = getTeam(placement.id); return <div key={placement.place} className="flex items-center gap-3 border-t border-[var(--line)] px-4 py-3 first:border-t-0"><span className="w-8 text-center text-sm font-black">{placement.place}</span><TeamLogo team={team} size={26} fontSize={8} /><div className="min-w-0"><div className="truncate text-xs font-black">#{placement.seed} {team?.abbr} <span className="font-normal text-[var(--text-muted)]">{team?.name}</span></div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-ember-500">{placement.label}</div></div></div>; })}</div></section>; }
