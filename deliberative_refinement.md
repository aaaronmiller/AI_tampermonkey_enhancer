---
description: FORGE - Parameterized meta-refinement methodology for transforming drafts into production-ready deliverables
---

# Deliberative Refinement: Feedback-Orchestrated Refinement with Grounded Evaluation

> *"Like forging metal — heat, hammer, reshape, repeat — until production-ready."*
>
> **F**eedback-**O**rchestrated **R**efinement with **G**rounded **E**valuation

---

## Quick Reference

### Variants

| Variant | V(X, Y, S) | Features | Use Case |
|---------|------------|----------|----------|
| **Flash** | V(5, 2, 1) | LINEAR only, fast | Budget, quick validation |
| **Pro** | V(8, 3, 1) | LINEAR + BRANCHING | Full methodology (default) |

### Intensity Profiles

| Profile | V(X, Y, S) | Description |
|---------|------------|-------------|
| Lite | V(3, 1, 0) | Quick sanity check |
| **Standard** | **V(8, 3, 1)** | **Default for most tasks** |
| Deep | V(12, 5, 2) | High-stakes documents |
| Exhaustive | V(15, 5, 3) | Investor-grade validation |

### Mode Detection

| Mode | Trigger | Process |
|------|---------|---------|
| **CREATE** | "write", "generate", "draft", no file | Generate → FORGE Lite → Return |
| **REFINE** | "improve", "fix", @file provided | Analyze → FORGE [profile] → Return |

### Strategy Detection

| Strategy | Trigger | Applies To |
|----------|---------|------------|
| **LINEAR** | "fix", "correct", "validate" | Passes + Probes (default) |
| **BRANCHING** | "explore", "alternatives" | Passes + Probes |

### Council Quick-Select

| Input Type | Council | Why |
|------------|---------|-----|
| Technical/Code | RCR | Structured critique |
| A vs B decision | Playoff | Clear winner |
| Math/Logic | ReMA | Step verification |
| Budget-constrained | GroupDebate | Efficiency |
| General/Ambiguous | **CEO** | **Safe default** |


---

## Terminology & Definitions

> **Read this section first.** Understanding FORGE terminology is essential for correct execution.

### Core Terms (Hierarchy)

| Level | Term | Symbol | Definition | Example |
|-------|------|--------|------------|---------|
| **Task** | Pass | t | Processing one concept from the document | "Validate the pricing claim" |
| **Cycle** | Validation Cycle | V() | Full multi-round validation for one Pass | V(8, 3, 1) = 8 agents, 3 rounds, 1 probe |
| **Round** | Deliberation Round | R | One debate/vote among X agents | R1: Initial assessment |
| **Atomic** | **Probe** | S | Web search for grounding between rounds | "Search for OSHA fall statistics" |

### Probe (formerly "Pulse")

A **Probe** is a web search operation performed between deliberation rounds to ground the discussion in external facts. Think of it as *probing for truth*.

**Default behavior:** LINEAR (DEPTH strategy)
- Each Probe builds on the previous finding
- Progressively narrowing/deepening the search
- `Probe 1 → finding → Probe 2 (deeper on finding) → Probe 3 (verify)`

**Alternative behavior:** BRANCHING (BREADTH strategy)
- Each Probe hits independent sources
- Triangulation for reliability
- `Probe 1 (source A) | Probe 2 (source B) | Probe 3 (source C)`

### Probe Strategy Defaults

| Profile | S Value | Default Strategy | Behavior |
|---------|---------|------------------|----------|
| Lite | 0 | None | No web grounding |
| **Standard** | **1** | **LINEAR (DEPTH)** | Deep dive on key finding |
| Deep | 2 | LINEAR (DEPTH) | Two-stage deep dive |
| Exhaustive | 3 | BRANCHING (BREADTH) | Triangulate from 3 sources |

### Other Key Terms

| Term | Definition |
|------|------------|
| **Grounding** | Tethering AI output to verifiable external sources via web search |
| **Council** | The set of X agents who deliberate during each Round |
| **Transformation Vector (Tv)** | Direction of change: FORWARD (expand), BACKWARD (compress), ISOMETRIC (polish) |
| **Convergence** | When council reaches stable consensus (vote change <5%) |

---

## Core Concept

### The Formula

