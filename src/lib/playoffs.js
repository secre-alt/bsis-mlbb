import { calcStandings } from "./standings";

export const REGULAR_SEASON_MATCH_COUNT = 15;
export const PLAYOFF_SLOTS = ["semifinal_1", "semifinal_2", "grand_final"];

export function isValidBo3(scoreA, scoreB) {
  return (scoreA === 2 && (scoreB === 0 || scoreB === 1)) || (scoreB === 2 && (scoreA === 0 || scoreA === 1));
}

export function getPlayoffState(teams, regularMatches, playoffMatches) {
  const completed = regularMatches.filter((match) => match.status === "completed" && isValidBo3(Number(match.scoreA), Number(match.scoreB))).length;
  const standings = calcStandings(teams, regularMatches);
  const slots = Object.fromEntries(playoffMatches.map((match) => [match.slot, match]));
  const semifinal1 = slots.semifinal_1;
  const semifinal2 = slots.semifinal_2;
  const final = slots.grand_final;
  const semifinalWinners = [semifinal1, semifinal2].map((match) =>
    match?.status === "completed" ? (match.scoreA > match.scoreB ? match.teamA : match.teamB) : null,
  );
  const champion = final?.status === "completed" ? (final.scoreA > final.scoreB ? final.teamA : final.teamB) : null;
  const runnerUp = champion && (final.scoreA > final.scoreB ? final.teamB : final.teamA);
  // Semifinal rows are the official seed snapshot once the bracket exists.
  const frozenSeedIds = semifinal1 && semifinal2
    ? [semifinal1.teamA, semifinal2.teamA, semifinal2.teamB, semifinal1.teamB]
    : null;
  const qualifiers = frozenSeedIds
    ? frozenSeedIds.map((id, index) => ({ ...(standings.find((team) => team.id === id) || { id }), rank: index + 1 }))
    : standings.slice(0, 4);
  const eliminated = standings.filter((team) => !qualifiers.some((qualifier) => qualifier.id === team.id));
  const seedFor = (id) => qualifiers.findIndex((team) => team.id === id) + 1;
  const semifinalLosers = [semifinal1, semifinal2]
    .filter((match) => match?.status === "completed")
    .map((match) => match.scoreA > match.scoreB ? match.teamB : match.teamA)
    .sort((a, b) => seedFor(a) - seedFor(b));
  const finalPlacements = champion && runnerUp && semifinalLosers.length === 2
    ? [
        { place: 1, id: champion, label: "Champion", seed: seedFor(champion) },
        { place: 2, id: runnerUp, label: "Runner-up", seed: seedFor(runnerUp) },
        { place: 3, id: semifinalLosers[0], label: "Semifinalist", seed: seedFor(semifinalLosers[0]) },
        { place: 4, id: semifinalLosers[1], label: "Semifinalist", seed: seedFor(semifinalLosers[1]) },
        ...eliminated.map((team) => ({ place: team.rank, id: team.id, label: "Eliminated", seed: team.rank })),
      ]
    : [];

  return {
    standings,
    isUnlocked: completed >= REGULAR_SEASON_MATCH_COUNT,
    completedRegularMatches: completed,
    qualifiers,
    eliminated,
    slots,
    semifinalWinners,
    champion,
    runnerUp,
    finalPlacements,
    phase: !completed || completed < REGULAR_SEASON_MATCH_COUNT
      ? "Regular Season"
      : champion
        ? "Tournament Complete"
        : final
          ? "Grand Final"
          : semifinalWinners.every(Boolean)
            ? "Grand Final"
            : semifinal1 || semifinal2
              ? "Semifinals"
              : "Playoffs Not Started",
  };
}

export function initialSemifinals(standings) {
  if (standings.length < 4) return [];
  return [
    { slot: "semifinal_1", round: 1, teamA: standings[0].id, teamB: standings[3].id },
    { slot: "semifinal_2", round: 1, teamA: standings[1].id, teamB: standings[2].id },
  ];
}
