import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function normalizeTeam(t) {
  return { id: t.id, abbr: t.abbr, name: t.name, colorIdx: t.color_idx ?? 0 };
}
function normalizeMatch(m) {
  return {
    id: m.id,
    num: m.num,
    round: m.round,
    teamA: m.team_a,
    teamB: m.team_b,
    scoreA: m.score_a,
    scoreB: m.score_b,
    date: m.match_date,
    time: m.match_time,
    status: m.status,
  };
}

export function useTournament() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | ok | err
  const channelRef = useRef(null);

  const loadAll = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const [{ data: teamsData, error: te }, { data: matchesData, error: me }] =
        await Promise.all([
          supabase.from('teams').select('*').order('id'),
          supabase.from('matches').select('*').order('num'),
        ]);
      if (te || me) throw te || me;
      setTeams(teamsData.map(normalizeTeam));
      setMatches(matchesData.map(normalizeMatch));
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    loadAll();
    channelRef.current = supabase
      .channel('bsis-mlbb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, loadAll)
      .subscribe();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [loadAll]);

  const getTeam = useCallback((id) => teams.find((t) => t.id === id), [teams]);

  // ── Writes ──────────────────────────────────────────────────────────────
  // These calls only succeed against the database if the signed-in user is
  // in the `admins` table (enforced by Row Level Security). The UI hides
  // these actions from non-admins as a convenience, not as the security
  // boundary itself.
  const addTeam = useCallback(async ({ abbr, name, colorIdx }) => {
    const cleanAbbr = abbr.trim().toUpperCase().slice(0, 5);
    const cleanName = name.trim().slice(0, 80);
    if (!cleanAbbr || !cleanName) return { error: 'Fill in all fields.' };
    const { error } = await supabase
      .from('teams')
      .insert({ abbr: cleanAbbr, name: cleanName, color_idx: colorIdx });
    return { error: error?.message };
  }, []);

  const deleteTeam = useCallback(async (id) => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    return { error: error?.message };
  }, []);

  const submitMatchResult = useCallback(
    async ({ num, round, date, time, teamA, teamB, scoreA, scoreB }) => {
      if (teamA === teamB) return { error: 'Teams cannot be the same.' };
      if (scoreA === scoreB) return { error: 'Score cannot be tied.' };
      if (scoreA !== 2 && scoreB !== 2)
        return { error: 'Winner must have exactly 2 wins (best of 3).' };
      const existing = matches.find((m) => m.num === num);
      const payload = {
        num,
        round,
        team_a: teamA,
        team_b: teamB,
        score_a: scoreA,
        score_b: scoreB,
        match_date: date,
        match_time: time,
        status: 'completed',
      };
      const { error } = existing
        ? await supabase.from('matches').update(payload).eq('id', existing.id)
        : await supabase.from('matches').insert(payload);
      return { error: error?.message };
    },
    [matches]
  );

  const scheduleMatch = useCallback(
    async ({ num, round, date, time, teamA, teamB }) => {
      if (teamA === teamB) return { error: 'Teams must be different.' };
      const payload = {
        num,
        round,
        team_a: teamA,
        team_b: teamB,
        score_a: null,
        score_b: null,
        match_date: date,
        match_time: time,
        status: 'upcoming',
      };
      const { error } = await supabase.from('matches').insert(payload);
      return { error: error?.message };
    },
    []
  );

  return {
    teams,
    matches,
    loading,
    syncStatus,
    getTeam,
    addTeam,
    deleteTeam,
    submitMatchResult,
    scheduleMatch,
  };
}
