import { calcStandings } from "./standings";

export const REGULAR_SEASON_MATCH_COUNT = 15;
export const PLAYOFF_SLOTS = ["semifinal_1", "semifinal_2", "grand_final"];

export function isValidBo3(scoreA, scoreB) {
  return (scoreA === 2 && (scoreB === 0 || scoreB === 1)) || (scoreB === 2 && (scoreA === 0 || scoreA === 1));
}

export function getPlayoffState(teams, regularMatches, playoffMatches) {
  const completed = regularMatches.filter((match) => match.status === "completed").length;
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

  return {
    standings,
    isUnlocked: completed >= REGULAR_SEASON_MATCH_COUNT,
    completedRegularMatches: completed,
    qualifiers: standings.slice(0, 4),
    eliminated: standings.slice(4),
    slots,
    semifinalWinners,
    champion,
    runnerUp,
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