```
TOTAL_REFINEMENT = Σ(t=1 to T) [ V(X, Y, S) × Tv ]

Where:
  T  = Concepts to validate (default: 10)
  X  = Agents in council (default: 8)
  Y  = Rounds of discourse (default: 3)
  S  = Probes between rounds (default: 1, DEPTH strategy)
  Tv = Transformation vector (FORWARD/BACKWARD/ISOMETRIC)
```

### Execution Pattern

```
FOR EACH Pass (t = 1 to T):
    [Probe] → R₁ → [Probe] → R₂ → [Probe] → R₃ → [Probe]
       ↑            ↑            ↑            ↑
       1            2            3            4  (Y+1 probes total)
```

---

## Phase -1: Target Analysis (Pre-Instantiation)

> **Purpose**: Before inferring intent (Phase 0), analyze the target document to determine optimal processing strategy. This handles large files, multi-loop execution tracking, and scratch file management.

### Why This Phase Exists

Large documents exceed context window capacity. Repeated refinement loops without state tracking lead to missed phases or repeated work. Phase -1 ensures FORGE scales to any document size and maintains state across multiple invocations.

Think of it like a craftsman inspecting the raw material before choosing tools. A blacksmith doesn't use the same hammer for a horseshoe and a sword — they assess first.

### File Size Detection Protocol

When user references a file (via @mention, URL, or path):

```
1. MEASURE file size (wc -c or equivalent)

2. CLASSIFY by threshold:
   < 10KB     → SMALL    → Process inline, no special handling
   10-25KB   → MEDIUM   → Suggest scratch file for analysis notes
   25-50KB   → LARGE    → Recommend scratch file, consider chunking
   50-100KB  → VERY_LARGE → Mandatory chunking (10KB sections)
   > 100KB   → MASSIVE  → Mandatory chunking with 15% overlap

3. INFORM user of strategy before proceeding
```

### Scratch File Protocol

For MEDIUM+ files, create a working document:

**Filename**: `.forge-scratch-[original-name].md`

**Contents**:
- Key claims extracted from document
- Validation status for each claim
- Agent votes and dissents
- Web search findings
- Draft corrections before applying

**Why**: Keeps main document clean while tracking detailed validation state. The scratch file is your "workbench" — messy but functional.

### Chunking Strategy

For LARGE+ files, break into logical sections:

```
1. IDENTIFY natural boundaries (headers, sections, chapters)
2. TARGET ~10KB chunks (adjust for logical breaks)
3. OVERLAP 10-15% at boundaries (preserve context)
4. PROCESS sequentially (Chunk 1 → Chunk 2 → ...)
5. SYNTHESIZE findings across chunks at end
```

**Analogy**: Like editing a book chapter-by-chapter rather than trying to hold the entire novel in your head at once.

---

## Checkpoint-Gated Validation

> **Purpose**: For multi-loop execution, track state across invocations so you can resume where you left off.

### Why Checkpointing Matters

A complex document with 20 concepts and V(8, 3, 1) validation generates:
- 20 passes × 8 agents × 3 rounds = 480 agent-turns
- Plus 20 × 4 = 80 Probes

This exceeds single-session capacity. Without checkpointing, you lose progress. With checkpointing, you can pause and resume.

### Checkpoint File

Save state to `.forge-checkpoint-[hash].json`:

```json
{
  "target": "filename.md",
  "created": "2024-12-20T05:00:00Z",
  "config": {"profile": "Standard", "X": 8, "Y": 3, "S": 1},
  "strategy": "LINEAR",
  "passes": {
    "total": 20,
    "completed": [1, 2, 3, 4, 5],
    "current": 6,
    "pending": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
  },
  "votes": {
    "pass_1": {"approve": 7, "reject": 1, "consensus": true},
    "pass_2": {"approve": 8, "reject": 0, "consensus": true}
  },
  "approval_rate": 0.85
}
```

### Continuation Heuristics

When user returns to a document with existing checkpoint:

| User Says | Action |
|-----------|--------|
| "keep going" / "continue" | Resume from checkpoint |
| "start over" / "fresh" | Archive checkpoint, begin anew |
| "status" / "where were we" | Report state without executing |
| "finish this" | Complete remaining passes, prioritize speed |

### Checkpoint Lifecycle

```
1. CREATE on first FORGE invocation for a document
2. UPDATE after each completed Pass
3. ARCHIVE when all passes complete (→ .forge-checkpoint-[hash].archive.json)
4. DELETE archived checkpoints older than 7 days
```

---

## Mode: CREATE vs REFINE

