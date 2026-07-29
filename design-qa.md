# Design QA

## Evidence

- Source visual truth: `/var/folders/f1/jd09z0_15dl2d3cbhyh0xfwc0000gn/T/codex-clipboard-9f260f6f-8d03-4216-8c33-33f77214b18b.png`
- Source pixels: 2838 × 1826; normalized to 1440 × 927 for comparison.
- Implementation screenshots:
  - `artifacts/design-qa/implementation-workspace-v3.png`
  - `artifacts/design-qa/implementation-recovery-tabs-v3.png`
- Implementation viewport and pixels: 1440 × 900 CSS px at device scale 1.
- Full-view comparison: `artifacts/design-qa/recovery-tabs-comparison-v3.png`
- Focused evidence: the same comparison clearly shows the chat composer and recovery-tab regions; separate crops were unnecessary because both regions remain legible at the normalized size.
- States checked: Chinese Phase 1, Chinese Day 2 Resume Brief / Reasoning Cards / Knowledge Network, guided-tour steps, entry model selection, test mode, and formal timed mode.

## Findings and comparison history

### Iteration 1 — issues identified from the supplied screenshot

- P1: Recovery tabs appeared as rigid adjacent rectangles and visually overflowed their intended control region.
- P2: The chat composer used a bordered card around another input border, producing a box-inside-box effect.
- P2: The persistent instruction below the chat textarea added clutter.
- P1: The original centered help modal described all areas at once instead of connecting each explanation to the visible interface region.
- P2: The entry screen exposed prototype/researcher shortcuts that should not appear in the participant-facing entry.

### Fixes applied

- Rebuilt recovery navigation as a contained pill-style segmented control with icons, internal spacing, rounded active state, and a separate card-count badge.
- Flattened the chat composer into one textarea surface with a separate send button; removed the extra outer card and the “请让 AI 引用材料编号并区分证据与推断” instruction.
- Replaced the centered overview modal with a four-step spotlight tour that outlines Materials, AI Assistant, Research Memo, and Stage/Recovery Support. The save window uses the same pattern for Goal Structure, Candidate Problem State, and Knowledge Network.
- Restored the four-stage Primary Task / Save Window / Interruption / Resume timeline above both working sessions.
- Removed the three participant-entry shortcuts and added a controlled DeepSeek V4 Flash / V4 Pro selector.
- Made test mode the default so timing gates do not hide review states. Formal mode remains available with `?timed=1`, with a 10-minute Phase 1.

### Iteration 2 — post-fix evidence

- At 1440 × 900, the updated segmented recovery control stays within the right workspace and has no clipping or horizontal overflow.
- At 1280 × 800, Chinese and English entry and recovery screens retain all labels, controls, and the completion button without overflow.
- The spotlight callout remains adjacent to the highlighted region and never covers the selected region itself in the four tested workspace steps.
- The single chat input surface has one visible boundary and no redundant instruction copy.
- Browser console: no errors or warnings in the checked recovery state.
- No actionable P0, P1, or P2 visual issues remain.

## Required fidelity surfaces

- Fonts and typography: Geist/CJK fallbacks, weights, line heights, tab label sizing, and bilingual wrapping are consistent and readable.
- Spacing and layout rhythm: the 24/32/44 workbench grid, 52px stage timeline, composer padding, segmented-control spacing, and support-panel height remain aligned.
- Colors and tokens: warm-neutral canvas, restrained indigo, semantic green/amber/slate states, and focus rings use existing product tokens.
- Image and icon quality: there are no raster content assets in these UI regions; all interface icons use the existing Phosphor library, and the React Flow network remains library-rendered.
- Copy and content: the requested instruction and participant shortcuts are absent; test-mode and model-choice copy is concise in Chinese and English.

## Interaction QA

- Spotlight Next/Done/Exit controls work and advance the highlighted target.
- Test mode allows immediate entry to Save Window and immediate completion.
- Formal mode starts Phase 1 at 10 minutes and preserves the last-three-minute gate.
- Save Window test mode bypasses its one-minute wait.
- DeepSeek V4 Flash and V4 Pro values are accepted and propagated to both chat and extraction routes.
- Resume Brief, Reasoning Cards, and Knowledge Network tabs all switch correctly.
- Lint, TypeScript, and production build pass.

final result: passed
