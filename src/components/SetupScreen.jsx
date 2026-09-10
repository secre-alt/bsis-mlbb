const STEPS = [
  <>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-ember-500 hover:underline">supabase.com</a></>,
  <>Run <code className="rounded-sm border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">supabase-schema.sql</code> in the Supabase SQL Editor</>,
  <>Copy your Project URL and anon key from <b>Project Settings → API</b></>,
  <>Create organizer accounts in <b>Authentication → Users</b>, then add their user id to the <code className="rounded-sm border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">admins</code> table</>,
  <>Copy <code className="rounded-sm border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">.env.example</code> to <code className="rounded-sm border border-ink-700 bg-ink-800 px-1.5 py-0.5 font-mono text-[11px]">.env</code> and fill in the URL and key, then restart the dev server</>,
];

export default function SetupScreen() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <div className="rounded-md border border-ink-800 bg-ink-900 p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ember-500">
          Setup required
        </p>
        <h2 className="mt-1 font-display text-xl font-bold">Connect Supabase</h2>
        <p className="mt-2 mb-6 text-xs leading-relaxed text-ink-500">
          This app needs a Supabase project for data and organizer sign-in. See the README for full details.
        </p>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-700 bg-ink-800 text-[10px] font-bold text-ink-500">
                {i + 1}
              </span>
              <span className="text-xs leading-relaxed text-ink-400">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
