import { useState } from 'react';
import { ImageUp, Pencil, Trash2 } from 'lucide-react';
import { calcStandings, COLOR_NAMES } from '../lib/standings';
import { TeamLogo, SectionLabel, EmptyState, SkeletonBlock } from './shared';
import { useToast } from '../hooks/useToast';
import LogoEditorModal from './LogoEditorModal';

export default function Teams({ teams, matches, addTeam, deleteTeam, updateTeamName, uploadTeamLogo, loading }) {
  const showToast = useToast();
  const [abbr, setAbbr] = useState('');
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [logoTeam, setLogoTeam] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-6">
        <SkeletonBlock />
      </div>
    );
  }

  const standings = calcStandings(teams, matches);
  const rankMap = {};
  standings.forEach((s) => (rankMap[s.id] = { rank: s.rank, ...s }));

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
    if (matches.some((match) => match.teamA === team.id || match.teamB === team.id)) {
      return showToast("Teams with match history cannot be deleted.", "error");
    }
    if (!confirm(`Delete ${team.abbr}? This cannot be undone.`)) return;
    const { error } = await deleteTeam(team.id);
    if (error) return showToast('Failed to delete', 'error');
    showToast(`${team.abbr} deleted`, 'success');
  };

  const startEditingName = (team) => {
    setEditingTeamId(team.id);
    setEditedName(team.name);
  };

  const saveTeamName = async (team) => {
    setSavingName(true);
    const { error } = await updateTeamName(team.id, editedName);
    setSavingName(false);
    if (error) return showToast(error, 'error');
    setEditingTeamId(null);
    showToast(`${team.abbr} name updated`, 'success');
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
                    {editingTeamId === t.id ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editedName}
                          maxLength={80}
                          onChange={(event) => setEditedName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveTeamName(t);
                            if (event.key === 'Escape') setEditingTeamId(null);
                          }}
                          className="input h-7 min-w-0 py-1 text-[11px]"
                        />
                        <button
                          type="button"
                          disabled={savingName}
                          onClick={() => saveTeamName(t)}
                          className="rounded-sm bg-ember-500 px-2 py-1 text-[9px] font-bold uppercase text-white disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="text-[9px] font-bold uppercase text-ink-500 hover:text-ink-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="truncate text-[11px] text-ink-500">{t.name}</div>
                    )}
                    <div className="mt-0.5 text-[10px] text-ink-700">
                      {s.mp} MP · {s.w}W {s.l}L · {s.pts} PTS
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLogoTeam(t)}
                      aria-label={t.logoUrl ? 'Replace logo' : 'Add logo'}
                      title={t.logoUrl ? 'Replace logo' : 'Add logo'}
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-ember-500/25 text-ember-400 transition hover:bg-ember-500/10 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:font-bold sm:uppercase sm:tracking-wider"
                    >
                      <ImageUp size={12} />
                      <span className="hidden sm:inline">{t.logoUrl ? 'Replace logo' : 'Add logo'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditingName(t)}
                      aria-label="Edit team name"
                      title="Edit team name"
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-ink-700 text-ink-300 transition hover:border-ember-500/50 hover:text-ember-400 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:font-bold sm:uppercase sm:tracking-wider"
                    >
                      <Pencil size={12} /> <span className="hidden sm:inline">Edit name</span>
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      aria-label="Delete team"
                      title="Delete team"
                      className="flex h-8 w-8 items-center justify-center rounded-sm border border-blood-500/20 text-blood-500 transition hover:bg-blood-500/10 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:font-bold sm:uppercase sm:tracking-wider"
                    >
                      <Trash2 size={12} /> <span className="hidden sm:inline">Delete</span>
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
