import { LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';

const PUBLIC_TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'matches', label: 'Matches' },
  { id: 'schedule', label: 'Schedule' },
];
const ADMIN_TABS = [
  { id: 'teams', label: 'Teams' },
  { id: 'admin', label: 'Enter result' },
];

export default function Nav({ page, onNavigate, isAdmin, onLoginClick, onSignOut }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto flex h-13 max-w-6xl items-center gap-6 px-5 py-2.5">
        <div className="flex shrink-0 items-center gap-1.5 font-display text-sm font-bold tracking-[0.15em]">
          <span className="text-ember-500">BSIS</span>
          <span>MLBB</span>
        </div>

        <div className="flex flex-1 flex-wrap gap-1">
          {PUBLIC_TABS.map((t) => (
            <TabButton key={t.id} tab={t} active={page === t.id} onClick={onNavigate} />
          ))}
          {isAdmin &&
            ADMIN_TABS.map((t) => (
              <TabButton key={t.id} tab={t} active={page === t.id} onClick={onNavigate} admin />
            ))}
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {isAdmin ? (
            <>
              <span className="hidden items-center gap-1 rounded-sm border border-ember-500/30 bg-ember-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ember-400 sm:inline-flex">
                <ShieldCheck size={11} /> Admin
              </span>
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 rounded-sm border border-ink-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 transition hover:border-ink-600 hover:text-ink-300"
              >
                <LogOut size={11} /> Sign out
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-sm border border-ink-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 transition hover:border-ink-600 hover:text-ink-300"
            >
              <LockKeyhole size={11} /> Organizer login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function TabButton({ tab, active, onClick, admin }) {
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        active
          ? admin
            ? 'bg-ember-500/10 text-ember-400'
            : 'bg-ink-800 text-white'
          : admin
          ? 'text-ink-600 hover:text-ember-400'
          : 'text-ink-500 hover:text-white'
      }`}
    >
      {tab.label}
    </button>
  );
}
