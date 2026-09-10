import { useState } from "react";
import { LockKeyhole, LogOut, Menu, ShieldCheck, X } from "lucide-react";

const PUBLIC_TABS = [
  { id: "standings", label: "Standings" },
  { id: "matches", label: "Matches" },
  { id: "schedule", label: "Schedule" },
];
const ADMIN_TABS = [
  { id: "teams", label: "Teams" },
  { id: "admin", label: "Enter result" },
];

export default function Nav({
  page,
  onNavigate,
  isAdmin,
  onLoginClick,
  onSignOut,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (target) => {
    onNavigate(target);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 font-display text-sm font-bold tracking-[0.15em]">
            <span className="text-ember-500">BSIS</span>
            <span>MLBB</span>
          </div>

          <div className="hidden flex-1 flex-wrap gap-1 md:flex">
            {PUBLIC_TABS.map((t) => (
              <TabButton
                key={t.id}
                tab={t}
                active={page === t.id}
                onClick={handleNavigate}
              />
            ))}
            {isAdmin &&
              ADMIN_TABS.map((t) => (
                <TabButton
                  key={t.id}
                  tab={t}
                  active={page === t.id}
                  onClick={handleNavigate}
                  admin
                />
              ))}
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2.5 md:flex">
            <NavAction
              isAdmin={isAdmin}
              onLoginClick={onLoginClick}
              onSignOut={onSignOut}
            />
          </div>

          <button
            type="button"
            aria-label={
              isOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-sm border border-ink-700 text-ink-300 transition hover:border-ink-600 hover:text-white md:hidden"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 border-t border-ink-800 pt-3 md:hidden">
            <div className="flex flex-col gap-1">
              {PUBLIC_TABS.map((t) => (
                <TabButton
                  key={t.id}
                  tab={t}
                  active={page === t.id}
                  onClick={handleNavigate}
                  fullWidth
                />
              ))}
              {isAdmin &&
                ADMIN_TABS.map((t) => (
                  <TabButton
                    key={t.id}
                    tab={t}
                    active={page === t.id}
                    onClick={handleNavigate}
                    admin
                    fullWidth
                  />
                ))}
            </div>

            <div className="mt-3 border-t border-ink-800 pt-3">
              <NavAction
                isAdmin={isAdmin}
                onLoginClick={onLoginClick}
                onSignOut={onSignOut}
                mobile
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavAction({ isAdmin, onLoginClick, onSignOut, mobile = false }) {
  if (isAdmin) {
    return (
      <>
        <span className="hidden items-center gap-1 rounded-sm border border-ember-500/30 bg-ember-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ember-400 sm:inline-flex">
          <ShieldCheck size={11} /> Admin
        </span>
        <button
          onClick={onSignOut}
          className={`flex items-center justify-center gap-1.5 rounded-sm border border-ink-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 transition hover:border-ink-600 hover:text-ink-300 ${
            mobile ? "w-full" : ""
          }`}
        >
          <LogOut size={11} /> Sign out
        </button>
      </>
    );
  }

  return (
    <button
      onClick={onLoginClick}
      className={`flex items-center justify-center gap-1.5 rounded-sm border border-ink-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-500 transition hover:border-ink-600 hover:text-ink-300 ${
        mobile ? "w-full" : ""
      }`}
    >
      <LockKeyhole size={11} /> Organizer login
    </button>
  );
}

function TabButton({ tab, active, onClick, admin, fullWidth = false }) {
  return (
    <button
      onClick={() => onClick(tab.id)}
      className={`rounded-sm px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        fullWidth ? "w-full text-left" : ""
      } ${
        active
          ? admin
            ? "bg-ember-500/10 text-ember-400"
            : "bg-ink-800 text-white"
          : admin
            ? "text-ink-600 hover:text-ember-400"
            : "text-ink-500 hover:text-white"
      }`}
    >
      {tab.label}
    </button>
  );
}
