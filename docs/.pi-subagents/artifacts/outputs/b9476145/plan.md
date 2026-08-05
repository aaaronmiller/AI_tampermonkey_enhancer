# Implementation Plan: Unified "Stateful Sovereignty Protocol" Toolbar

## Goal
Create a single Tampermonkey script merging the 12-tier Sovereignty Protocol prompts (from `Gemini_enhancer.js`), the 6-council Deliberative Refinement system (from v19.5 CET), the provider detection and system prompt infrastructure (from v20 CET), and an S-tier cyberpunk glassmorphism UI that works across 14+ AI providers.

---

## 1. Architectural Decisions (Deliberated via CEO Council)

### Decision 1: Base Architecture → v20
**Why v20 wins**: Cleaner codebase, tabbed config modal, session-aware system prompts, 14 providers (including Chinese), smart Pi indicator, better drag handling, proper CSP/Trusted Types, generic provider fallbacks, React event handler dispatch
- v19.5 gives us: 6 council types (CEO, Playoff, RCR, Adversarial, Socratic, Deep), transformation vectors, genDRBlock()
- Gemini_enhancer.js gives us: MATRIX_THEORIES sovereignty layers, UNIVERSAL_MODULES (5 modules), FOUNDATIONAL_OVERRIDE, COUNCIL_PATTERNS, COUNCIL_SCALE
- Reason: v20 input-level injection is simpler and more reliable than Gemini's fetch interception