### CREATE Mode

When user wants to generate NEW content (no existing file):

```
1. DETECT: User says "write", "generate", "draft", "create"
           AND no @file or URL provided

2. GENERATE: Produce initial draft based on requirements
   - Use full context to understand what's needed
   - Create complete first draft

3. VALIDATE: Apply FORGE Lite V(3, 1, 0)
   - 3 agents quick-review
   - 1 round of discourse
   - No web grounding (speed)

4. RETURN: Refined first draft
   - User can say "more" to escalate to Standard
```

### REFINE Mode

When user provides existing content to improve:

```
1. DETECT: User says "improve", "fix", "refine", "validate"
           AND @file, URL, or inline content provided

2. ANALYZE: Check file size, apply Phase -1 if needed

3. INSTANTIATE: Infer profile from intent (see below)

4. EXECUTE: Run FORGE with selected profile

5. RETURN: Improved content with change summary
```

### Refinement Strategy: LINEAR vs BRANCHING

This strategy applies to **two dimensions**: refinement passes AND web searches (Probes).

| Strategy | Description | Best For |
|----------|-------------|----------|
| **LINEAR** | Cumulative — each iteration builds on the previous | Corrections, polish, validation |
| **BRANCHING** | Divergent — each iteration explores alternatives | Exploration, strategy, creative |

---

#### Dimension 1: Refinement Passes

**LINEAR (default):**
```
Original → Pass 1 corrections → Pass 2 corrections → Final
All changes compound. Errors fixed in Pass 1 stay fixed.
Focus: accuracy, consistency, polish
```

**BRANCHING:**
```
Original → Pass 1a (viewpoint A) → review
        → Pass 1b (viewpoint B) → review
User selects preferred branch for further refinement.
Focus: exploration, alternatives, strategic options
```

---

#### Dimension 2: Web Searches (Probes)

**LINEAR Probes (DEPTH strategy):**
```
Probe 1: Search for X
Probe 2: Search for deeper info on Probe 1's key finding
Probe 3: Verify Probe 2's specific claim
Each search focuses/narrows based on previous findings.
```

**BRANCHING Probes (BREADTH strategy):**
```
Probe 1: Search source A for X
Probe 2: Search source B for X (independent)
Probe 3: Search source C for X (independent)
Each search hits different sources for triangulation.
```

---

#### Detection Heuristics

| Signal | Strategy |
|--------|----------|
| "fix", "correct", "validate" | LINEAR (default) |
| "explore", "alternatives", "what if" | BRANCHING |
| "verify from multiple sources" | BRANCHING Probes (BREADTH) |
| "dig deeper on [finding]" | LINEAR Probes (DEPTH) |

---

### FORGE Variants: Pro vs Flash

To manage complexity, FORGE offers two execution variants:

| Variant | Config | Features | Use Case |
|---------|--------|----------|----------|
| **Flash** | V(5, 2, 1) | LINEAR only, simple Probes | Fast iteration, budget-conscious |
| **Pro** | V(8, 3, 1) | LINEAR + BRANCHING, deep Probes | Full methodology, high-stakes |

**Flash (Simplified):**
- 5 agents, 2 rounds, 1 probe
- LINEAR refinement only
- LINEAR probes only (no branching search)
- ~3x faster than Pro

**Pro (Full):**
- 8 agents, 3 rounds, 1 probe
- Supports LINEAR and BRANCHING refinement
- Supports LINEAR and BRANCHING probes
- Full council selection, all modes

**Detection:**
- Quick/budget requests → Flash
- Complex/high-stakes requests → Pro
- Default → Pro if ambiguous

---

## Council Types & Selection

### Decision Tree (use FIRST)

```
IF input is code OR technical documentation:
    → RCR (Reflect-Critique-Refine)
    
ELSE IF input is "should I do A or B?":
    → Playoff (elimination tournament)
    
ELSE IF input involves math OR sequential logic:
    → ReMA (Meta-reasoner)
    
ELSE IF budget is constrained OR content is very large:
    → GroupDebate (parallel groups)
    
ELSE:
    → CEO (all agents deliberate together) ← DEFAULT
```

### Council Definitions

Each council type optimizes for different output qualities. Choose based on input characteristics.

