import { useState } from "react";
import { ClipboardPenLine, Pencil, Trash2 } from "lucide-react";
import { SectionLabel, EmptyState, SkeletonBlock } from "./shared";
import { formatMatchDate } from "../lib/schedule";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
];

function getStartOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekNumber(dateString, tournamentStartDate) {
  if (!dateString || !tournamentStartDate) return 1;

  const start = getStartOfWeek(tournamentStartDate);
  const current = getStartOfWeek(dateString);
  const diffDays = Math.round((current - start) / (1000 * 60 * 60 * 24));

  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export default function Schedule({
  matches,
  getTeam,
  loading,
  isAdmin = false,
  onEnterResult,
  onEditMatch,
  onDeleteMatch,
}) {
  const [filter, setFilter] = useState("all");

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-6">
        <SkeletonBlock />
      </div>
    );
  }

  const tournamentStartDate =
    matches
      .map((m) => m.date)
      .filter(Boolean)
      .sort()[0] ?? "2026-09-09";
  const filtered =
    filter === "all" ? matches : matches.filter((m) => m.status === filter);
  const weekGroups = Array.from(
    new Set(filtered.map((m) => getWeekNumber(m.date, tournamentStartDate))),
  )
    .sort((a, b) => a - b)
    .map((week) => ({
      week,
      matches: filtered
        .filter((m) => getWeekNumber(m.date, tournamentStartDate) === week)
        .sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0)),
    }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <SectionLabel>Tournament schedule</SectionLabel>
      <div className="mb-5 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition-all duration-200 ${
              filter === f.id
                ? "border-ember-500 bg-ember-500/10 text-ember-500 shadow-[inset_0_0_0_1px_rgba(255,90,31,0.18)]"
                : "border-[var(--line)] bg-[var(--panel-soft)] text-[var(--text-muted)] hover:border-[var(--line-soft)] hover:text-[var(--text)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {weekGroups.length ? (
        weekGroups.map(({ week, matches: weekMatches }) => (
          <div key={week} className="mb-6">
            <div className="mb-2.5 border-b border-ink-800 pb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-ember-500">
              Week {week}
            </div>
            <div className="space-y-1.5">
              {weekMatches.map((m) => {
                const ta = getTeam(m.teamA);
                const tb = getTeam(m.teamB);
                if (!ta || !tb) return null;
                const done = m.status === "completed";
                const removeMatch = async () => {
                  if (!window.confirm(`Delete Match ${m.num}? This cannot be undone.`)) return;
                  await onDeleteMatch?.(m);
                };
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-[24px_1fr_70px_70px] items-center gap-3 rounded-sm border border-ink-800 bg-ink-900 px-3.5 py-3 sm:grid-cols-[24px_1fr_116px_70px_70px]"
                  >
                    <div className="text-[10px] font-bold text-ink-600">
                      {m.num}
                    </div>
                    <div className="min-w-0 text-xs font-semibold">
                      <b>{ta.abbr}</b> <span className="text-ink-600">vs</span>{" "}
                      <b>{tb.abbr}</b>
                      {!done && <div className="mt-1 text-[9px] font-medium text-ink-500 sm:hidden">{formatMatchDate(m.date)} · {m.time || "Time TBD"}</div>}
                    </div>
                    <div className="hidden text-center text-[10px] leading-4 text-ink-500 sm:block">
                      <div>{formatMatchDate(m.date)}</div>
                      <div>{m.time || "Time TBD"}</div>
                    </div>
                    <div
                      className={`text-center text-xs font-bold ${done ? "text-white" : "text-ink-700"}`}
                    >
                      {done ? `${m.scoreA}–${m.scoreB}` : "—"}
                    </div>
                    <div
                      className={`text-right text-[9px] font-bold uppercase tracking-wider ${
                        done ? "text-ink-500" : "text-ember-500"
                      }`}
                    >
                      {done ? "Final" : "Upcoming"}
                    </div>
                    {isAdmin && (
                      <div className="col-span-full flex flex-wrap justify-end gap-1.5 border-t border-ink-800 pt-2 sm:col-start-2">
                        <button
                          type="button"
                          onClick={() => onEnterResult?.(m)}
                          aria-label={done ? "Edit result" : "Input result"}
                          title={done ? "Edit result" : "Input result"}
                          className="flex h-7 w-7 items-center justify-center rounded-sm border border-ember-500/35 text-ember-400 hover:bg-ember-500/10 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[8px] sm:font-bold sm:uppercase sm:tracking-wider"
                        >
                          <ClipboardPenLine size={13} className="sm:hidden" />
                          <span className="hidden sm:inline">{done ? "Edit result" : "Input result"}</span>
                        </button>
                        {!done && (
                          <button
                            type="button"
                            onClick={() => onEditMatch?.(m)}
                            aria-label="Edit schedule"
                            title="Edit schedule"
                            className="flex h-7 w-7 items-center justify-center rounded-sm border border-ink-700 text-ink-300 hover:border-ember-500/50 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[8px] sm:font-bold sm:uppercase sm:tracking-wider"
                          >
                            <Pencil size={13} className="sm:hidden" />
                            <span className="hidden sm:inline">Edit schedule</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={removeMatch}
                          aria-label="Delete match"
                          title="Delete match"
                          className="flex h-7 w-7 items-center justify-center rounded-sm border border-blood-500/30 text-blood-500 hover:bg-blood-500/10 sm:h-auto sm:w-auto sm:px-2 sm:py-1 sm:text-[8px] sm:font-bold sm:uppercase sm:tracking-wider"
                        >
                          <Trash2 size={13} className="sm:hidden" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <EmptyState title="No matches" />
      )}
    </div>
  );
}
