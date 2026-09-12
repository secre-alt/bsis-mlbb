const standingComparison = (a, b) =>
  b.pts - a.pts || b.w - a.w || b.diff - a.diff || b.gw - a.gw;

function completedMatchIsScorable(match) {
  const scoreA = Number(match.scoreA);
  const scoreB = Number(match.scoreB);
  return Number.isInteger(scoreA) && Number.isInteger(scoreB) && scoreA >= 0 && scoreB >= 0 && scoreA !== scoreB;
}

function matchSortTime(match) {
  const value = new Date(match.completedAt || match.date || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

export function calcStandings(teams, matches) {
  const standingsById = {};
  teams.forEach((team) => {
    standingsById[team.id] = { id: team.id, mp: 0, w: 0, l: 0, gw: 0, gl: 0, pts: 0, form: [], h2h: {} };
  });

  // Ignore corrupt cached or legacy rows. Database constraints reject invalid
  // future writes, but old rows must never award a default win to Team B.
  matches
    .filter((match) => match.status === "completed" && completedMatchIsScorable(match))
    .sort((a, b) => matchSortTime(a) - matchSortTime(b) || Number(a.num) - Number(b.num))
    .forEach((match) => {
      const teamA = standingsById[match.teamA];
      const teamB = standingsById[match.teamB];
      if (!teamA || !teamB) return;
      const scoreA = Number(match.scoreA);
      const scoreB = Number(match.scoreB);
      teamA.mp += 1;
      teamB.mp += 1;
      teamA.gw += scoreA;
      teamA.gl += scoreB;
      teamB.gw += scoreB;
      teamB.gl += scoreA;
      if (scoreA > scoreB) {
        teamA.w += 1;
        teamA.pts += 1;
        teamB.l += 1;
        teamA.form.push("W");
        teamB.form.push("L");
        teamA.h2h[match.teamB] = "W";
        teamB.h2h[match.teamA] = "L";
      } else {
        teamB.w += 1;
        teamB.pts += 1;
        teamA.l += 1;
        teamB.form.push("W");
        teamA.form.push("L");
        teamA.h2h[match.teamB] = "L";
        teamB.h2h[match.teamA] = "W";
      }
    });

  const sorted = Object.values(standingsById)
    .map((team) => ({
      ...team,
      form: team.form.slice(-5),
      diff: team.gw - team.gl,
      wr: team.mp > 0 ? Math.round((team.w / team.mp) * 100) : 0,
      gwr: team.gw + team.gl > 0 ? Math.round((team.gw / (team.gw + team.gl)) * 100) : 0,
    }))
    .sort((a, b) => standingComparison(a, b) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));

  return sorted.reduce((ranked, team, index) => {
    const previous = ranked[index - 1];
    const rank = previous && standingComparison(team, previous) === 0
      ? previous.rank
      : index + 1;
    ranked.push({ ...team, rank });
    return ranked;
  }, []);
}

export const TEAM_COLORS = [
  { bg: '#FF5A1F', text: '#fff' },
  { bg: '#E6473C', text: '#fff' },
  { bg: '#2563EB', text: '#fff' },
  { bg: '#16A34A', text: '#fff' },
  { bg: '#9333EA', text: '#fff' },
  { bg: '#2FD3B8', text: '#0a0a0b' },
];

export const COLOR_NAMES = ['Ember', 'Blood', 'Blue', 'Green', 'Purple', 'Rift'];

export function getColor(team) {
  return TEAM_COLORS[team?.colorIdx ?? 0] || TEAM_COLORS[0];
}
