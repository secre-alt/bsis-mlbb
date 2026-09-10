import { useState } from 'react';
import { isConfigured } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { useTournament } from './hooks/useTournament';
import { ToastProvider, useToast } from './hooks/useToast';

import Nav from './components/Nav';
import Hero from './components/Hero';
import LoginModal from './components/LoginModal';
import LockedNotice from './components/LockedNotice';
import SetupScreen from './components/SetupScreen';
import Standings from './components/Standings';
import Matches from './components/Matches';
import Schedule from './components/Schedule';
import Teams from './components/Teams';
import AdminPanel from './components/AdminPanel';

function AppShell() {
  const [page, setPage] = useState('standings');
  const [showLogin, setShowLogin] = useState(false);
  const { isAdmin, signIn, signOut } = useAuth();
  const showToast = useToast();
  const data = useTournament();

  const navigate = (target) => {
    if ((target === 'admin' || target === 'teams') && !isAdmin) {
      setShowLogin(true);
      return;
    }
    setPage(target);
  };

  const handleSignIn = async (email, password) => {
    const { error } = await signIn(email, password);
    if (!error) {
      setShowLogin(false);
      showToast('Admin access granted', 'success');
      setPage('admin');
    }
    return { error };
  };

  const handleSignOut = async () => {
    await signOut();
    setPage('standings');
    showToast('Signed out of admin');
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen">
        <Nav page={page} onNavigate={navigate} isAdmin={false} onLoginClick={() => {}} />
        <SetupScreen />
      </div>
    );
  }

  let content;
  if (page === 'standings') {
    content = <Standings {...data} />;
  } else if (page === 'matches') {
    content = <Matches {...data} />;
  } else if (page === 'schedule') {
    content = <Schedule {...data} />;
  } else if (page === 'teams') {
    content = isAdmin ? (
      <Teams {...data} />
    ) : (
      <LockedNotice title="Teams — Admin only" onLoginClick={() => setShowLogin(true)} />
    );
  } else if (page === 'admin') {
    content = isAdmin ? (
      <AdminPanel {...data} onDone={() => setPage('standings')} />
    ) : (
      <LockedNotice title="Enter result — Admin only" onLoginClick={() => setShowLogin(true)} />
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
      />
      <Hero teams={data.teams} matches={data.matches} syncStatus={data.syncStatus} />
      {content}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onSignIn={handleSignIn} />
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
