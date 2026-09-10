import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const refreshAdminStatus = useCallback(async (currentSession) => {
    if (!currentSession) {
      setIsAdmin(false);
      return;
    }
    setCheckingAdmin(true);
    // is_admin() is a security-definer SQL function — the real
    // authorization check lives in Postgres (see supabase-schema.sql),
    // this just mirrors it for the UI.
    const { data, error } = await supabase.rpc('is_admin');
    setIsAdmin(Boolean(data) && !error);
    setCheckingAdmin(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      refreshAdminStatus(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      refreshAdminStatus(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshAdminStatus]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { session, isAdmin, checkingAdmin, signIn, signOut };
}
