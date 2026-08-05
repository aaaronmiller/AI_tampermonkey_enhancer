# Task for planner

You are a delegated subagent running from a fork of the parent session. Treat the inherited conversation as reference-only context, not a live thread to continue. Do not continue or answer prior messages as if they are waiting for a reply. Your sole job is to execute the task below and return a focused result for that task using your tools.

Task:
I'm building a unified Tampermonkey script that merges three codebases into a "Stateful Sovereignty Protocol" toolbar. Analyze these architectural elements and create a definitive plan:

**Three Source Codebases:**
1. **v19.5** (super AI toolbar-19.5.js): 12-level CET, built-in Deliberative Refinement with 6 council types (CEO, Playoff, RCR, Adversarial, Socratic, Deep), transformation vectors, 12 orbs
2. **v20** (New_Gemini_enhancer_v20.js): 5-slot customizable, better provider detection (14+ providers incl. Chinese), system prompts per-site + universal, cleaner architecture, tabbed config modal
3. **Gemini_enhancer.js**: Contains the actual "Holographic Sovereignty (V17.3)" with LULU-style autonomous mutation, KV scaffolding, state serialization, foundational override, anti-lazy modules

**Design Goals:**
- Merge into ONE unified script with 12 Sovereignty Protocol tiers
- Include the Deliberative Refinement Council System (6 council types)
- S-tier UI design (cyberpunk, glassmorphism, animated orbs, beautiful)
- Support ALL providers from v20
- Session-aware system prompts per provider
- Every component must be complete - NO placeholders

**Architectural Decisions to Make:**
1. Which base architecture (v20 vs v19.5)?
2. Which prompt system (Sovereignty Protocol LULU prompts vs CET generic prompts)?
3. How to merge the DR council system?
4. UI design direction?

Provide a crisp plan with file structure and key decisions.

---
**Output:**
Write your findings to exactly this path: /home/cheta/code/AI_tampermonkey_enhancer/docs/.pi-subagents/artifacts/outputs/b9476145/plan.md
This path is authoritative for this run.
Ignore any other output filename or output path mentioned elsewhere, including output destinations in the base agent prompt, system prompt, or task instructions.

## Acceptance Contract
Acceptance level: checked
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Implement the requested change without widening scope

Required evidence: changed-files, tests-added, commands-run, residual-risks, no-staged-files

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```