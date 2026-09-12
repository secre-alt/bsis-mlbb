import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { EmptyState, SectionLabel } from "./shared";
import { useToast } from "../hooks/useToast";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function AdminPanel({
  teams,
  matches,
  submitMatchResult,
  scheduleMatch,
  resultMatch,
  scheduledMatch,
  onDone,
}) {
  const showToast = useToast();
  const maxRound = matches.length
    ? Math.max(...matches.map((m) => m.round))
    : 0;

  const [result, setResult] = useState(() => ({
    num: matches.length + 1,
    round: maxRound + 1,
    date: todayISO(),
    time: "7:00 PM",
    teamA: teams[0]?.id,
    teamB: teams[1]?.id,
    scoreA: 2,
    scoreB: 1,
  }));
  const [resultError, setResultError] = useState("");
  const [savingResult, setSavingResult] = useState(false);

  const [sched, setSched] = useState(() => ({
    num: matches.length + 1,
    round: maxRound + 1,
    date: todayISO(),
    time: "7:00 PM",
    teamA: teams[0]?.id,
    teamB: teams[1]?.id,
  }));
  const [savingSched, setSavingSched] = useState(false);

  useEffect(() => {
    if (!resultMatch) return;

    setResult({
      num: resultMatch.num,
      round: resultMatch.round,
      date: resultMatch.date || todayISO(),
      time: resultMatch.time || "7:00 PM",
      teamA: resultMatch.teamA,
      teamB: resultMatch.teamB,
      scoreA: 2,
      scoreB: 1,
    });
    setResultError("");
  }, [resultMatch]);

  useEffect(() => {
    if (!scheduledMatch) return;

    setSched({
      id: scheduledMatch.id,
      num: scheduledMatch.num,
      round: scheduledMatch.round,
      date: scheduledMatch.date || todayISO(),
      time: scheduledMatch.time || "7:00 PM",
      teamA: scheduledMatch.teamA,
      teamB: scheduledMatch.teamB,
    });
  }, [scheduledMatch]);

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
      teamA: Number(result.teamA),
      teamB: Number(result.teamB),
      scoreA: Number(result.scoreA),
      scoreB: Number(result.scoreB),
    });
    setSavingResult(false);
    if (error) return setResultError(error);

    const nextNum =
      Math.max(
        1,
        ...matches.map((m) => Number(m.num) || 0),
        Number(result.num) || 0,
      ) + 1;
    const nextRound =
      Math.max(
        1,
        ...matches.map((m) => Number(m.round) || 0),
        Number(result.round) || 0,
      ) + 1;

    setResult((current) => ({
      ...current,
      num: nextNum,
      round: nextRound,
      date: todayISO(),
      time: "7:00 PM",
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
      teamA: Number(sched.teamA),
      teamB: Number(sched.teamB),
    });
    setSavingSched(false);
    if (error) return showToast(error, "error");

    const nextNum =
      Math.max(
        1,
        ...matches.map((m) => Number(m.num) || 0),
        Number(sched.num) || 0,
      ) + 1;
    const nextRound =
      Math.max(
        1,
        ...matches.map((m) => Number(m.round) || 0),
        Number(sched.round) || 0,
      ) + 1;

    setSched((current) => ({
      ...current,
      num: nextNum,
      round: nextRound,
      date: todayISO(),
      time: "7:00 PM",
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
