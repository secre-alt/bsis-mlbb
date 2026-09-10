import { Lock } from 'lucide-react';

export default function LockedNotice({ title, onLoginClick }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <div className="rounded-md border border-ink-800 bg-ink-900 px-6 py-12 text-center">
        <Lock className="mx-auto mb-3 text-ink-600" size={26} />
        <div className="text-xs font-bold uppercase tracking-wider text-ink-500">{title}</div>
        <p className="mt-1.5 text-xs text-ink-700">This section is for organizers only.</p>
        <button
          onClick={onLoginClick}
          className="mt-5 rounded-sm bg-ember-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:opacity-90"
        >
          Enter organizer login
        </button>
      </div>
    </div>
  );
}
