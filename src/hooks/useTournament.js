import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { initialSemifinals, isValidBo3, REGULAR_SEASON_MATCH_COUNT } from "../lib/playoffs";
import { calcStandings } from "../lib/standings";

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
function normalizePlayoffMatch(m) {
  return {
    id: m.id,
    slot: m.slot,
    round: m.round,
    teamA: m.team_a,
    teamB: m.team_b,
    scoreA: m.score_a,
    scoreB: m.score_b,
    gameResults: Array.isArray(m.game_results) ? m.game_results : [],
    status: m.status,
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
function isSameFixture(match, teamA, teamB) {
  return (match.teamA === teamA && match.teamB === teamB) || (match.teamA === teamB && match.teamB === teamA);
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
  const [playoffMatches, setPlayoffMatches] = useState([]);
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
      const [{ data: teamsData, error: te }, { data: matchesData, error: me }, { data: playoffData, error: pe }] =
        await Promise.all([
          supabase.from("teams").select("*").order("id"),
          supabase.from("matches").select("*").order("num"),
          supabase.from("playoff_matches").select("*").order("round"),
        ]);
      if (te || me || pe) throw te || me || pe;

      const normalizedTeams = teamsData.map(normalizeTeam);
      const normalizedMatches = matchesData.map(normalizeMatch);

      setTeams(normalizedTeams);
      setMatches(normalizedMatches);
      setPlayoffMatches(playoffData.map(normalizePlayoffMatch));
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
        { event: "*", schema: "public", table: "playoff_matches" },
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
      if (playoffMatches.some((match) => match.slot.startsWith("semifinal"))) {
        return { error: "Regular-season results are locked after playoff seeding." };
      }
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
      if (!id && matches.length >= REGULAR_SEASON_MATCH_COUNT) {
        return { error: "The 15-match regular season is already full. Record playoff results from the Playoffs tab." };
      }
      if (matches.some((m) => sameMatchNumber(m.num, num) && m.id !== id)) {
        return { error: `Match ${num} already exists. Use its edit action instead.` };
      }
      if (matches.some((m) => isSameFixture(m, teamA, teamB) && m.id !== id)) {
        return { error: "This regular-season matchup is already scheduled." };
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
    [matches, playoffMatches, teams],
  );

  const scheduleMatch = useCallback(
    async ({ id, updatedAt, num, round, date, time, teamA, teamB }) => {
      const offline = offlineWriteError();
      if (offline) return offline;
      if (playoffMatches.some((match) => match.slot.startsWith("semifinal"))) {
        return { error: "Regular-season scheduling is locked after playoff seeding." };
      }
      if (!Number.isInteger(num) || num < 1 || !Number.isInteger(round) || round < 1) {
        return { error: "Match number and round must be positive whole numbers." };
      }
      if (!teams.some((team) => team.id === teamA) || !teams.some((team) => team.id === teamB)) {
        return { error: "Choose two existing teams." };
      }
      if (teamA === teamB) return { error: "Teams must be different." };
      if (!id && matches.length >= REGULAR_SEASON_MATCH_COUNT) {
        return { error: "The 15-match regular season is already full." };
      }
      if (matches.some((m) => sameMatchNumber(m.num, num) && m.id !== id)) {
        return { error: `Match ${num} already exists.` };
      }
      if (matches.some((m) => isSameFixture(m, teamA, teamB) && m.id !== id)) {
        return { error: "This regular-season matchup is already scheduled." };
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
    [matches, playoffMatches, teams],
  );

  const deleteMatch = useCallback(async (id, updatedAt) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    if (playoffMatches.some((match) => match.slot.startsWith("semifinal"))) {
      return { error: "Regular-season matches are locked after playoff seeding." };
    }
    let request = supabase.from("matches").delete().eq("id", id);
    if (updatedAt) request = request.eq("updated_at", updatedAt);
    const { data, error } = await request.select("id");
    if (!error && updatedAt && data?.length === 0) {
      return { error: "This match was changed by another organizer. Refresh and try again." };
    }
    return { error: error?.message };
  }, [playoffMatches]);

  const getMatchAudit = useCallback(async () => {
    const { data, error } = await supabase
      .from("match_audit")
      .select("id, match_id, action, created_at, old_row, new_row")
      .order("created_at", { ascending: false })
      .limit(50);
    return { data: data ?? [], error: error?.message };
  }, []);

  const initializePlayoffs = useCallback(async () => {
    const offline = offlineWriteError();
    if (offline) return offline;
    if (matches.filter((match) => match.status === "completed" && isValidBo3(Number(match.scoreA), Number(match.scoreB))).length < REGULAR_SEASON_MATCH_COUNT) {
      return { error: "Playoffs unlock after all 15 regular-season matches are complete." };
    }
    if (playoffMatches.some((match) => match.slot.startsWith("semifinal"))) return { error: null };
    const seeds = initialSemifinals(calcStandings(teams, matches));
    if (seeds.length !== 2) return { error: "At least four ranked teams are required." };
    const { error } = await supabase.from("playoff_matches").upsert(
      seeds.map((match) => ({ slot: match.slot, round: match.round, team_a: match.teamA, team_b: match.teamB, status: "upcoming" })),
      { onConflict: "slot", ignoreDuplicates: true },
    );
    return { error: error?.message };
  }, [matches, playoffMatches, teams]);

  const submitPlayoffResult = useCallback(async ({ slot, gameResults, updatedAt }) => {
    const offline = offlineWriteError();
    if (offline) return offline;
    const match = playoffMatches.find((item) => item.slot === slot);
    if (!match?.teamA || !match?.teamB) return { error: "This bracket match is not ready yet." };
    if (slot === "grand_final" && !["semifinal_1", "semifinal_2"].every((semiSlot) => playoffMatches.some((item) => item.slot === semiSlot && item.status === "completed"))) {
      return { error: "Complete both semifinals first." };
    }
    const games = Array.from({ length: 3 }, (_, index) => gameResults[index] ?? null);
    if (games.some((winner) => winner && winner !== "A" && winner !== "B")) return { error: "Each game must be won by Team A or Team B." };
    const scoreA = games.filter((winner) => winner === "A").length;
    const scoreB = games.filter((winner) => winner === "B").length;
    const decisiveGame = games.findIndex((_, index) => games.slice(0, index + 1).filter((winner) => winner === "A").length === 2 || games.slice(0, index + 1).filter((winner) => winner === "B").length === 2);
    if (decisiveGame >= 0 && games.slice(decisiveGame + 1).some(Boolean)) {
      return { error: "Do not record games after a team reaches two wins." };
    }
    const completed = isValidBo3(scoreA, scoreB);
    const hasStarted = games.some(Boolean);
    if (!completed && hasStarted && (scoreA > 1 || scoreB > 1)) return { error: "A live BO3 score cannot exceed 1-1." };
    const payload = completed
      ? { score_a: scoreA, score_b: scoreB, game_results: games.filter(Boolean), status: "completed" }
      : { score_a: scoreA, score_b: scoreB, game_results: games.filter(Boolean), status: hasStarted ? "live" : "upcoming" };
    let request = supabase.from("playoff_matches").update(payload).eq("slot", slot);
    if (updatedAt) request = request.eq("updated_at", updatedAt);
    const { data, error } = await request.select("updated_at");
    if (!error && updatedAt && !data?.length) return { error: "This result was changed by another organizer. Refresh and try again." };
    return { error: error?.message, updatedAt: data?.[0]?.updated_at };
  }, [playoffMatches]);

  const createGrandFinal = useCallback(async () => {
    const offline = offlineWriteError();
    if (offline) return offline;
    if (playoffMatches.some((match) => match.slot === "grand_final")) return { error: null };
    const semis = ["semifinal_1", "semifinal_2"].map((slot) => playoffMatches.find((match) => match.slot === slot));
    if (semis.some((match) => match?.status !== "completed")) return { error: "Complete both semifinals first." };
    const [teamA, teamB] = semis.map((match) => match.scoreA > match.scoreB ? match.teamA : match.teamB);
    const { error } = await supabase.from("playoff_matches").upsert({ slot: "grand_final", round: 2, team_a: teamA, team_b: teamB, status: "upcoming" }, { onConflict: "slot", ignoreDuplicates: true });
    return { error: error?.message };
  }, [playoffMatches]);

  return {
    teams,
    matches,
    playoffMatches,
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
    initializePlayoffs,
    submitPlayoffResult,
    createGrandFinal,
  };
}
