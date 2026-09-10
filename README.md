# BSIS MLBB Intramurals — Standings

A React + Supabase app for tournament standings, results, schedule, and
organizer (admin) match entry, with live realtime updates.

## What changed from the original file

- **Rebuilt in React** (Vite) instead of hand-rolled DOM string templates —
  proper components, hooks, and state instead of `innerHTML` re-renders.
- **Polished, distinct visual identity** — an esports scoreboard look
  (condensed display type, ember/rift accent colors, round-grouped
  schedule) instead of generic dashboard styling, still fully responsive
  and keyboard-accessible.
- **Real security fix (see below)** — the old version's "admin mode" was a
  password typed into a JavaScript prompt, compared against a plaintext
  password sitting in the page's own source code. Anyone who opened dev
  tools could read `ADMIN_PASSWORD` directly, or just call the Supabase
  client in the console to write data without ever entering it, because
  the anon key already had unrestricted write access. That has been
  replaced with real Supabase Auth accounts plus database-level
  permissions — see **Security model** below.

## Security model

1. **No secrets in the bundle.** There's no password baked into the
   JavaScript anymore. Organizer accounts are real Supabase Auth users
   (email + password), created once in the Supabase dashboard.
2. **The database enforces write access, not the UI.** `supabase-schema.sql`
   turns on Row Level Security and only allows `insert`/`update`/`delete`
   on `teams` and `matches` for user ids listed in an `admins` table.
   Signing in isn't enough by itself — being *listed* is what grants
   access. This means the check can't be bypassed from the browser
   console the way the old client-side `isAdmin` flag could be.
3. **The anon key is meant to be public.** `VITE_SUPABASE_ANON_KEY` is
   still visible in the shipped app — that's how Supabase's client keys
   work by design. It's kept out of source control anyway (`.env` is
   git-ignored, `.env.example` is the template) as good practice, but the
   real boundary is the RLS policies, not key secrecy.
4. **No public sign-up.** There's intentionally no "create account" flow
   in the app, so the only way to become an organizer is for someone with
   dashboard access to create the account and add it to `admins`.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run `supabase-schema.sql`.
3. Go to **Authentication → Users** and add one user per organizer
   (email + password). Copy each new user's UUID.
4. In the SQL Editor, grant admin access to those accounts:
   ```sql
   insert into admins (user_id) values ('paste-the-user-uuid-here');
   ```
5. Go to **Project Settings → API** and copy the Project URL and anon
   public key.
6. Copy `.env.example` to `.env` and paste those values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
7. Install and run:
   ```bash
   npm install
   npm run dev
   ```

## Deploying

`npm run build` produces a static `dist/` folder — deploy it to Vercel,
Netlify, Cloudflare Pages, GitHub Pages, or any static host. Set the two
`VITE_SUPABASE_*` variables in that host's environment/build settings
(not just in a local `.env`, since `.env` isn't committed).

## Project structure

```
src/
  lib/            supabase client, standings math, color tokens
  hooks/          useAuth (sign-in/out + admin check), useTournament
                  (data + realtime + writes), useToast
  components/     one file per page/piece of UI
supabase-schema.sql   tables, RLS policies, admin-check function
```

## Notes on scope

Deleting a team cascades to its matches at the database level
(`on delete cascade`) — organizers get a confirmation prompt before that
happens. Match numbers are unique; recording a result for an existing
match number updates that match rather than creating a duplicate, same
as the original.
