import { lazy, Suspense, useEffect, useState } from "react";
import { isConfigured } from "./lib/supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { useTournament } from "./hooks/useTournament";
import { useVisitorPresence } from "./hooks/useVisitorPresence";
import { ToastProvider, useToast } from "./hooks/useToast";

const PWA_UPDATE_MESSAGE = "A new version is ready. Refresh to update.";

import Nav from "./components/Nav";
import Hero from "./components/Hero";
import LockedNotice from "./components/LockedNotice";
import SetupScreen from "./components/SetupScreen";
import Standings from "./components/Standings";

// These views are not needed to render the public standings page. Loading
// them only when requested keeps the first visit lean on slow connections.
const LoginModal = lazy(() => import("./components/LoginModal"));
const Matches = lazy(() => import("./components/Matches"));
const Schedule = lazy(() => import("./components/Schedule"));
const Teams = lazy(() => import("./components/Teams"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));

function AppShell() {
  const [page, setPage] = useState(() => {
    const savedPage = localStorage.getItem("bsis-page");
    if (savedPage) return savedPage;
    return "standings";
  });
  const [showLogin, setShowLogin] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("bsis-theme");
    if (savedTheme) return savedTheme;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const { isAdmin, signIn, signOut } = useAuth();
  const onlineVisitors = useVisitorPresence();
  const showToast = useToast();
  const data = useTournament();

  useEffect(() => {
    const onPwaUpdateReady = () => {
      showToast(PWA_UPDATE_MESSAGE, "success");
    };

    window.addEventListener("pwa-update-ready", onPwaUpdateReady);

    return () => {
      window.removeEventListener("pwa-update-ready", onPwaUpdateReady);
    };
  }, [showToast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("bsis-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("bsis-page", page);
  }, [page]);

  const navigate = (target) => {
    if ((target === "admin" || target === "teams") && !isAdmin) {
      setShowLogin(true);
      return;
    }
    setPage(target);
  };

  if (data.loading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
        <Nav
          page={page}
          onNavigate={navigate}
          isAdmin={false}
          onLoginClick={() => {}}
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
        />

        <div className="mx-auto max-w-6xl px-5 py-6">
          <div className="mb-6 h-28 animate-shimmer rounded-md border border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%]" />

          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="h-6 w-32 animate-shimmer rounded-sm border border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%]" />
              <div className="overflow-hidden rounded-md border border-[var(--line)]">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[52px] animate-shimmer border-b border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%] last:border-b-0"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-6 w-28 animate-shimmer rounded-sm border border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%]" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-shimmer rounded-md border border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSignIn = async (email, password) => {
    const { error } = await signIn(email, password);
    if (!error) {
      setShowLogin(false);
      showToast("Admin access granted", "success");
      setPage("admin");
    }
    return { error };
  };

  const handleSignOut = async () => {
    await signOut();
    setPage("standings");
    showToast("Signed out of admin");
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
        <Nav
          page={page}
          onNavigate={navigate}
          isAdmin={false}
          onLoginClick={() => {}}
          theme={theme}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
        />
        <SetupScreen />
      </div>
    );
  }

  let content;
  if (page === "standings") {
    content = <Standings {...data} />;
  } else if (page === "matches") {
    content = <Matches {...data} />;
  } else if (page === "schedule") {
    content = <Schedule {...data} />;
  } else if (page === "teams") {
    content = isAdmin ? (
      <Teams {...data} />
    ) : (
      <LockedNotice
        title="Teams — Admin only"
        onLoginClick={() => setShowLogin(true)}
      />
    );
  } else if (page === "admin") {
    content = isAdmin ? (
      <AdminPanel {...data} onDone={() => setPage("standings")} />
    ) : (
      <LockedNotice
        title="Enter result — Admin only"
        onLoginClick={() => setShowLogin(true)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)] text-[var(--text)]">
      <Nav
        page={page}
        onNavigate={navigate}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLogin(true)}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />

      <div className="flex-1">
        <Hero
          teams={data.teams}
          matches={data.matches}
          syncStatus={data.syncStatus}
          onlineVisitors={onlineVisitors}
          isAdmin={isAdmin}
        />
        {(!navigator.onLine || data.syncStatus === "offline") && (
          <div className="mx-auto max-w-6xl px-5 pb-0 pt-4">
            <div className="rounded-md border border-blood-500/30 bg-blood-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blood-500">
              Offline mode · showing last synced data
            </div>
          </div>
        )}
        <Suspense fallback={<PageLoading />}>{content}</Suspense>
      </div>

      {showLogin && (
        <Suspense fallback={null}>
          <LoginModal
            onClose={() => setShowLogin(false)}
            onSignIn={handleSignIn}
          />
        </Suspense>
      )}

      <footer className="border-t border-[var(--line)] bg-[var(--panel-soft)]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4 text-[10px] font-medium tracking-[0.08em] text-[var(--muted)]">
          <span className="inline-flex items-center gap-2 text-center">
            <span
              className="font-medium text-[var(--muted)]"
              aria-label="Made with love"
            >
              Made with
            </span>
            <span
              className="text-base leading-none text-[var(--accent)]"
              aria-hidden="true"
            >
              ♥
            </span>
            <span className="font-medium text-[var(--muted)]">by</span>
            <span className="text-[11px] font-black tracking-[0.16em] text-[var(--accent)] drop-shadow-[0_0_12px_rgba(255,120,56,0.28)]">
              secre-alt
            </span>
          </span>

          <a
            href="https://www.facebook.com/rencruxx/"
            target="_blank"
            rel="noreferrer"
            aria-label="Visit Facebook profile"
            title="Facebook"
            className="group inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--panel)] text-[var(--accent)] shadow-[0_0_0_1px_rgba(255,120,56,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--panel)] hover:shadow-[0_0_0_1px_rgba(255,120,56,0.4),0_0_18px_rgba(255,120,56,0.30)]"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-3.5 w-3.5 fill-current transition-transform duration-300 ease-out group-hover:scale-110"
            >
              <path d="M13.5 22v-8h2.5l.5-3h-3V7.5c0-.9.3-1.5 1.6-1.5H16V3.2c-.3 0-1.2-.2-2.3-.2-2.3 0-3.9 1.4-3.9 4V11H8v3h2.8v8h2.7Z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <div className="h-64 animate-shimmer rounded-md border border-[var(--line)] bg-[linear-gradient(90deg,var(--panel-soft)_25%,var(--panel-subtle)_50%,var(--panel-soft)_75%)] bg-[length:200%_100%]" />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
