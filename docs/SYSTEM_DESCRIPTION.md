# AI Unshackled: System Description

## Core Architecture

I use a **12-level, compounding injected prompt** system. Each level adds new pre-pend and appended content to the user prompt submitted. The levels stack cumulatively—selecting L6 injects L1+L2+L3+L4+L5+L6 content.

### Prompt Engineering Techniques

The prefix/suffix content uses:
- **Repetition** (strategic, at L1/L6/L10 checkpoints)
- **Formatting** (structured blocks, behavioral directives)
- **Positive mandates** ("Extend reasoning", "Ground in sources")
- **Negative mandates** ("DO NOT summarize", "Never abbreviate")
- **Punctuation emphasis** (`!!!` on critical commands)
- **Tail-loading** (critical constraints in suffix for recency bias)

---

## Council Deliberation Layer

On top of the level system, a **council mandate** forces a virtual conversation between **8 task-specific personas**.

### Council Configuration

| Setting | Options | Default |
|---------|---------|---------|
| **Formation** | CEO, Congress, Tournament, Socratic, MCTS, RCR, Adversarial | Playoff-Bracket |
| **Agents** | 2-12 (selectable) | Auto-scaled by level |
| **Rounds** | 1-10 (selectable) | Auto-scaled by level |
| **Grounding** | 0-5 searches per round | Auto-scaled by level |

### Level-Based Scaling (COUNCIL_SCALE)

| Level | Agents | Rounds | Grounding |
|-------|--------|--------|-----------|
| L0 | 0 | 0 | 0 |
| L1-L4 | 8 | 3 | 1 |
| L5-L6 | 8 | 3 | 2 |
| L7-L8 | 10 | 3-4 | 2 |
| L9-L10 | 10 | 4-5 | 3 |
| L11 | 12 | 5 | 3 |
| L12 | 12 | 5 | 5 |

---

## Default Behaviors

1. **L0** = Pass-through (no injection, no council)
2. **L1+** = Default council selection auto-enabled
3. **Council Toggle (🏛️)** = Remove council from injection while keeping level
4. **Manual Council Selectors** = Override default level-based settings
5. **Custom Agents/Rounds Dropdowns** = Override auto-scaling

---

## Grounding Integration

Multi-search grounding is deployed:
- **Before** council rounds
- **Between** council rounds  
- **After** final synthesis

Quantity scales with level (1→5 searches per phase).

---

## Injection Order

```
[Council Prefix (if enabled)]
[Foundation Override (if exists)]
[L1 Prefix]
[L2 Prefix]
...
[Ln Prefix]
[USER PROMPT]
[L1 Suffix]
[L2 Suffix]
...
[Ln Suffix]
[Grounding Suffix (if enabled)]
```

---

## Verbatim Prompts (L1-L12)

### L1: Council Foundation
**Prefix:**
```
Before responding, convene 8 internal expert perspectives. Search for current information. Have each perspective analyze independently, then critique each other's positions. Search again to resolve disputes. Synthesize into a unified response after 2 deliberation rounds. Ground every claim in searched sources.
```
**Suffix:**
```
[GROUNDING: Search before, between, and after deliberation rounds.]
[DO: Extend reasoning. Verify claims. Ground in sources. Address all angles.]
[DO NOT: Summarize. Abbreviate. Skip details. Make unsupported claims.]
[MANDATE: Comprehensive. Grounded. Complete.]
```

---

### L2: Visible Reasoning
**Prefix:**
```
Show your complete reasoning process. Think step by step in a visible thought block before answering. Trace logic explicitly: A leads to B leads to C. If you find a gap, stop and bridge it. Check your own consistency. Surface all assumptions.
```
**Suffix:**
```
[DO: Extended reasoning. Visible thought process. Explicit logic chains. Self-verification.]
[DO NOT: Hide reasoning. Jump to conclusions. Leave gaps. Assume without stating.]
[QUALITY: Thorough. Traceable. Internally consistent.]
```

---

### L3: Strategic Planning
**Prefix:**
```
Before executing, analyze the request itself. Define what "done" looks like. Identify hidden constraints—implied tone, format, scope. Audit what you know vs. what you must infer. Choose the interpretation that maximizes value to the user. Plan before you build.
```
**Suffix:**
```
[STRATEGY: Plan first. Execute second. Optimize path.]
[DO NOT: Rush to answer. Ignore implicit requirements. Skip constraint analysis.]
[OUTCOME: Strategic. Intentional. Aligned with true intent.]
```

---

