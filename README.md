# RMW — Reasoning Memory Workspace

A bilingual-interface, interruption-resilient research workspace for the CHI 2027 RMW study. Each participant is assigned one of three structurally matched urban-governance tasks (public libraries, waste sorting, or shared bikes), reads five Chinese experimental materials, collaborates with an evidence-grounded AI tutor, drafts a 600–900 Chinese-character memo, and recovers their reasoning after interruption.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Useful review routes:

- `/` — participant entry and full demo flow
- `/?view=topics` — assigned-task reveal (participants cannot self-select)
- `/?view=task` — Phase 1 and final memo requirements
- `/?view=work&task=library` — Phase 1 library task
- `/?view=work&task=waste` — Phase 1 waste-sorting task
- `/?view=work&task=bike` — Phase 1 shared-bike task
- `/?view=checkpoint` — pre-interruption prospective encoding and card calibration
- `/?view=interruption` — 2-back interruption task
- `/?view=day2` — Day 2 RMW workspace
- `/?view=day2&condition=summary&lang=en` — English Auto Summary condition
- `/?view=recall` — unsupported recall gate
- `/admin` — researcher console

The `task` query parameter is for researcher review only. The participant flow deterministically assigns a task from the anonymous participant code and does not expose a topic chooser. The deployed preview runs without secrets and stores demo interaction events in browser local storage. Configure `.env.local` from `.env.example` to enable DeepSeek and Supabase.

## DeepSeek

The server routes use DeepSeek's OpenAI-compatible Chat Completions API for evidence-grounded tutoring and pre-interruption reasoning-state extraction. Keep the key server-side:

```bash
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

Without `DEEPSEEK_API_KEY`, the tutor remains usable in scripted demo mode and the checkpoint uses neutral, low-confidence calibration candidates. It never inserts the researcher's answer key. In Vercel, add these values under Project Settings → Environment Variables and redeploy.

## Experimental-task controls

- Participant-facing code contains only the 15 stimulus passages and shared instructions. Researcher-only design annotations are intentionally excluded.
- All tasks use the same Phase 1 goals, memo questions, AI prompt version, temperature, and checkpoint schema.
- The English interface does not translate the validated Chinese stimulus paragraphs; an unpiloted translation must not become another task condition.
- The pre-survey records familiarity with the assigned topic as a covariate.
- Before the main study, pilot all three packs for subjective difficulty, number of framings identified, fragile-statistic detection, rejected-path identification, and prior familiarity. If the packs cannot be balanced, use one pack in the main study and move the others to tutorial/practice.

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
