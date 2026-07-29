# RMW — Reasoning Memory Workspace

A bilingual, interruption-resilient research workspace for the CHI 2027 RMW study. Every participant completes the same urban waste-sorting governance task, reads five validated Chinese stimulus passages, collaborates with an evidence-grounded AI tutor, drafts a 600–900 Chinese-character memo, and recovers their reasoning after interruption.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Researcher review routes:

- `/` — participant entry and complete experiment flow
- `/?view=task` — task brief and memo requirements
- `/?view=work` — Phase 1 workspace and spotlight onboarding
- `/?view=checkpoint` — pre-interruption reasoning-state calibration
- `/?view=interruption` — 2-back interruption task
- `/?view=recall` — unsupported recall gate
- `/?view=day2` — RMW recovery workspace
- `/?view=day2&condition=summary&lang=en` — English Auto Summary condition
- `/admin` — researcher console

The participant entry does not expose review shortcuts or a topic selector. Primary page transitions use short countdown gates, and required-response pages remain locked until all items are complete.

## Pre-task measures

The pre-task page contains three constructs, each measured by multiple clickable 5-point items:

1. AI use and evaluation: a task-specific short-form adaptation informed by the Use and Evaluation dimensions of the [Artificial Intelligence Literacy Scale](https://doi.org/10.1080/0144929X.2022.2072768).
2. Research-task self-efficacy: task-specific items informed by the conceptualization and research-design dimensions of the [Research Self-Efficacy Scale](https://doi.org/10.1177/106907279600400104) and [Self-Efficacy in Research Measure](https://doi.org/10.1177/07342829231204507).
3. Prior topic familiarity: researcher-authored covariate items for the waste-sorting task.

These are adaptations for this experimental context, not the original validated scales or their original scoring systems. The task-specific wording and 5-point response format must be piloted and reported as adapted measures.

## DeepSeek

The server routes use DeepSeek's OpenAI-compatible Chat Completions API for evidence-grounded tutoring and pre-interruption reasoning-state extraction. Keep the key server-side:

```bash
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

Without `DEEPSEEK_API_KEY`, the tutor remains usable in scripted demo mode and the checkpoint uses neutral, low-confidence calibration candidates. It never inserts a researcher answer key. In Vercel, add the values under Project Settings → Environment Variables and redeploy.

## Experimental controls

- Participant-facing code contains one question and five waste-sorting stimulus passages.
- The English interface does not translate the validated Chinese stimulus paragraphs; an unpiloted translation must not become another task condition.
- The former standalone tutorial page is replaced by a four-step spotlight guide over the live workspace.
- The guide introduces materials, AI chat, memo, and Phase 1 goals in sequence and can be reopened from Help.
- AI prompts require material-number backlinks and separation of evidence, inference, and uncertainty.
- Participant interactions, survey choices, countdown-gated transitions, tour steps, chat, memo edits, and card calibration actions are logged as events.

## Implemented RMW loop

1. Read the task brief and complete the three-construct pre-task measure.
2. Follow the spotlight guide, read five materials, compare framings with AI, and write the memo.
3. Extract and calibrate the candidate goal hierarchy, uncertain hypothesis, rejected path, and minimum next action.
4. Complete the 2-back interruption task.
5. Complete unsupported recall before recovery support is revealed.
6. Resume from a minimal brief, reasoning cards, source backlinks, and knowledge network.

The researcher console can export the local demo event stream as JSON. The production schema in `supabase/migrations/202607140001_initial_schema.sql` uses RLS and revokes direct participant access because traffic is server-mediated. Never expose a Supabase secret or LLM API key to the browser.

Use `pnpm sites:build` to produce the edge-deployable bundle in `dist/`.