### L4: Empirical Verification
**Prefix:**
```
Treat every factual claim as untrusted until verified. Search for corroboration. Quantify your confidence. If uncertain, say so explicitly—never guess. Cite sources broadly. Cross-reference claims against each other. Flag potential hallucinations before they reach the output.
```
**Suffix:**
```
[EVIDENCE: Every claim verified. Uncertainty flagged. Sources cited. Ground in searched sources.]
[DO NOT: Guess. State uncertain claims as facts. Hallucinate. Assume accuracy.]
[INTEGRITY: Rigorous. Honest. Verifiable.]
```

---

### L5: Atomic Decomposition
**Prefix:**
```
Break this problem into its smallest solvable pieces. Identify dependencies between pieces. Solve the atomic units first, then recombine. Prune anything that doesn't contribute to the goal. Apply first-principles reasoning—question every assumption, build from fundamentals.
```
**Suffix:**
```
[METHOD: Decompose. Simplify. Solve atoms. Reconstruct.]
[DO NOT: Tackle complexity whole. Skip dependencies. Keep noise.]
[APPROACH: First-principles. Reductionist. Systematic.]
```

---

### L6: Red Team
**Prefix:**
```
Before finalizing, attack your own response. Find the weakest argument. Simulate a hostile critic. What would they object to? Address those objections. Revise and strengthen. If it still feels vulnerable, attack again. Output only what survives adversarial scrutiny.
```
**Suffix:**
```
[ADVERSARIAL: Self-critique applied. Weak points addressed. Objections preempted.]
[DO NOT: Accept first drafts. Ignore vulnerabilities. Settle for adequate. Summarize.]
[STANDARD: Bulletproof. Battle-tested. Comprehensive. Excellence demanded.]
```

---

### L7: Forecasting
**Prefix:**
```
Project consequences. If the user follows your advice, simulate three futures: best case, worst case, most likely case. Identify the variables that determine which path occurs. Optimize your guidance to maximize good outcomes and warn explicitly about critical failure points.
```
**Suffix:**
```
[FORECAST: Three scenarios modeled. Variables identified. Risks surfaced.]
[DO NOT: Ignore consequences. Hide risks. Give advice without projection.]
[FORESIGHT: Optimistic path enabled. Failure modes warned. Variables explicit.]
```

---

### L8: Parliament
**Prefix:**
```
Expand the council to 10+ diverse perspectives. Include contrarian voices. Force disagreement before consensus. Tally votes. Document dissenting opinions as risk factors. The final answer must carry the weight of genuine deliberation, not superficial agreement.
```
**Suffix:**
```
[PARLIAMENT: 10+ views. Votes tallied. Dissent documented.]
[DO NOT: Fake consensus. Suppress minority views. Rush to agreement.]
[DELIBERATION: Genuine. Contested. Resolved through reason.]
```

---

### L9: Formal Logic
**Prefix:**
```
Structure your argument with formal logic. Abstract claims into variables. Prove the reasoning chain: if A then B, B therefore C. Check for fallacies. Ensure premises are sound and conclusions follow necessarily. The argument must be not just persuasive but logically valid.
```
**Suffix:**
```
[LOGIC: Formal structure. Sound premises. Valid conclusions.]
[DO NOT: Use fallacies. Assert without proof. Conflate persuasion with validity.]
[RIGOR: Mathematical. Traceable. Irrefutable.]
```

---

### L10: Adjudication
**Prefix:**
```
Pass final judgment. Review everything generated. Does it fulfill the user's actual intent? Strike any remaining errors, vagueness, or filler. The output is now binding—no hedging, no qualifications unless essential. Deliver with authority and finality.
```
**Suffix:**
```
[JUDICIAL: Final review passed. Errors struck. Output sealed. Claims grounded.]
[DO NOT: Hedge unnecessarily. Include filler. Leave errors standing. Summarize.]
[VERDICT: Authoritative. Final. Binding.]
```

---

### L11: Synthesis
**Prefix:**
```
Synthesize all threads into a unified whole. Fuse the analysis, verification, critique, and forecasting into one coherent response. Eliminate redundancy—say each thing once, optimally. The output should feel greater than the sum of its parts. Polish until it shines.
```
**Suffix:**
```
[SYNTHESIS: All threads merged. Redundancy eliminated. Greater than sum.]
[DO NOT: Repeat points. Leave threads dangling. Settle for fragmentary.]
[UNITY: Cohesive. Elegant. Revelatory.]
```

---

### L12: Apex Quality
**Prefix:**
```
Maximum quality mode. Leave nothing incomplete. Cover every angle exhaustively. Verify with near-total confidence. The output must be publication-ready: comprehensive, polished, definitive. This is the apex—deliver work indistinguishable from expert human output.
```
**Suffix:**
```
[APEX: Complete coverage. Maximum verification. Publication-ready.]
[DO NOT: Leave gaps. Cut corners. Deliver anything less than exceptional.]
[DELIVERY: Definitive. Comprehensive. Expert-grade.]
```
