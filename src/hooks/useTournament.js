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
  };
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
    const cleanAbbr = abbr.trim().toUpperCase().slice(0, 5);
    const cleanName = name.trim().slice(0, 80);
    if (!cleanAbbr || !cleanName) return { error: "Fill in all fields." };
    const { error } = await supabase
      .from("teams")
      .insert({ abbr: cleanAbbr, name: cleanName, color_idx: colorIdx });
    return { error: error?.message };
  }, []);

  const deleteTeam = useCallback(async (id) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    return { error: error?.message };
  }, []);

  const uploadTeamLogo = useCallback(async (team, file) => {
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

    return { error: updateError?.message };
  }, []);

  const submitMatchResult = useCallback(
    async ({ num, round, date, time, teamA, teamB, scoreA, scoreB }) => {
      if (teamA === teamB) return { error: "Teams cannot be the same." };
      if (scoreA === scoreB) return { error: "Score cannot be tied." };
      const validBo3Score =
        (scoreA === 2 && (scoreB === 0 || scoreB === 1)) ||
        (scoreB === 2 && (scoreA === 0 || scoreA === 1));
      if (!validBo3Score)
        return {
          error: "Match result must be a valid best-of-3 score (2-0 or 2-1).",
        };
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
        status: "completed",
      };
      const { error } = existing
        ? await supabase.from("matches").update(payload).eq("id", existing.id)
        : await supabase.from("matches").insert(payload);
      return { error: error?.message };
    },
    [matches],
  );

  const scheduleMatch = useCallback(
    async ({ num, round, date, time, teamA, teamB }) => {
      if (teamA === teamB) return { error: "Teams must be different." };
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
      };
      const { error } = await supabase.from("matches").insert(payload);
      return { error: error?.message };
    },
    [],
  );

  return {
    teams,
    matches,
    loading,
    syncStatus,
    getTeam,
    addTeam,
    deleteTeam,
    uploadTeamLogo,
    submitMatchResult,
    scheduleMatch,
  };
}
