# RMW — Reasoning Memory Workspace

A bilingual, interruption-resilient research workspace for the CHI 2027 RMW study. The public preview includes a complete demo path for participant onboarding, pre-survey, tutorial, Day 2 recall, three recovery conditions, an interactive reasoning-card workspace, a synchronized knowledge network, and a researcher console.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Useful review routes:

- `/` — participant entry and full demo flow
- `/?view=checkpoint` — pre-interruption prospective encoding and card calibration
- `/?view=interruption` — 2-back interruption task
- `/?view=day2` — Day 2 RMW workspace
- `/?view=day2&condition=summary&lang=en` — English Auto Summary condition
- `/?view=recall` — unsupported recall gate
- `/admin` — researcher console

The deployed preview runs without secrets and stores demo interaction events in browser local storage. Configure `.env.local` from `.env.example` to enable a compatible LLM endpoint and Supabase.

## Implemented RMW study loop

The demo now follows one closed-loop interruption protocol:

1. Extract candidate problem state from chat, materials, memo, and interaction traces.
2. Ask the participant to calibrate the main goal, 2–4 active subgoals, suspended goals, an uncertain hypothesis, a rejected path, and one minimum next action.
3. Preserve provenance, extraction confidence, epistemic status, and per-card actions (`Accept`, `Edit`, `Pin`, `Uncertain`, `Expire`).
4. Run a short 2-back interruption task.
5. Collect unsupported recall before revealing recovery support.
6. Resume with a minimal brief first, then the full goal hierarchy, reasoning cards, source backlinks, and knowledge network.

The researcher console can export the local demo event stream as JSON. The production schema in `supabase/migrations/202607140001_initial_schema.sql` includes server-mediated sessions, extraction runs, cards, sources, relations, recovery artifacts, recall responses, and sequenced events.

Use `pnpm sites:build` to produce the edge-deployable bundle in `dist/`.

## Data and security

The initial Supabase schema is in `supabase/migrations/202607140001_initial_schema.sql`. Tables use RLS and revoke `anon`/`authenticated` access because participant traffic is server-mediated. Never expose the Supabase secret key or LLM API key to the browser.
