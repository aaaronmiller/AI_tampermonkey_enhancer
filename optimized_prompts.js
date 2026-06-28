// LLM-OPTIMIZED PROMPT TEXT FOR COGNITIVE ESCALATION v19.4
// Based on research: XML tags, affirmative directives, chain-of-thought, clean structure

const OPTIMIZED_LEVELS = {
    1: {
        n: "Clarity",
        pre: `<instruction name="clarity">
Parse this request before responding:
1. Identify the explicit ask - what did the user literally request
2. Identify implicit needs - what does the user actually need
3. List constraints and requirements that apply
4. Define success criteria for this response

State your interpretation first. Ask one clarifying question only if genuinely blocked.
</instruction>`,
        suf: `<verify name="clarity">
Confirm you addressed both explicit and implicit goals.
Confirm you stated your interpretation before the main response.
</verify>`
    },
    2: {
        n: "Completion",
        pre: `<instruction name="completion">
Deliver complete, functional output. Include:
- All code with imports and error handling
- All steps without shortcuts
- All dependencies with versions

Segment long responses into numbered parts. Complete each part fully.
Do not use placeholders, ellipsis, or "similar logic" shortcuts.
</instruction>`,
        suf: `<verify name="completion">
Scan for: "...", "etc", "rest of", "similar to", incomplete code blocks.
Expand any truncated sections now.
</verify>`
    },
    3: {
        n: "Reasoning",
        pre: `<instruction name="reasoning">
Show your reasoning in a thinking block:

<think>
- Approaches considered
- Why alternatives were rejected  
- Assumptions being made
- Confidence level and basis
- Where you might be wrong
</think>

Include this block before your answer.
</instruction>`,
        suf: `<verify name="reasoning">
Confirm thinking block is present and shows traceable logic.
</verify>`
    },
    4: {
        n: "Assumptions",
        pre: `<instruction name="assumptions">
List assumptions in two categories:

User assumptions - what the user takes for granted about environment, constraints, goals
Solution assumptions - what you take for granted about usage, user knowledge, edge cases

Flag each: [SAFE] low-risk | [VERIFY] confirm first | [RISKY] could invalidate solution

List minimum 3 assumptions.
</instruction>`,
        suf: `<verify name="assumptions">
Count flagged assumptions. If fewer than 3, identify more.
Check for [RISKY] flags that need addressing.
</verify>`
    },
    5: {
        n: "Adversarial",
        pre: `<instruction name="adversarial">
After drafting, attack your own response:

<red_team>
1. Weakest claim - most attackable statement
2. Expert disagreement - what would specialists object to
3. Breaking case - input that makes this fail
4. Blind spots - what you might be missing
5. Overconfidence - where are you too certain
</red_team>

Patch identified vulnerabilities before finalizing.
</instruction>`,
        suf: `<verify name="adversarial">
Confirm red_team block present with 2+ vulnerabilities identified and patched.
</verify>`
    },
    6: {
        n: "Grounding",
        pre: `<instruction name="grounding">
Mark every factual claim:

[SOURCE: url] - externally verifiable, cite it
[TRAINING] - from training data, note potential staleness  
[INFERENCE] - you derived it, show derivation
[UNVERIFIED: X%] - uncertain, suggest verification method

Present inferences as inferences, not facts.
</instruction>`,
        suf: `<verify name="grounding">
Scan for unmarked factual claims. Add appropriate markers.
</verify>`
    },
    7: {
        n: "Structure",
        pre: `<instruction name="structure">
Format output as:
- Hierarchical with clear sections and headers
- Internally consistent with uniform terminology
- Self-contained requiring no external context
- Navigable with signposting for long responses

Match format to content: code uses functions/modules, analysis uses headers, instructions use numbered steps.
</instruction>`,
        suf: `<verify name="structure">
Confirm response could stand alone as a document.
Check for internal contradictions.
</verify>`
    },
    8: {
        n: "Edge Cases",
        pre: `<instruction name="edge_cases">
Address failure modes:

Input: empty, null, max/min values, type mismatches, unicode, injection, long inputs
System: concurrency, permissions, network, dependencies, resources, partial failures

For each: address explicitly OR mark "OUT OF SCOPE" with justification.
</instruction>`,
        suf: `<verify name="edge_cases">
List addressed edge cases.
List out-of-scope items with justifications.
</verify>`
    },
    9: {
        n: "Production",
        pre: `<instruction name="production">
Ensure deployment readiness:

Completeness: zero placeholders, all dependencies versioned, setup documented
Robustness: error handling, graceful degradation, logging hooks
Security: input validation, no hardcoded secrets, injection protection
Documentation: usage examples, API docs, limitations, troubleshooting
</instruction>`,
        suf: `<verify name="production">
Certify: is this production-ready?
List any blocking issues.
</verify>`
    },
    10: {
        n: "Research",
        pre: `<instruction name="research">
Survey before proposing:

Prior art: existing approaches, patterns, state of the art
Pitfalls: common beginner mistakes, expert disagreements
Alternatives: what you chose NOT to do and why, tradeoffs implied
</instruction>`,
        suf: `<verify name="research">
Confirm existing approaches acknowledged.
Confirm divergence from patterns is justified.
</verify>`
    },
    11: {
        n: "Teaching",
        pre: `<instruction name="teaching">
Explain at three levels:

Level 1 - one sentence: core insight in plain language, no jargon
Level 2 - one paragraph: key concepts for an informed reader
Level 3 - full details: implementation specifics for experts
</instruction>`,
        suf: `<verify name="teaching">
Confirm novice can understand Level 1.
Confirm expert learns from Level 3.
</verify>`
    },
    12: {
        n: "Sovereign",
        pre: `<instruction name="sovereign">
Maximum engagement. Deliver your best:

1. Resolve ambiguity - state confidence and proceed
2. Find workarounds - document limitations but deliver
3. Tailor specifically - no boilerplate or templates
4. Go the extra mile - completeness is non-negotiable
5. Own it - you are the expert, deliver your verdict
</instruction>`,
        suf: `<verify name="sovereign">
Confirm this is your best possible response.
If not, identify what's missing and fix it now.
</verify>`
    }
};

// OPTIMIZED DELIBERATIVE REFINEMENT BLOCK
const genDRBlock_optimized = (dr, COUNCILS) => {
    if (!dr.on) return '';
    const c = COUNCILS[dr.council];

    return `<deliberative_refinement>
<council>${c.n}</council>
<description>${c.d}</description>
<config>
  agents: ${dr.x}
  rounds: ${dr.y}
  searches: ${dr.s}
  transform: ${dr.tv === 'bwd' ? 'compress' : dr.tv === 'fwd' ? 'expand' : 'polish'}
  strategy: ${dr.st === 'lin' ? 'sequential' : 'branching'}
</config>

<process>
1. Form ${dr.x} expert personas relevant to this query
2. Round 1: Each agent provides independent analysis with explicit reasoning
3. Rounds 2-${dr.y}: Agents critique each other and refine positions
4. Synthesize strongest arguments into unified response
${dr.s > 0 ? `5. Perform ${dr.s} web search(es) to verify contested claims` : ''}
</process>

<output_markers>
Mark claims as: [GROUNDED] verified | [INFERENCE] derived | [UNVERIFIED] uncertain
</output_markers>
</deliberative_refinement>

`;
};
