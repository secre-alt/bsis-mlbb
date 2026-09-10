import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(
  url && anonKey && !url.includes('YOUR-PROJECT-REF')
);

// The anon key is a public, RLS-scoped key by design — it's meant to ship
// in client code. It grants nothing on its own; every read/write it makes
// is still checked against the Row Level Security policies in
// supabase-schema.sql. It is NOT the same thing as an admin credential.
export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
