import { useState } from 'react';
import { SectionLabel, EmptyState, SkeletonBlock } from './shared';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

export default function Schedule({ matches, getTeam, loading }) {
  const [filter, setFilter] = useState('all');

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-6">
        <SkeletonBlock />
      </div>
    );
  }

  const filtered =
    filter === 'all' ? matches : matches.filter((m) => m.status === filter);
  const rounds = [...new Set(filtered.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <SectionLabel>Tournament schedule</SectionLabel>
      <div className="mb-5 flex gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-sm border px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              filter === f.id
                ? 'border-ember-500 bg-ember-500/10 text-ember-500'
                : 'border-ink-700 bg-ink-800 text-ink-500 hover:text-ink-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rounds.length ? (
        rounds.map((r) => (
          <div key={r} className="mb-6">
            <div className="mb-2.5 border-b border-ink-800 pb-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-ember-500">
              {r === 1 ? 'Week 1' : `Round ${r}`}
            </div>
            <div className="space-y-1.5">
              {filtered
                .filter((m) => m.round === r)
                .map((m) => {
                  const ta = getTeam(m.teamA);
                  const tb = getTeam(m.teamB);
                  if (!ta || !tb) return null;
                  const done = m.status === 'completed';
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[24px_1fr_70px_70px] items-center gap-3 rounded-sm border border-ink-800 bg-ink-900 px-3.5 py-3 sm:grid-cols-[24px_1fr_80px_80px_70px]"
                    >
                      <div className="text-[10px] font-bold text-ink-600">{m.num}</div>
                      <div className="truncate text-xs font-semibold">
                        <b>{ta.abbr}</b> <span className="text-ink-600">vs</span> <b>{tb.abbr}</b>
                      </div>
                      <div className="hidden text-center text-[11px] text-ink-500 sm:block">
                        {m.time || ''}
                      </div>
                      <div className={`text-center text-xs font-bold ${done ? 'text-white' : 'text-ink-700'}`}>
                        {done ? `${m.scoreA}–${m.scoreB}` : '—'}
                      </div>
                      <div
                        className={`text-right text-[9px] font-bold uppercase tracking-wider ${
                          done ? 'text-ink-500' : 'text-ember-500'
                        }`}
                      >
                        {done ? 'Final' : 'Upcoming'}
                      </div>
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
