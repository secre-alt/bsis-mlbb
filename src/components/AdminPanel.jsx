import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { EmptyState, SectionLabel } from "./shared";
import { useToast } from "../hooks/useToast";

const todayISO = () => new Date().toISOString().split("T")[0];
const nextMatchNumber = (matches) =>
  Math.max(0, ...matches.map((match) => Number(match.num) || 0)) + 1;
const nextRoundNumber = (matches) =>
  Math.max(0, ...matches.map((match) => Number(match.round) || 0)) + 1;

function toTimeInput(value) {
  if (/^\d{2}:\d{2}$/.test(value || "")) return value;
  const match = (value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "19:00";
  const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export default function AdminPanel({
  teams,
  matches,
  submitMatchResult,
  scheduleMatch,
  getMatchAudit,
  resultMatch,
  scheduledMatch,
  onDone,
}) {
  const showToast = useToast();
  const [result, setResult] = useState(() => ({
    num: nextMatchNumber(matches),
    round: nextRoundNumber(matches),
    date: todayISO(),
    time: "19:00",
    teamA: teams[0]?.id,
    teamB: teams[1]?.id,
    scoreA: 2,
    scoreB: 1,
  }));
  const [resultError, setResultError] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const [sched, setSched] = useState(() => ({
    num: nextMatchNumber(matches),
    round: nextRoundNumber(matches),
    date: todayISO(),
    time: "19:00",
    teamA: teams[0]?.id,
    teamB: teams[1]?.id,
  }));
  const [savingSched, setSavingSched] = useState(false);
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    if (!resultMatch) return;

    setResult({
      id: resultMatch.id,
      updatedAt: resultMatch.updatedAt,
      completedAt: resultMatch.completedAt,
      num: resultMatch.num,
      round: resultMatch.round,
      date: resultMatch.date || todayISO(),
      time: toTimeInput(resultMatch.time),
      teamA: resultMatch.teamA,
      teamB: resultMatch.teamB,
      scoreA: resultMatch.scoreA ?? 2,
      scoreB: resultMatch.scoreB ?? 1,
    });
    setResultError("");
  }, [resultMatch]);

  useEffect(() => {
    if (!scheduledMatch) return;

    setSched({
      id: scheduledMatch.id,
      updatedAt: scheduledMatch.updatedAt,
      num: scheduledMatch.num,
      round: scheduledMatch.round,
      date: scheduledMatch.date || todayISO(),
      time: toTimeInput(scheduledMatch.time),
      teamA: scheduledMatch.teamA,
      teamB: scheduledMatch.teamB,
    });
  }, [scheduledMatch]);

  useEffect(() => {
    let active = true;
    const loadAudit = async () => {
      const { data, error } = await getMatchAudit();
      if (!active) return;
      if (error) setAuditError(error);
      else setAuditEntries(data);
    };
    loadAudit();
    return () => {
      active = false;
    };
  }, [getMatchAudit]);

  const teamOptions = useMemo(
    () =>
      teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.abbr} — {t.name}
        </option>
      )),
    [teams],
  );

  if (teams.length < 2) {
    return (
      <div className="mx-auto max-w-lg px-5 py-10">
        <EmptyState title="Need at least 2 teams" sub="Add teams first." />
      </div>
    );
  }

  const clampScore = (v) => Math.max(0, Math.min(3, v));

  const handleSubmitResult = async (e) => {
    e.preventDefault();
    setResultError("");
    setSavingResult(true);
    const { error } = await submitMatchResult({
      ...result,
      num: Number(result.num),
      round: Number(result.round),
      teamA: Number(result.teamA),
      teamB: Number(result.teamB),
      scoreA: Number(result.scoreA),
      scoreB: Number(result.scoreB),
    });
    setSavingResult(false);
    if (error) return setResultError(error);

    const nextNum = Math.max(nextMatchNumber(matches), Number(result.num) + 1);
    const nextRound = Math.max(nextRoundNumber(matches), Number(result.round) + 1);

    setResult((current) => ({
      ...current,
      id: undefined,
      num: nextNum,
      round: nextRound,
      date: todayISO(),
      time: "19:00",
      teamA: teams[0]?.id,
      teamB: teams[1]?.id,
      scoreA: 2,
      scoreB: 1,
    }));

    const winner = teams.find(
      (t) =>
        t.id ===
        Number(result.scoreA > result.scoreB ? result.teamA : result.teamB),
    );
    showToast(
      `Match ${result.num} recorded · ${winner?.abbr} wins ${result.scoreA}–${result.scoreB}`,
      "success",
    );
    onDone?.();
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSavingSched(true);
    const { error } = await scheduleMatch({
      ...sched,
      num: Number(sched.num),
      round: Number(sched.round),
      teamA: Number(sched.teamA),
      teamB: Number(sched.teamB),
    });
    setSavingSched(false);
    if (error) return showToast(error, "error");

    const nextNum = Math.max(nextMatchNumber(matches), Number(sched.num) + 1);
    const nextRound = Math.max(nextRoundNumber(matches), Number(sched.round) + 1);

    setSched((current) => ({
      ...current,
      id: undefined,
      num: nextNum,
      round: nextRound,
      date: todayISO(),
      time: "19:00",
    }));

    showToast(scheduledMatch ? "Scheduled match updated" : "Match scheduled", "success");
    if (scheduledMatch) onDone?.();
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <SectionLabel>
        {resultMatch ? `Input result — Match ${resultMatch.num}` : "Record match result"}
      </SectionLabel>
      <form
        onSubmit={handleSubmitResult}
        className="mb-8 rounded-md border border-ink-800 bg-ink-900 p-6"
      >
        <Row>
          <Field label="Match #">
            <input
              type="number"
              min={1}
              className="input"
              value={result.num}
              onChange={(e) =>
                setResult((r) => ({ ...r, num: e.target.value }))
              }
            />
          </Field>
          <Field label="Round">
            <input
              type="number"
              min={1}
              className="input"
              value={result.round}
              onChange={(e) =>
                setResult((r) => ({ ...r, round: e.target.value }))
              }
            />
          </Field>
        </Row>
        <Row>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={result.date}
              onChange={(e) =>
                setResult((r) => ({ ...r, date: e.target.value }))
              }
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              className="input"
              value={result.time}
              onChange={(e) =>
                setResult((r) => ({ ...r, time: e.target.value }))
              }
            />
          </Field>
        </Row>
        <div className="mb-3">
          <Field label="Team A">
            <select
              className="input"
              value={result.teamA}
              onChange={(e) =>
                setResult((r) => ({ ...r, teamA: e.target.value }))
              }
            >
              {teamOptions}
            </select>
          </Field>
        </div>
        <div className="mb-4">
          <Field label="Team B">
            <select
              className="input"
              value={result.teamB}
              onChange={(e) =>
                setResult((r) => ({ ...r, teamB: e.target.value }))
              }
            >
              {teamOptions}
            </select>
          </Field>
        </div>

        <div className="mb-4 rounded-sm border border-ink-800 bg-ink-950 p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Game score (best of 3)
          </div>
          <Row>
            <ScoreField
              label="Team A score"
              value={result.scoreA}
              onChange={(v) =>
                setResult((r) => ({ ...r, scoreA: clampScore(v) }))
              }
            />
            <ScoreField
              label="Team B score"
              value={result.scoreB}
              onChange={(v) =>
                setResult((r) => ({ ...r, scoreB: clampScore(v) }))
              }
            />
          </Row>
        </div>

        {resultError && (
          <div className="mb-3 text-xs font-medium text-blood-500">
            {resultError}
          </div>
        )}

        <button
          type="submit"
          disabled={savingResult}
          className="w-full rounded-sm bg-ember-500 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {savingResult ? "Saving…" : "Submit result"}
        </button>
      </form>

      <SectionLabel>
        {scheduledMatch
          ? `Edit scheduled match — Match ${scheduledMatch.num}`
          : "Schedule upcoming match"}
      </SectionLabel>
      <form
        onSubmit={handleSchedule}
        className="rounded-md border border-ink-800 bg-ink-900 p-6"
      >
        <Row>
          <Field label="Match #">
            <input
              type="number"
              min={1}
              className="input"
              value={sched.num}
              onChange={(e) => setSched((s) => ({ ...s, num: e.target.value }))}
            />
          </Field>
          <Field label="Round">
            <input
              type="number"
              min={1}
              className="input"
              value={sched.round}
              onChange={(e) =>
                setSched((s) => ({ ...s, round: e.target.value }))
              }
            />
          </Field>
        </Row>
        <Row>
          <Field label="Date">
            <input
              type="date"
              className="input"
              value={sched.date}
              onChange={(e) =>
                setSched((s) => ({ ...s, date: e.target.value }))
              }
            />
          </Field>
          <Field label="Time">
            <input
              type="time"
              className="input"
              value={sched.time}
              onChange={(e) =>
                setSched((s) => ({ ...s, time: e.target.value }))
              }
            />
          </Field>
        </Row>
        <div className="mb-3">
          <Field label="Team A">
            <select
              className="input"
              value={sched.teamA}
              onChange={(e) =>
                setSched((s) => ({ ...s, teamA: e.target.value }))
              }
            >
              {teamOptions}
            </select>
          </Field>
        </div>
        <div className="mb-4">
          <Field label="Team B">
            <select
              className="input"
              value={sched.teamB}
              onChange={(e) =>
                setSched((s) => ({ ...s, teamB: e.target.value }))
              }
            >
              {teamOptions}
            </select>
          </Field>
        </div>
        <button
          type="submit"
          disabled={savingSched}
          className="w-full rounded-sm border border-ink-700 bg-ink-800 py-3 text-xs font-bold uppercase tracking-wider text-ink-300 transition hover:border-ink-600"
        >
          {savingSched
            ? "Saving…"
            : scheduledMatch
              ? "Save changes"
              : "Schedule match"}
        </button>
      </form>

      <SectionLabel>Recent match activity</SectionLabel>
      <div className="overflow-hidden rounded-md border border-ink-800 bg-ink-900">
        {auditError ? (
          <p className="px-4 py-3 text-xs text-ink-500">
            Audit history is unavailable until the integrity migration is run.
          </p>
        ) : auditEntries.length ? (
          auditEntries.map((entry) => {
            const match = entry.new_row || entry.old_row || {};
            return (
              <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-3 last:border-b-0">
                <div className="text-xs text-ink-300">
                  <span className="font-bold uppercase text-ember-400">{entry.action}</span>
                  {" · "}Match {match.num ?? entry.match_id}
                </div>
                <time className="text-[10px] text-ink-600">
                  {new Date(entry.created_at).toLocaleString("en-PH")}
                </time>
              </div>
            );
          })
        ) : (
          <p className="px-4 py-3 text-xs text-ink-500">No match changes yet.</p>
        )}
      </div>
    </div>
  );
}

function Row({ children }) {
  return <div className="mb-3 grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ScoreField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(Number(value) - 1)}
          className="btn-step"
        >
          <Minus size={15} />
        </button>
        <input
          type="number"
          min={0}
          max={3}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input text-center text-lg font-bold"
        />
        <button
          type="button"
          onClick={() => onChange(Number(value) + 1)}
          className="btn-step"
        >
          <Plus size={15} />
        </button>
      </div>
    </Field>
  );
}
