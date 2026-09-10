import { useEffect, useState } from "react";
import { isConfigured } from "./lib/supabaseClient";
import { useAuth } from "./hooks/useAuth";
import { useTournament } from "./hooks/useTournament";
import { ToastProvider, useToast } from "./hooks/useToast";

import Nav from "./components/Nav";
import Hero from "./components/Hero";
import LoginModal from "./components/LoginModal";
import LockedNotice from "./components/LockedNotice";
import SetupScreen from "./components/SetupScreen";
import Standings from "./components/Standings";
import Matches from "./components/Matches";
import Schedule from "./components/Schedule";
import Teams from "./components/Teams";
import AdminPanel from "./components/AdminPanel";

function AppShell() {
  const [page, setPage] = useState("standings");
  const [showLogin, setShowLogin] = useState(false);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("bsis-theme");
    if (savedTheme) return savedTheme;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const { isAdmin, signIn, signOut } = useAuth();
  const showToast = useToast();
  const data = useTournament();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("bsis-theme", theme);
  }, [theme]);

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
          <div className="mb-6 h-28 animate-shimmer rounded-md border border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%]" />

          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="h-6 w-32 animate-shimmer rounded-sm border border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%]" />
              <div className="overflow-hidden rounded-md border border-ink-800">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[52px] animate-shimmer border-b border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%] last:border-b-0"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-6 w-28 animate-shimmer rounded-sm border border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%]" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-shimmer rounded-md border border-ink-800 bg-[linear-gradient(90deg,#18181b_25%,#232326_50%,#18181b_75%)] bg-[length:200%_100%]"
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
      <div className="min-h-screen">
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
    <div className="min-h-screen">
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
      <Hero
        teams={data.teams}
        matches={data.matches}
        syncStatus={data.syncStatus}
      />
      {content}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSignIn={handleSignIn}
        />
      )}
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
