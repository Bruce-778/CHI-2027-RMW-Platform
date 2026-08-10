# RMW — Reasoning Memory Workspace

A bilingual-interface, interruption-resilient research workspace for the CHI 2027 RMW study. Every participant completes the same urban waste-sorting governance task, reads five validated Chinese experimental materials, collaborates with an evidence-grounded AI tutor, drafts a 600–900 Chinese-character memo, and recovers their reasoning after interruption.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Useful review routes:

- `/` — participant entry and full demo flow
- `/?view=task` — Phase 1 and final memo requirements
- `/?view=work` — Phase 1 waste-sorting workspace
- `/?view=checkpoint` — one-minute RMW save window with an extracted problem state and knowledge network
- `/?view=interruption` — letter 2-back and color-recognition interruption tasks
- `/?view=recovery` — RMW recovery workspace
- `/?view=recovery&condition=summary&lang=en` — English Auto Summary condition
- `/?view=recall` — unsupported recall gate

The participant flow uses one fixed task and does not expose a topic chooser. Interaction events remain in browser local storage. Configure `.env.local` from `.env.example` to enable DeepSeek.

The current build starts in **test mode**: timing gates are bypassed so every screen can be reviewed immediately. Add `?timed=1` to a direct route to check the formal protocol. The formal Phase 1 duration is 10 minutes; its save window opens in the final three minutes.

## DeepSeek

The server routes use DeepSeek's OpenAI-compatible Chat Completions API for evidence-grounded tutoring and pre-interruption reasoning-state extraction. Keep the key server-side:

```bash
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

Create `.env.local` in this directory, add the values above, and restart `npm run dev`. Do not prefix the key with `NEXT_PUBLIC_`, paste it into a component, or commit `.env.local`.

The participant does not choose the model. The server uses `DEEPSEEK_MODEL`, falling back to `deepseek-v4-flash`. Without `DEEPSEEK_API_KEY`, the tutor reports that AI is unavailable and the checkpoint does not generate or display a Problem State. The platform never substitutes scripted replies or preset cards for a failed or unavailable model call. In Vercel, add the same values under Project Settings → Environment Variables and redeploy.

## Experimental-task controls

- Participant-facing code uses one research question and five waste-sorting passages. Researcher-only design annotations are intentionally excluded.
- The English interface does not translate the validated Chinese stimulus paragraphs; an unpiloted translation must not become another task condition.
- The pre-task page measures AI use/evaluation, research-task self-efficacy, and prior topic familiarity with multiple 5-point items. These task-specific adaptations must be piloted and reported as adapted measures.

## Implemented RMW study loop

The demo now follows one closed-loop interruption protocol:

1. On entering the save window, attempt to extract candidate problem state from participant-authored memo and chat content. The prefilled task template and assistant greeting do not count as participant reasoning.
2. In the formal timed protocol, run Phase 1 for 10 minutes and open the save window only in its last three minutes. Test mode bypasses this gate.
3. Present the extracted main goal, active and suspended subgoals, rejected path, concise candidate problem state, and a card-linked knowledge network. Participants can select cards and calibrate them with `Accept`, `Edit`, `Pin`, `Uncertain`, and `Expire`.
4. In the formal timed protocol, keep the save window visible for at least one minute before the participant can continue. Test mode bypasses this gate.
5. Run both a letter 2-back task and a color-recognition task. Each task requires a perfect score; otherwise it restarts.
6. Collect three unsupported-recall responses before revealing recovery support.
7. Resume with a minimal brief first, then reasoning cards, source backlinks, and the knowledge network.
8. Continue research with editable reasoning cards while the local interaction history supports the current browser session.

For local review, test mode is the default and bypasses the Phase 1 and checkpoint waiting gates. Append `?timed=1` (or `&timed=1` when a query already exists) to enforce the 10-minute Phase 1 gate and one-minute save window.

The DeepSeek tutor uses a conversational research-partner prompt: it responds to the participant's current intent, uses ordinary short paragraphs, structures only when useful, cites materials for consequential claims, and preserves uncertainty without forcing fixed labels or a repeated answer template. The extraction prompt separately produces the bounded reasoning-card set and relations for the knowledge network from the same trace.

Use `npm run sites:build` to produce the edge-deployable bundle in `dist/`.