| Type | Full Name | Structure | Best For | Size |
|------|-----------|-----------|----------|------|
| **CEO** | Council of Expert Opinions | All X agents deliberate each round | General synthesis, ambiguous inputs | 7 (odd) |
| **Playoff** | Elimination Tournament | 8→4→2→1 bracket elimination | Binary A-vs-B decisions | 8 (even) |
| **RCR** | Reflect-Critique-Refine | Structured 3-phase loop per agent | Code review, technical docs | 5 (odd) |
| **ReMA** | Reasoning via Meta-Analysis | Meta-thinker + Reasoner alternating | Math proofs, sequential logic | 5 (odd) |
| **GroupDebate** | Grouped Parallel Debate | Split into groups, share summaries | Large scale, budget-constrained | 8 (even) |
| **iMAD** | Intelligent Multi-Agent Debate | Selective debate (triggers only when beneficial) | High volume, variable complexity | Variable |

---

### Council Deep Dives

#### CEO: Council of Expert Opinions

> *Like a boardroom meeting where every executive weighs in on the same question.*

All X agents see the same input and deliberate together. Each round, every agent votes and can see others' reasoning. Consensus emerges through discussion, not elimination.

**When to use**: Ambiguous inputs where multiple valid perspectives exist. No single "right" answer — you need synthesis.

**Analogy**: A jury deliberation. Everyone discusses until they reach agreement (or document dissent).

#### Playoff: Elimination Tournament

> *Like March Madness for ideas — 8 candidates enter, 1 champion emerges.*

Structure: 8 → 4 → 2 → 1. Each round pits alternatives head-to-head. Winners advance. Forces clear decisions rather than mushy consensus.

**When to use**: "Should we do A or B?" decisions. Requires binary outcomes.

**Analogy**: A debate tournament. Opponents directly challenge each other until one prevails.

#### RCR: Reflect-Critique-Refine

> *Like a code review with mandatory self-reflection before critique.*

Three-phase loop: Agent reflects on their own understanding, critiques the material, then proposes refinements. Prevents knee-jerk reactions.

**When to use**: Technical documentation, code, anything requiring careful structured analysis.

**Analogy**: Linting before code review. The agent "lints" their own thinking first.

#### ReMA: Reasoning via Meta-Analysis

> *Like having a judge who judges the judges.*

A meta-reasoner observes lower-level reasoners. When they disagree, the meta-reasoner arbitrates. Good for catching logical errors.

**When to use**: Math proofs, sequential arguments, anything where step-by-step correctness matters.

**Analogy**: An appellate court reviewing trial court decisions.

#### GroupDebate: Grouped Parallel Debate

> *Like a large class breaking into small groups before reporting to the whole.*

Split X agents into smaller groups (e.g., 8 → 2 groups of 4). Each group debates internally, then shares summary conclusions for synthesis.

**When to use**: Very large documents, budget constraints, need parallelization.

**Analogy**: Senate subcommittees. Smaller groups specialize, then report to the full body.

#### iMAD: Intelligent Multi-Agent Debate

> *Like a lazy manager who only calls meetings when truly necessary.*

Debate triggers selectively. If agents initially agree, skip extended deliberation. If they disagree, escalate to full debate. Optimizes for efficiency.

**When to use**: High-volume processing where most items are straightforward but some need deep analysis.

**Analogy**: Exception-based management. Escalate only when routine handling fails.

---

### Odd vs Even Council Sizes

Council size affects how conflicts are resolved:

- **ODD (5, 7, 9)**: Use for consensus voting — odd numbers provide natural tiebreaker. Someone always breaks a tie.
- **EVEN (4, 6, 8)**: Use for adversarial/elimination — forces resolution through bracket competition. No ties possible in head-to-head.

**Rule of thumb**: If you want "the group thinks X," use odd. If you want "X beats Y," use even.

---

## Execution Flow

### Phase 0: Intent Detection

Infer configuration from natural language:

| User Says | Profile | Tv Vector |
|-----------|---------|-----------|
| "make this better" | Standard | ISOMETRIC |
| "expand this" / "more detail" | Deep | FORWARD |
| "summarize" / "shorter" | Standard | BACKWARD |
| "quick check" | Lite | ISOMETRIC |
| "investor-ready" / "bulletproof" | Exhaustive | ISOMETRIC |

**Default**: If ambiguous → Standard + ISOMETRIC

### Phase 1: Decomposition

1. Break document into T discrete concepts
2. Prioritize by importance/risk

### Phase 2: Validation

For each concept t:
1. Form council (X agents, selected type)
2. Execute: [S Probes] → R₁ → [S] → R₂ → ... → Rᵧ → [S]
3. Document votes, synthesize consensus