### Decision 2: Prompt System → Sovereignty Protocol LULU
- 12 Sovereignty tiers become the "levels" (replacing v19.5's generic CET levels)
- Each tier has full Sovereignty Protocol prompts (foundational override + tier-specific modules)
- DR remains independent ON/OFF toggle wrapping the level payload
- Level = *which* Sovereignty prompt; DR = *how* the AI should process it

### Decision 3: DR Council System → Full v19.5 preservation
- All 6 council types preserved with genDRBlock() — no simplification
- Full V(X,Y,S) configurable parameters, transformation vectors, strategies

### Decision 4: UI Design → S-tier Cyberpunk Glassmorphism
- `backdrop-filter: blur(24px) saturate(180%)` dock with gradient border
- 13 animated orbs (S0-S12) with pulsing glow and spectral colors
- Pi button with smart state glow (cyan=active, amber=system ready)
- Tabbed config modal (Sovereignty Tiers, Councils, System Prompts, Display)
- All transitions: 300ms cubic-bezier

---

## 2. File Structure

Single file: `stateful-sovereignty-protocol.user.js`

Internal sections:
```
// ==UserScript== Metadata (14+ providers matched)
(function() {
// SECTION 1: Constants & State — VERSION, PROV (14 providers), MATRIX_THEORIES, UNIVERSAL_MODULES
// SECTION 2: Council System — COUNCILS (6 types), genDRBlock(), V(X,Y,S)
// SECTION 3: Level System — SOVEREIGNTY_TIERS (12 tiers with full prompts)
// SECTION 4: CSS — Full glassmorphism + orb animations
// SECTION 5: UI — build(), buildModals(), bindEvents()
// SECTION 6: Prompt Wrapper — wrap() assembler function
// SECTION 7: Helpers — toast(), showTip(), copyConvo(), exportMd()
// SECTION 8: Init — document-idle, SPA handling, split-screen
})();
```

---

## 3. Task Breakdown

### Task 1: Metadata + Constants
Copy @match blocks from v20 (14 providers including Chinese). GM_setValue, GM_getValue, GM_setClipboard grants. `run-at document-idle`.

### Task 2: PROVIDERS Detection
Copy the full PROV object from v20 exactly as-is (most comprehensive — includes fallback selectors, React dispatch, Chinese providers).

### Task 3: Sovereignty Protocol Prompts
- Copy UNIVERSAL_MODULES (5 modules) from Gemini_enhancer.js
- Copy FOUNDATIONAL_OVERRIDE from PROMPT_LIBRARY.md
- Define MATRIX_THEORIES with 'sovereignty' as primary, 'cognitron' and 'socratic' as alternatives
- Each tier 1-12 = Full Sovereignty Protocol prompt from PROMPT_LIBRARY.md Part 4

### Task 4: DR Council System
Copy COUNCILS object + genDRBlock() from v19.5. All 6 councils, transformation vectors, V(X,Y,S) parameters. No simplification.

### Task 5: wrap() Function
Assembles: System prompt (session-aware) → Foundational Override → Sovereignty tier → DR block → User text → Validation suffix. Session tracking via sessionStorage.

### Task 6: S-tier CSS
Glassmorphism dock (blur 24px, gradient border), 13 orb pulse animations, Pi glow states, tab transitions, carousel momentum. All emoji-based (no external deps).

### Task 7: UI Build
Dock: 13 orbs + level indicator + DR toggle + council/X/Y/S selectors + TV/ST radios + copy/export. Pi button. Modal: 4-tab config (Tiers, Councils, System Prompts, Display). Status badge.

### Task 8: Events + Injection
Orb click, DR toggle, config save, live display preview, drag reposition, copy/export. Inject prompt on submit (click + Enter). Infinite loop guard (isSubmitting). SPA + split-screen handling.

### Task 9: Init
document-idle startup, history.pushState monkey-patch, popstate listener, rebuild check, ResizeObserver for artifacts.

### Task 10: Testing
Syntax check via node parse. Grep for truncated prompts. Verify 12 tiers, 6 councils, 14+ providers all complete.

---

## 4. Prompt Architecture

When L12 Sovereignty + DR (CEO Council, V(12,5,3)) are active, injected prompt = 
```
[FOUNDATIONAL_OVERRIDE — 7 paragraphs]
[UNIVERSAL_MODULES: model_handshake + meta_narrative + state_cartridge + anti_lazy + adversarial_council]
[TIER 12 PROMPT — Sovereignty L12: STATE_PERSISTENCE_SANDBOX TIER 12 ACTIVE]
[DR COUNCIL BLOCK — CEO Council, 12 agents, 5 rounds, 3 searches]
[USER PROMPT]
[TIER 12 SUFFIX — Sovereignty completion verification]
```

Level 0 = pass-through. DR OFF = no council block. Session system prompt = first message only.

---

## 5. Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Base | v20 | Cleaner, more providers, tabbed modal, session tracking |
| Prompts | Sovereignty LULU | Maximum cognitive depth (KV scaffolding, state serialization) |
| DR System | From v19.5 | Full 6 councils, V(X,Y,S), transformation vectors |
| UI | Glassmorphism cyberpunk | S-tier aesthetic matching sovereignty theme |
| Injection | Input-level (v20) | Simpler + more reliable than fetch interception |
| Sys prompts | Site-specific + universal | Per-provider customization (v20's system) |

---

## 6. Dependencies

Task 1 → Task 2 → Task 3 → Task 4 ─┐
                                     ├──→ Task 5 → Task 7 → Task 8 → Task 9 → Task 10
                                Task 6 ──→ Task 7

---

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Prompt too long at L12 + DR | DR OFF by default; level-only is manageable |
| Provider DOM changes | Fallback selectors + 3x retry (from v20) |
| Submit race condition | isSubmitting flag + 500ms cooldown |
| CSP block | Trusted Types fallback; no external assets |
| SPA navigation | pushState patch + popstate listener |
| Chinese providers | v20 selectors pre-verified |

---

## 8. Acceptance Report

```json
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Full architecture plan merging 3 codebases (v19.5, v20, Gemini_enhancer.js + PROMPT_LIBRARY.md + STATEFUL_SOVEREIGNTY_PROTOCOL.md) into single unified script spec. All architectural decisions evidence-supported from code analysis. 10-task breakdown with dependencies and acceptance criteria."
    }
  ],
  "changedFiles": [
    "docs/.pi-subagents/artifacts/outputs/b9476145/plan.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "read + grep across v19.5 (1001 lines), v20 (1012 lines), Gemini_enhancer.js (~4200 lines)",
      "result": "passed",
      "summary": "Extracted PROVIDERS object, COUNCIL_PATTERNS, MATRIX_THEORIES, UNIVERSAL_MODULES, processVoltronPayload, UI/CSS architecture"
    },
    {
      "command": "Read supporting docs: PROMPT_LIBRARY.md, STATEFUL_SOVEREIGNTY_PROTOCOL.md, deliberative_refinement.md",
      "result": "passed",
      "summary": "Extracted Sovereignty L1-L12 full prompts, FOUNDATIONAL_OVERRIDE, Cognitron/Socratic theories, FORGE methodology"
    },
    {
      "command": "Write plan.md",
      "result": "passed",
      "summary": "Architecture plan with 8 sections covering decisions, structure, 10 tasks, prompt architecture, design summary, dependencies, risks, acceptance report"
    }
  ],
  "validationOutput": [
    "v19.5: 12-level CET + 6-council DR + genDRBlock() + transformation vectors",
    "v20: 5 customizable slots + 14 providers (incl. Chinese) + system prompts + tabbed config + session tracking",
    "Gemini_enhancer.js: Sovereignty V17.3 matrix + 5 UNIVERSAL_MODULES + COUNCIL_PATTERNS + COUNCIL_SCALE",
    "PROMPT_LIBRARY.md: Full Sovereignty L1-L12, Cognitron L1-L12, Socratic L1-L12, foundational override",
    "STATEFUL_SOVEREIGNTY_PROTOCOL.md: 12-tier architecture specification, truth hierarchy, economic protocol"
  ],
  "residualRisks": [
    "Final script not yet built — plan is architecture/output spec, not implementation",
    "Chinese provider selectors rely on v20's own field testing — not independently verified by this analysis",
    "Prompt length at L12 + DR V(12,5,3) estimated 10-15KB — test on free vs paid provider tiers before shipping"
  ],
  "noStagedFiles": true,
  "diffSummary": "Created architecture plan at docs/.pi-subagents/artifacts/outputs/b9476145/plan.md — no source code changes made, all analysis performed via read-only tools",
  "reviewFindings": [
    "no blockers: All 3 codebases fully analyzed, architectural decisions are evidence-supported from actual code reading",
    "recommendation: Execute the 10 tasks sequentially: metadata → providers → sovereignty prompts → DR system → wrap() → CSS → UI → events → init → testing",
    "note: Target script size ~1500-2000 lines. Use v20's PROV and config modal as structural backbone. Inject Sovereignty prompts from PROMPT_LIBRARY.md into level slots. Attach v19.5's genDRBlock() as independent toggle. Build CSS/UI from scratch for S-tier glassmorphism look."
  ],
  "manualNotes": "Plan is complete. The next step is building stateful-sovereignty-protocol.user.js following this plan's 10 tasks. Each task produces a section of the final script. Prioritize completeness — no placeholders or truncated prompts in the final output."
}
```