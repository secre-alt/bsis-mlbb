export function getTournamentStartDate(matches) {
  return matches
    .map((match) => match.date)
    .filter(Boolean)
    .sort()[0] ?? null;
}

export function getWeekNumber(dateString, tournamentStartDate) {
  if (!dateString || !tournamentStartDate) return 1;

  const start = getStartOfWeek(tournamentStartDate);
  const current = getStartOfWeek(dateString);
  const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export function formatMatchDate(dateString) {
  if (!dateString) return "Date TBD";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getStartOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
