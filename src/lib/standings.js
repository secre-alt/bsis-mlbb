export function calcStandings(teams, matches) {
  const s = {};
  teams.forEach((t) => {
    s[t.id] = { id: t.id, mp: 0, w: 0, l: 0, gw: 0, gl: 0, pts: 0, form: [] };
  });

  matches
    .filter((m) => m.status === 'completed')
    .forEach((m) => {
      const a = s[m.teamA];
      const b = s[m.teamB];
      if (!a || !b) return;
      a.mp++;
      b.mp++;
      a.gw += m.scoreA;
      a.gl += m.scoreB;
      b.gw += m.scoreB;
      b.gl += m.scoreA;
      if (m.scoreA > m.scoreB) {
        a.w++;
        a.pts++;
        b.l++;
        a.form.push('W');
        b.form.push('L');
      } else {
        b.w++;
        b.pts++;
        a.l++;
        b.form.push('W');
        a.form.push('L');
      }
    });

  return Object.values(s)
    .map((t) => ({
      ...t,
      diff: t.gw - t.gl,
      wr: t.mp > 0 ? Math.round((t.w / t.mp) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.w - a.w ||
        b.diff - a.diff ||
        b.gw - a.gw
    );
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
