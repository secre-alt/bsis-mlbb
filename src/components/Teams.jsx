import { useState } from 'react';
import { ImageUp, Trash2 } from 'lucide-react';
import { calcStandings, COLOR_NAMES } from '../lib/standings';
import { TeamLogo, SectionLabel, EmptyState, SkeletonBlock } from './shared';
import { useToast } from '../hooks/useToast';
import LogoEditorModal from './LogoEditorModal';

export default function Teams({ teams, matches, addTeam, deleteTeam, uploadTeamLogo, loading }) {
  const showToast = useToast();
  const [abbr, setAbbr] = useState('');
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [logoTeam, setLogoTeam] = useState(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-6">
        <SkeletonBlock />
      </div>
    );
  }

  const standings = calcStandings(teams, matches);
  const rankMap = {};
  standings.forEach((s, i) => (rankMap[s.id] = { rank: i + 1, ...s }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await addTeam({ abbr, name, colorIdx });
    setSubmitting(false);
    if (error) return showToast(error, 'error');
    showToast(`${abbr.toUpperCase()} added`, 'success');
    setAbbr('');
    setName('');
    setColorIdx(0);
  };

  const handleDelete = async (team) => {
    if (!confirm(`Delete ${team.abbr}? This also removes all their matches.`)) return;
    const { error } = await deleteTeam(team.id);
    if (error) return showToast('Failed to delete', 'error');
    showToast(`${team.abbr} deleted`, 'success');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_340px]">
      <div>
        <SectionLabel>Teams ({teams.length})</SectionLabel>
        <div className="space-y-1.5">
          {teams.length ? (
            teams.map((t) => {
              const s = rankMap[t.id] || { rank: '—', mp: 0, w: 0, l: 0, pts: 0 };
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-sm border border-ink-800 bg-ink-900 px-4 py-3"
                >
                  <TeamLogo team={t} size={38} fontSize={12} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">
                      {t.abbr} <span className="font-normal text-ink-600">#{s.rank}</span>
                    </div>
                    <div className="truncate text-[11px] text-ink-500">{t.name}</div>
                    <div className="mt-0.5 text-[10px] text-ink-700">
                      {s.mp} MP · {s.w}W {s.l}L · {s.pts} PTS
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLogoTeam(t)}
                      className="flex items-center gap-1 rounded-sm border border-ember-500/25 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ember-400 transition hover:bg-ember-500/10"
                    >
                      <ImageUp size={11} /> {t.logoUrl ? 'Replace logo' : 'Add logo'}
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="flex items-center gap-1 rounded-sm border border-blood-500/20 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blood-500 transition hover:bg-blood-500/10"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState title="No teams yet" />
          )}
        </div>
      </div>

      <div>
        <SectionLabel>Add team</SectionLabel>
        <form onSubmit={handleAdd} className="rounded-md border border-ink-800 bg-ink-900 p-5">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Field label="Abbreviation">
              <input
                value={abbr}
                onChange={(e) => setAbbr(e.target.value)}
                maxLength={5}
                placeholder="DSPM"
                className="input"
              />
            </Field>
            <Field label="Color">
              <select
                value={colorIdx}
                onChange={(e) => setColorIdx(Number(e.target.value))}
                className="input"
              >
                {COLOR_NAMES.map((n, i) => (
                  <option key={n} value={i}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mb-4">
            <Field label="Full team name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dark System Pro Max 2.0"
                className="input"
              />
            </Field>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-sm bg-ember-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add team'}
          </button>
        </form>
      </div>
      {logoTeam && (
        <LogoEditorModal
          team={logoTeam}
          onClose={() => setLogoTeam(null)}
          onSave={async (file) => {
            const result = await uploadTeamLogo(logoTeam, file);
            if (!result.error) showToast(`${logoTeam.abbr} logo updated`, 'success');
            return result;
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-500">{label}</label>
      {children}
    </div>
  );
}