### Phase 3: Correction Loop

If errors found during validation:
```
"This is wrong" → V(3, 1, 0) quick fix
"More errors"   → V(5, 2, 1) expanded search
"Bulletproof"   → V(10, 3, 2) full council
```

---

## Convergence & Stopping

| Signal | Action |
|--------|--------|
| Unanimous approval for 2+ rounds | STOP — converged |
| <5% vote change between rounds | STOP — diminishing returns |
| All agree instantly (R1) | ADD adversarial agent (echo chamber risk) |
| Max rounds reached | STOP — time-box exceeded |

---

## Transformation Vectors

```
Tv = Direction of change:
  → FORWARD  : Expand, elaborate, add detail
  ← BACKWARD : Compress, summarize, distill
  ↔ ISOMETRIC: Polish without size change
  ⟳ RECURSIVE: Apply to methodology itself
```

| Vector | When to Use |
|--------|-------------|
| FORWARD | Draft too sparse, needs elaboration |
| BACKWARD | Draft too verbose, needs distillation |
| ISOMETRIC | Right size, needs quality improvement |

---

## Advanced: File Handling

### Size Thresholds

| Size | Strategy |
|------|----------|
| < 10KB | Inline processing |
| 10-25KB | Consider scratch file |
| 25-50KB | Recommend scratch file |
| 50-100KB | Chunk into sections |
| > 100KB | Mandatory chunking (25KB chunks, 15% overlap) |

### Checkpointing

For multi-loop execution, save state to `.forge-checkpoint-[hash].json`:

```json
{
  "target": "filename.md",
  "loop": 2,
  "config": {"X": 8, "Y": 3, "S": 1},
  "completed_passes": [1, 2, 3],
  "approval_rate": 0.85
}
```

**Continuation heuristics:**
- "keep going" → Resume from checkpoint
- "start over" → Archive checkpoint, begin fresh
- "status" → Report state without executing

---

## Anti-Patterns

❌ **Skipping Phase 0**: Not inferring intent, asking user for raw parameters

❌ **Fixed configuration**: Using same V() for all concepts regardless of type

❌ **Under-grounding**: Skipping Probes (S=0) to save time on important docs

❌ **Council collapse**: All agents agree instantly (add adversarial)

❌ **Over-validation**: V(15, 5, 3) for trivial changes

❌ **No meta-loop**: Never refining the methodology itself

---

## Execution Checklist

```
[ ] 1. Detect MODE (CREATE or REFINE)
[ ] 2. If REFINE: Check file size, apply chunking if needed
[ ] 3. Infer profile from user intent
[ ] 4. Confirm: "Running FORGE [mode] with [profile]"
[ ] 5. Execute: For each concept, run V(X, Y, S)
[ ] 6. Check convergence criteria
[ ] 7. Return refined output with summary
```

---

## Key Principle

**All variables are fluid.** The formula adapts to stakes:

- Quick draft → V(3, 1, 0)
- Normal validation → V(8, 3, 1)
- Investor-grade → V(15, 5, 3)

Low-stakes = minimal validation. High-stakes = maximum intensity.

---

## ⚠️ Attention Boost: Critical Reminders

> **This section repeats key instructions to ensure they are not lost in long-context processing.**

### DO NOT SIMPLIFY

1. **Always run Phase 0** — Infer intent from user language, never ask for raw V() parameters
2. **Default is V(8, 3, 1)** — 8 agents, 3 rounds, 1 probe between each round
3. **CREATE mode exists** — If no file provided, generate content first, then validate
4. **Probes are interleaved** — Pattern is [S]→R₁→[S]→R₂→[S]→R₃→[S], NOT just bounding
5. **Select council type first** — Use decision tree: Code→RCR, A-vs-B→Playoff, else→CEO

### Quick Formula Reminder

```
V(X, Y, S) = X agents, Y rounds, S probes between rounds
Default: V(8, 3, 1) = 8 agents, 3 rounds, 1 probe (4 total probes per cycle)
```

### Mode Reminder

- **CREATE**: User wants new content → Generate → FORGE Lite → Return
- **REFINE**: User has existing content → Analyze → FORGE [profile] → Return
- **LINEAR**: Default — cumulative corrections, errors stay fixed
- **BRANCHING**: Exploratory — divergent alternatives for user selection

**END OF SKILL DOCUMENT**
