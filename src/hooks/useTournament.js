import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const STORAGE_KEY = "bsis-mlbb-cache-v1";

function normalizeTeam(t) {
  return {
    id: t.id,
    abbr: t.abbr,
    name: t.name,
    colorIdx: t.color_idx ?? 0,
    logoUrl: t.logo_url ?? null,
  };
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
    completedAt: m.completed_at ?? null,
    updatedAt: m.updated_at ?? null,
  };
}

function offlineWriteError() {
  return typeof navigator !== "undefined" && !navigator.onLine
    ? { error: "You are offline. Reconnect before changing tournament data." }
    : null;
}
function sameMatchNumber(value, number) {
  return Number(value) === Number(number);
}
function readCachedTournament() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.teams) ||
      !Array.isArray(parsed.matches)
    ) {
      return null;
    }
    return { teams: parsed.teams, matches: parsed.matches };
  } catch {
    return null;
  }
}
function writeCachedTournament(teams, matches) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        teams,
        matches,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore storage quota issues
  }
}

export function useTournament() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "idle",
  ); // idle | syncing | ok | err | offline
  const channelRef = useRef(null);

  const loadAll = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const cached = readCachedTournament();
      if (cached) {
        setTeams(cached.teams);
        setMatches(cached.matches);
      }
      setSyncStatus("offline");
      setLoading(false);
      return;
    }

    setSyncStatus("syncing");
    try {
      const [{ data: teamsData, error: te }, { data: matchesData, error: me }] =
        await Promise.all([
          supabase.from("teams").select("*").order("id"),
          supabase.from("matches").select("*").order("num"),
        ]);
      if (te || me) throw te || me;

      const normalizedTeams = teamsData.map(normalizeTeam);
      const normalizedMatches = matchesData.map(normalizeMatch);

      setTeams(normalizedTeams);
      setMatches(normalizedMatches);
      writeCachedTournament(normalizedTeams, normalizedMatches);
      setSyncStatus("ok");
    } catch (e) {
      console.error(e);
      const cached = readCachedTournament();
      if (cached) {
        setTeams(cached.teams);
        setMatches(cached.matches);
        setSyncStatus(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "err",
        );
      } else {
        setSyncStatus("err");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readCachedTournament();
    if (cached) {
      setTeams(cached.teams);
      setMatches(cached.matches);
      setLoading(false);
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    const handleOnline = () => {
      setSyncStatus("syncing");
      loadAll();
    };
    const handleOffline = () => {
      const cached = readCachedTournament();
      if (cached) {
        setTeams(cached.teams);
        setMatches(cached.matches);
      }
      setSyncStatus("offline");
      setLoading(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      handleOffline();
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    loadAll();
    channelRef.current = supabase
      .channel("bsis-mlbb")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        loadAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        loadAll,
      )
      .subscribe();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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
    const offline = offlineWriteError();
    if (offline) return offline;
    const cleanAbbr = abbr.trim().toUpperCase().slice(0, 5);
    const cleanName = name.trim().slice(0, 80);
    if (!cleanAbbr || !cleanName) return { error: "Fill in all fields." };
    const { error } = await supabase
      .from("teams")
      .insert({ abbr: cleanAbbr, name: cleanName, color_idx: colorIdx });
    return { error: error?.message };
  }, []);

  const deleteTeam = useCallback(async (id) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    if (matches.some((match) => match.teamA === id || match.teamB === id)) {
      return { error: "Teams with match history cannot be deleted." };
    }
    const { error } = await supabase.from("teams").delete().eq("id", id);
    return { error: error?.message };
  }, [matches]);

  const updateTeamName = useCallback(async (id, name) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    const cleanName = name.trim().slice(0, 80);
    if (!cleanName) return { error: "Team name cannot be empty." };
    const { error } = await supabase
      .from("teams")
      .update({ name: cleanName })
      .eq("id", id);
    return { error: error?.message };
  }, []);

  const uploadTeamLogo = useCallback(async (team, file) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    if (!file) return { error: "Choose an image first." };
    if (file.size > 3 * 1024 * 1024) {
      return { error: "Logo image must be 3 MB or smaller." };
    }

    const path = `team-${team.id}/logo.png`;
    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(path, file, {
        upsert: true,
        contentType: "image/png",
        cacheControl: "3600",
      });
    if (uploadError) return { error: uploadError.message };

    const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
    const logoUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("teams")
      .update({ logo_url: logoUrl })
      .eq("id", team.id);

    if (updateError) return { error: updateError.message };

    // The fixed object path is overwritten above; update local state now so
    // the old mark disappears immediately instead of waiting for Realtime.
    setTeams((current) =>
      current.map((item) =>
        item.id === team.id ? { ...item, logoUrl } : item,
      ),
    );
    return { error: null, logoUrl };
  }, []);

  const submitMatchResult = useCallback(
    async ({ id, updatedAt, completedAt, num, round, date, time, teamA, teamB, scoreA, scoreB }) => {
      const offline = offlineWriteError();
      if (offline) return offline;
      if (!Number.isInteger(num) || num < 1 || !Number.isInteger(round) || round < 1) {
        return { error: "Match number and round must be positive whole numbers." };
      }
      if (!teams.some((team) => team.id === teamA) || !teams.some((team) => team.id === teamB)) {
        return { error: "Choose two existing teams." };
      }
      if (teamA === teamB) return { error: "Teams cannot be the same." };
      if (scoreA === scoreB) return { error: "Score cannot be tied." };
      const validBo3Score =
        (scoreA === 2 && (scoreB === 0 || scoreB === 1)) ||
        (scoreB === 2 && (scoreA === 0 || scoreA === 1));
      if (!validBo3Score)
        return {
          error: "Match result must be a valid best-of-3 score (2-0 or 2-1).",
        };
      const existing = id ? matches.find((m) => m.id === id) : null;
      if (id && !existing) return { error: "That match no longer exists. Refresh and try again." };
      if (matches.some((m) => sameMatchNumber(m.num, num) && m.id !== id)) {
        return { error: `Match ${num} already exists. Use its edit action instead.` };
      }
      const payload = {
        num,
        round,
        team_a: teamA,
        team_b: teamB,
        score_a: scoreA,
        score_b: scoreB,
        match_date: date,
        match_time: time,
        status: "completed",
        completed_at: completedAt || new Date().toISOString(),
      };
      let error;
      if (existing) {
        let request = supabase.from("matches").update(payload).eq("id", existing.id);
        if (updatedAt) request = request.eq("updated_at", updatedAt);
        const response = await request.select("id");
        error = response.error;
        if (!error && updatedAt && response.data?.length === 0) {
          return { error: "This match was changed by another organizer. Refresh and try again." };
        }
      } else {
        ({ error } = await supabase.from("matches").insert(payload));
      }
      return { error: error?.message };
    },
    [matches, teams],
  );

  const scheduleMatch = useCallback(
    async ({ id, updatedAt, num, round, date, time, teamA, teamB }) => {
      const offline = offlineWriteError();
      if (offline) return offline;
      if (!Number.isInteger(num) || num < 1 || !Number.isInteger(round) || round < 1) {
        return { error: "Match number and round must be positive whole numbers." };
      }
      if (!teams.some((team) => team.id === teamA) || !teams.some((team) => team.id === teamB)) {
        return { error: "Choose two existing teams." };
      }
      if (teamA === teamB) return { error: "Teams must be different." };
      if (matches.some((m) => sameMatchNumber(m.num, num) && m.id !== id)) {
        return { error: `Match ${num} already exists.` };
      }
      const payload = {
        num,
        round,
        team_a: teamA,
        team_b: teamB,
        score_a: null,
        score_b: null,
        match_date: date,
        match_time: time,
        status: "upcoming",
        completed_at: null,
      };
      let error;
      if (id) {
        let request = supabase.from("matches").update(payload).eq("id", id);
        if (updatedAt) request = request.eq("updated_at", updatedAt);
        const response = await request.select("id");
        error = response.error;
        if (!error && updatedAt && response.data?.length === 0) {
          return { error: "This match was changed by another organizer. Refresh and try again." };
        }
      } else {
        ({ error } = await supabase.from("matches").insert(payload));
      }
      return { error: error?.message };
    },
    [matches, teams],
  );

  const deleteMatch = useCallback(async (id, updatedAt) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    let request = supabase.from("matches").delete().eq("id", id);
    if (updatedAt) request = request.eq("updated_at", updatedAt);
    const { data, error } = await request.select("id");
    if (!error && updatedAt && data?.length === 0) {
      return { error: "This match was changed by another organizer. Refresh and try again." };
    }
    return { error: error?.message };
  }, []);

  const getMatchAudit = useCallback(async () => {
    const { data, error } = await supabase
      .from("match_audit")
      .select("id, match_id, action, created_at, old_row, new_row")
      .order("created_at", { ascending: false })
      .limit(50);
    return { data: data ?? [], error: error?.message };
  }, []);

  return {
    teams,
    matches,
    loading,
    syncStatus,
    getTeam,
    addTeam,
    deleteTeam,
    updateTeamName,
    uploadTeamLogo,
    submitMatchResult,
    scheduleMatch,
    deleteMatch,
    getMatchAudit,
  };
}
