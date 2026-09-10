import { useEffect, useState } from "react";
import {
  Clock3,
  LockKeyhole,
  LogOut,
  Menu,
  MoonStar,
  ShieldCheck,
  SunMedium,
  X,
} from "lucide-react";

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
  theme,
  onToggleTheme,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (target) => {
    onNavigate(target);
    setIsOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)] backdrop-blur">
      <div className="mx-auto max-w-6xl px-5 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center gap-1.5 font-display text-[15px] font-black tracking-[0.18em] sm:text-[17px]">
            <span className="text-ember-500">BSIS</span>
            <span className="text-inherit">MLBB</span>
          </div>

          <div className="hidden flex-1 flex-wrap items-center gap-1 md:flex">
            {PUBLIC_TABS.map((t) => (
              <TabButton
                key={t.id}
                tab={t}
                active={page === t.id}
                onClick={handleNavigate}
              />
            ))}
            {isAdmin && (
              <div className="ml-2 flex items-center gap-1 rounded-full border border-ink-700/80 bg-ink-800/50 px-1.5 py-1">
                <span className="px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-500">
                  Admin
                </span>
                {ADMIN_TABS.map((t) => (
                  <TabButton
                    key={t.id}
                    tab={t}
                    active={page === t.id}
                    onClick={handleNavigate}
                    admin
                  />
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto hidden shrink-0 items-center gap-2.5 md:flex">
            <LiveClock theme={theme} />
            <ThemeToggleButton theme={theme} onToggleTheme={onToggleTheme} />
            <NavAction
              isAdmin={isAdmin}
              onLoginClick={onLoginClick}
              onSignOut={onSignOut}
            />
          </div>

          <div className="ml-auto flex items-center gap-2 md:hidden">
            <LiveClock compact theme={theme} />
            <ThemeToggleButton
              theme={theme}
              onToggleTheme={onToggleTheme}
              compact
            />
            <button
              type="button"
              aria-label={
                isOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={isOpen}
              onClick={() => setIsOpen((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-ink-700 text-ink-300 transition hover:border-ink-600 hover:text-white"
            >
              {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
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

            {isAdmin && (
              <div className="mt-3 border-t border-ink-800 pt-3">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-ink-800" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-500">
                    Admin
                  </span>
                  <div className="h-px flex-1 bg-ink-800" />
                </div>
                <div className="flex flex-col gap-1">
                  {ADMIN_TABS.map((t) => (
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
              </div>
            )}

            <div className="mt-3 border-t border-ink-800 pt-3">
              <div className="flex flex-col gap-2">
                <ThemeToggleButton
                  theme={theme}
                  onToggleTheme={onToggleTheme}
                  fullWidth
                />
                <NavAction
                  isAdmin={isAdmin}
                  onLoginClick={onLoginClick}
                  onSignOut={onSignOut}
                  mobile
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function LiveClock({ compact = false, theme = "dark" }) {
  const [now, setNow] = useState(() => new Date());
  const isLight = theme === "light";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const manilaTime = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-colors duration-200 ${
        isLight
          ? "border-slate-200 bg-white/90 text-slate-700"
          : "border-ink-700 bg-ink-800/60 text-ink-500"
      }`}
    >
      <Clock3 size={11} className="text-ember-500" />
      {!compact && (
        <span className={isLight ? "text-slate-500" : "text-ink-600"}>PHT</span>
      )}
      <span>{manilaTime}</span>
    </div>
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
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ${
        fullWidth ? "w-full text-left" : ""
      } ${
        active
          ? admin
            ? "bg-ember-500/10 text-ember-400 shadow-[inset_0_0_0_1px_rgba(255,90,31,0.18),0_0_20px_rgba(255,90,31,0.12)]"
            : "bg-ink-800 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_0_18px_rgba(255,90,31,0.08)]"
          : admin
            ? "text-ink-600 hover:bg-slate-200 hover:text-ember-400"
            : "text-ink-500 hover:bg-slate-200 hover:text-slate-800"
      }`}
    >
      {tab.label}
    </button>
  );
}

function ThemeToggleButton({
  theme,
  onToggleTheme,
  compact = false,
  fullWidth = false,
}) {
  const isDark = theme === "dark";
  const activeIconClass = isDark ? "text-white" : "text-amber-900";
  const inactiveIconClass = isDark ? "text-ink-500" : "text-slate-500";
  const activeLabelClass = isDark ? "text-white" : "text-amber-900";
  const inactiveLabelClass = isDark ? "text-ink-500" : "text-slate-500";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={!isDark}
      onClick={onToggleTheme}
      className={`theme-toggle-shell group relative overflow-hidden rounded-full border p-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ease-out hover:scale-[1.01] ${
        compact ? "h-9 w-14" : "h-9 w-[94px]"
      } ${fullWidth ? "w-full" : ""}`}
    >
      <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_55%)] opacity-70 transition-opacity duration-300 ease-out" />
      <span
        className="theme-toggle-knob absolute inset-y-1 rounded-full bg-gradient-to-br from-ember-500 to-amber-400 transition-all duration-300 ease-out"
        style={{
          left: isDark ? "0.25rem" : "calc(50% + 0.125rem)",
          width: "calc(50% - 0.375rem)",
        }}
      />

      <span className="relative z-10 grid h-full w-full grid-cols-2">
        <span className="flex items-center justify-center gap-1.5 text-ink-300">
          <MoonStar
            size={12}
            className={isDark ? activeIconClass : inactiveIconClass}
          />
          {!compact && (
            <span className={isDark ? activeLabelClass : inactiveLabelClass}>
              Dark
            </span>
          )}
        </span>

        <span className="flex items-center justify-center gap-1.5 text-ink-300">
          {!compact && (
            <span className={isDark ? inactiveLabelClass : activeLabelClass}>
              Light
            </span>
          )}
          <SunMedium
            size={12}
            className={isDark ? inactiveIconClass : activeIconClass}
          />
        </span>
      </span>
    </button>
  );
}
