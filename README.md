# RMW — Reasoning Memory Workspace

A bilingual, interruption-resilient research workspace for the CHI 2027 RMW study. The public preview includes a complete demo path for participant onboarding, pre-survey, tutorial, Day 2 recall, three recovery conditions, an interactive reasoning-card workspace, a synchronized knowledge network, and a researcher console.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Useful review routes:

- `/` — participant entry and full demo flow
- `/?view=day2` — Day 2 RMW workspace
- `/?view=day2&condition=summary&lang=en` — English Auto Summary condition
- `/?view=recall` — unsupported recall gate
- `/admin` — researcher console

The deployed preview runs without secrets and stores demo interaction events in browser local storage. Configure `.env.local` from `.env.example` to enable a compatible LLM endpoint and Supabase.

## Data and security

The initial Supabase schema is in `supabase/migrations/202607140001_initial_schema.sql`. Tables use RLS and revoke `anon`/`authenticated` access because participant traffic is server-mediated. Never expose the Supabase secret key or LLM API key to the browser.
