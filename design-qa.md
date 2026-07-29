# Design QA

## Scope

Reference screenshots supplied by the researcher were compared side by side with the implemented 1440 × 900 states:

- `artifacts/design-qa/work-comparison.png`
- `artifacts/design-qa/checkpoint-comparison.png`

Additional checks were performed at 1280 × 800 for both Chinese and English entry/workspace layouts.

## Result: PASS

No open P0, P1, or P2 visual defects remain in the requested flow.

### Workspace

- Preserves the neutral, light research-workbench appearance, restrained indigo accent, fine borders, and high-density desktop layout.
- Uses the planned Materials / AI / Memo + Stage Goals hierarchy.
- Header contains only the phase tag (`第一阶段` / `Phase 1`); the task/topic tag and other header copy are absent.
- The chat input no longer displays `向 AI 助手提问…`.
- Phase-1 save-window control and its timing notice remain reachable at 1280 × 800 without overlap.

### Save window

- Page title is `保存窗口`; the former RMW-neutral-filter tag is absent.
- The former Accept / Edit / Pin block has been removed.
- Goal hierarchy occupies the upper-left region, the DeepSeek candidate problem state occupies the upper-right region, and the knowledge network follows below.
- The information density remains readable without adding an unrequested flowchart or extra network nodes.
- The floating help control and introductory dialog explain each region without permanently occupying workspace area.

### Bilingual and responsive fit

- Chinese and English entry headings remain on one line at 1280 × 800.
- The English entry card no longer overflows the right viewport edge.
- Chinese/English labels, notices, timers, game instructions, and completion controls fit their containers.
- Mobile remains intentionally blocked because the controlled experiment requires a desktop viewport.

### Interaction QA

- Phase 1 blocks save-window entry before the final three minutes and shows a specific notice.
- Save window blocks continuation during its first minute and shows a specific notice.
- Letter and color tasks each require a perfect score and offer a restart after any error.
- Unsupported recall contains exactly three questions.
- Recovery blocks completion until seven minutes remain and shows the current remaining time.
- The completion screen exports the complete structured interaction archive.
