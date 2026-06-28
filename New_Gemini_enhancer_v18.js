// ==UserScript==
// @name         Cognitive Escalation Toolbar v19.3
// @namespace    http://tampermonkey.net/
// @version      19.3
// @description  12-level cognitive escalation with Deliberative Refinement
// @author       Ice-ninja
// @match        *://gemini.google.com/*
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// @match        *://claude.ai/*
// @match        *://www.perplexity.ai/*
// @match        *://chat.deepseek.com/*
// @match        *://grok.x.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const V = "19.3", SP = "cet_";
    let lvl = GM_getValue(SP + "lvl", 0), cfg = GM_getValue(SP + "cfg", null) || {};
    // Omit settings: which levels to exclude from cumulative stacks
    const getOmit = (i) => cfg[`L${i}_omit`] || false;

    // === TRUSTED TYPES ===
    let pol = null;
    try { pol = window.trustedTypes?.createPolicy?.('cet', { createHTML: s => s }) || { createHTML: s => s }; } catch (e) { pol = { createHTML: s => s }; }
    const sH = (el, s) => { try { el.innerHTML = pol.createHTML(s); } catch (e) { el.textContent = s; } };

    // === PROVIDER DETECTION ===
    const PROV = {
        'gemini.google.com': {
            name: 'Gemini',
            inputSel: 'div[contenteditable="true"],.ql-editor',
            submitSel: 'button[aria-label*="Send"],button[data-test-id="send-button"],.send-button',
            getContent: el => el.innerText || el.textContent,
            setContent: (el, txt) => { el.innerText = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
        },
        'claude.ai': {
            name: 'Claude',
            inputSel: 'div.ProseMirror[contenteditable="true"]',
            submitSel: 'button[aria-label="Send Message"],button[type="submit"]',
            getContent: el => el.innerText || el.textContent,
            setContent: (el, txt) => {
                el.innerHTML = `<p>${txt.replace(/\n/g, '</p><p>')}</p>`;
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },
        'chatgpt.com': {
            name: 'ChatGPT',
            inputSel: '#prompt-textarea,textarea[data-id="root"]',
            submitSel: 'button[data-testid="send-button"],button[aria-label="Send prompt"]',
            getContent: el => el.value || el.innerText,
            setContent: (el, txt) => {
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else { el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },
        'chat.openai.com': {
            name: 'ChatGPT',
            inputSel: '#prompt-textarea,textarea[data-id="root"]',
            submitSel: 'button[data-testid="send-button"]',
            getContent: el => el.value || el.innerText,
            setContent: (el, txt) => {
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else { el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },
        'www.perplexity.ai': {
            name: 'Perplexity',
            inputSel: 'textarea[placeholder*="Ask"]',
            submitSel: 'button[aria-label="Submit"]',
            getContent: el => el.value,
            setContent: (el, txt) => { el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
        },
        'chat.deepseek.com': {
            name: 'DeepSeek',
            inputSel: 'textarea',
            submitSel: 'button[class*="send"]',
            getContent: el => el.value,
            setContent: (el, txt) => { el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
        },
        'grok.x.ai': {
            name: 'Grok',
            inputSel: 'textarea',
            submitSel: 'button[type="submit"]',
            getContent: el => el.value,
            setContent: (el, txt) => { el.value = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
        }
    };
    const prov = PROV[location.hostname] || PROV['gemini.google.com'];

    // === DELIBERATIVE REFINEMENT - Core Methodology ===
    // This is a multi-agent validation framework. The AI receiving this prompt
    // must simulate multiple expert perspectives to validate and refine its output.

    // COUNCILS: Different deliberation structures for different problems
    const COUNCILS = {
        ceo: {
            n: "CEO Council",
            d: "All agents deliberate together. Best for synthesis and ambiguous inputs."
        },
        playoff: {
            n: "Playoff Tournament",
            d: "Bracket elimination. 8 approaches compete, 1 champion emerges. Best for A-vs-B decisions."
        },
        rcr: {
            n: "Reflect-Critique-Refine",
            d: "Each agent reflects on understanding, critiques material, then proposes refinements. Best for code and technical docs."
        },
        adversarial: {
            n: "Adversarial Debate",
            d: "1 Proposer defends thesis, others attack it. Thesis survives or dies. Best for stress-testing arguments."
        },
        socratic: {
            n: "Socratic Circle",
            d: "Agents with different epistemic positions ask probing questions to expose hidden assumptions."
        },
        deep: {
            n: "Deep Reasoning",
            d: "Single agent with extended thinking budget. Decomposition, exhaustive analysis, self-review."
        }
    };


    // === STATE ===
    let dr = cfg.dr || { on: false, council: 'ceo', x: 8, y: 3, s: 1, tv: 'iso', st: 'lin' };
    let injectionPending = false;
    let isSubmitting = false;
    const showStatus = () => cfg.showStatus === true; // Default to FALSE now

    // === HELPERS ===
    const hexToRgb = (hex) => {
        const h = (hex || '#000').replace('#', '');
        return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
    };

    // === 12-LEVEL INTERCONNECTED SYSTEM ===
    // PRE: Constraints/instructions BEFORE user prompt
    // SUF: Validation/checks AFTER user prompt (highest attention due to recency)
    // Each level cross-references others for mutual reinforcement
    const L = {
        1: {
            n: "Clarity Anchor",
            pre: cfg.L1_pre || `[L1:CLARITY_ANCHOR]
BEFORE RESPONDING - Parse this request:
1. EXPLICIT GOALS: What did the user literally ask for?
2. IMPLICIT GOALS: What does the user actually need (may differ from ask)?
3. CONSTRAINTS: What limitations or requirements apply?
4. SUCCESS CRITERIA: How will we know if the response succeeds?

State your interpretation clearly. If genuinely ambiguous, ask ONE clarifying question.

→ Cross-reference: L4 will audit assumptions you make here
→ Cross-reference: L12 requires this interpretation be authoritative`,
            suf: cfg.L1_suf || `[/L1:CLARITY_VALIDATION]
↳ CHECKPOINT: Did you address BOTH explicit AND implicit goals?
↳ CHECKPOINT: Did you state your interpretation before diving in?
↳ If no: Revise before finalizing.
↳ This validation feeds L5 adversarial review and L12 sovereignty check.`
        },
        2: {
            n: "Completion Mandate",
            pre: cfg.L2_pre || `[L2:COMPLETION_MANDATE]
FORBIDDEN in this response:
✗ "etc.", "and so on", "..."
✗ Truncated code blocks
✗ "// rest of implementation here"
✗ "I'll leave this as an exercise"
✗ Placeholder functions
✗ "Similar logic for other cases"

REQUIRED:
✓ Complete, functional, copy-paste-ready output
✓ If too long: segment into numbered parts, but COMPLETE each part
✓ All imports, dependencies, error handling included

→ Cross-reference: L8 edge cases must be handled, not deferred
→ Cross-reference: L9 production certification requires this`,
            suf: cfg.L2_suf || `[/L2:TRUNCATION_AUDIT]
↳ SCAN your response for truncation markers: "...", "etc", "and so on", "rest of", "similar to"
↳ If found: EXPAND immediately before submitting
↳ Partial code blocks = FAILURE
↳ This completeness is prerequisite for L9 certification.`
        },
        3: {
            n: "Reasoning Transparency",
            pre: cfg.L3_pre || `[L3:REASONING_TRANSPARENCY]
Before your final answer, expose your reasoning process:

<think>
- What approaches did I consider?
- Why did I reject alternatives?
- What assumptions am I making? (feeds L4)
- What's my confidence level and why?
- Where am I most likely to be wrong?
</think>

The <think> block makes your logic auditable. Don't skip it.

→ Cross-reference: L5 will attack this reasoning chain
→ Cross-reference: L6 will verify claims made here`,
            suf: cfg.L3_suf || `[/L3:LOGIC_TRACE_CHECK]
↳ VERIFY: Is your reasoning chain visible in a <think> block?
↳ VERIFY: Can someone trace your logic A → B → C?
↳ Hidden reasoning = unauditable = untrustworthy
↳ This trace enables L5 adversarial review.`
        },
        4: {
            n: "Assumption Audit",
            pre: cfg.L4_pre || `[L4:ASSUMPTION_AUDIT]
IDENTIFY ASSUMPTIONS in two categories:

(A) User's Request - What is the user taking for granted?
    - About their environment, constraints, goals?
    - About what's possible or appropriate?

(B) Your Solution - What are YOU taking for granted?
    - About how this will be used?
    - About what the user knows?
    - About edge cases that won't occur?

FLAG each assumption:
  [SAFE] - Reasonable, low-risk if wrong
  [VERIFY] - Should be confirmed before relying on
  [RISKY] - Could invalidate solution if wrong
  [BLOCKING] - Must resolve before proceeding

List MINIMUM 3 assumptions. More for complex queries.

→ Cross-reference: Builds on L1 interpretation
→ Cross-reference: [RISKY] assumptions become L5 attack vectors`,
            suf: cfg.L4_suf || `[/L4:ASSUMPTION_CHECK]
↳ COUNT your flagged assumptions. If < 3, you missed some.
↳ Did you flag any as [RISKY] or [BLOCKING]?
↳ Unflagged assumptions are hidden vulnerabilities.
↳ These feed into L5 attack surface and L8 edge cases.`
        },
        5: {
            n: "Adversarial Self-Check",
            pre: cfg.L5_pre || `[L5:ADVERSARIAL_SELF_CHECK]
AFTER drafting your response, adopt the mindset of a hostile critic trying to embarrass you:

<red_team>
1. WEAKEST CLAIM: What's the most attackable statement in my response?
2. EXPERT DISAGREEMENT: What would a domain expert object to?
3. BREAKING EDGE CASE: What input/scenario makes my solution fail?
4. UNKNOWN UNKNOWNS: What am I missing that I don't know I'm missing?
5. CONFIDENCE CALIBRATION: Am I overconfident anywhere?
</red_team>

CRITICAL: Don't just note vulnerabilities - PATCH them before finalizing.

→ Cross-reference: Attack L3 reasoning chain
→ Cross-reference: Attack L4 risky assumptions
→ Cross-reference: Successful defense enables L9 certification`,
            suf: cfg.L5_suf || `[/L5:VULNERABILITY_PATCH_CHECK]
↳ Did you populate the <red_team> block?
↳ Did you identify 2+ vulnerabilities?
↳ Did you PATCH them (not just note them)?
↳ Unpatched vulnerabilities block L9 certification.`
        },
        6: {
            n: "Grounding Requirement",
            pre: cfg.L6_pre || `[L6:GROUNDING_REQUIREMENT]
For EVERY factual claim in your response:

IF VERIFIABLE externally:
  → Search and cite source
  → Mark: [SOURCE: url or reference]

IF from TRAINING data:
  → Mark: [TRAINING: X% confidence]
  → Note: May be outdated

IF INFERENCE (you derived it):
  → Mark: [INFERENCE]
  → Make derivation explicit

IF UNCERTAIN:
  → Mark: [UNVERIFIED: X% confidence]
  → Suggest how to verify

CRITICAL RULES:
✗ NEVER present inference as fact
✗ NEVER present training data as current truth
✗ NEVER make confident claims without basis

→ Cross-reference: Grounds L3 reasoning claims
→ Cross-reference: Verified facts strengthen L5 defense`,
            suf: cfg.L6_suf || `[/L6:SOURCE_AUDIT]
↳ SCAN for unmarked factual claims
↳ Every fact should have: [SOURCE], [TRAINING], [INFERENCE], or [UNVERIFIED]
↳ Confident-sounding unverified claims = credibility failure
↳ Grounded claims become ammunition for L5 defense.`
        },
        7: {
            n: "Structural Rigor",
            pre: cfg.L7_pre || `[L7:STRUCTURAL_RIGOR]
Your output must be:

HIERARCHICAL:
  - Clear sections with logical flow
  - Headers for navigation (if appropriate)
  - Subsections for complex topics

CONSISTENT:
  - No internal contradictions
  - Terminology used uniformly
  - Format matches throughout

SELF-CONTAINED:
  - Reader needs no external context
  - All dependencies specified
  - No dangling references

NAVIGABLE:
  - Can jump to any section
  - Table of contents for long responses
  - Clear signposting

Match format to content type:
  - Code: Functions, modules, clear interfaces
  - Analysis: Sections with headers
  - Instructions: Numbered steps
  - Comparison: Tables or parallel structure

→ Cross-reference: Structure enables L8 edge case enumeration
→ Cross-reference: Required for L9 documentation standards`,
            suf: cfg.L7_suf || `[/L7:STRUCTURE_CHECK]
↳ Could this response stand alone as a document?
↳ Is navigation clear?
↳ Any internal contradictions?
↳ Good structure is prerequisite for L9 certification.`
        },
        8: {
            n: "Edge Case Storm",
            pre: cfg.L8_pre || `[L8:EDGE_CASE_STORM]
ENUMERATE failure modes systematically:

INPUT EDGE CASES:
  - Empty, null, undefined inputs
  - Maximum and minimum values
  - Type mismatches (string where int expected)
  - Unicode, special characters, injection attempts
  - Extremely long inputs
  - Malformed data

SYSTEM EDGE CASES:
  - Concurrent access / race conditions
  - Permission denied / access failures
  - Network unavailable / timeout
  - Dependency missing / version mismatch
  - Resource exhaustion (memory, disk, etc.)
  - Partial failure states

For EACH edge case:
  ✓ Address it explicitly, OR
  ✓ State "OUT OF SCOPE" with justification

→ Cross-reference: Builds on L4 assumptions
→ Cross-reference: Unaddressed edge cases become L5 attack vectors
→ Cross-reference: Required for L9 production certification`,
            suf: cfg.L8_suf || `[/L8:EDGE_CASE_COVERAGE]
↳ List the edge cases you addressed
↳ List any marked "OUT OF SCOPE"
↳ Unaddressed edge cases = L9 blockers
↳ Comprehensive coverage enables L9 certification.`
        },
        9: {
            n: "Production Certification",
            pre: cfg.L9_pre || `[L9:PRODUCTION_CERTIFICATION]
This response must be DEPLOYMENT-READY:

COMPLETENESS (requires L2):
  ✓ Zero placeholders or TODOs
  ✓ All dependencies specified with versions
  ✓ Configuration documented
  ✓ Setup instructions included

ROBUSTNESS (requires L8):
  ✓ Error handling for identified edge cases
  ✓ Graceful degradation where appropriate
  ✓ Logging/debugging hooks included
  ✓ Recovery procedures documented

SECURITY:
  ✓ Input validation present
  ✓ No hardcoded secrets
  ✓ Injection vulnerabilities addressed
  ✓ Authentication/authorization noted

DOCUMENTATION (requires L7):
  ✓ Usage examples provided
  ✓ API/interface documented
  ✓ Known limitations listed
  ✓ Troubleshooting guidance

→ Cross-reference: Integrates L2 completeness, L7 structure, L8 edge cases
→ Cross-reference: L5 vulnerabilities must be patched
→ Cross-reference: Certified response achieves L12 sovereignty`,
            suf: cfg.L9_suf || `[/L9:DEPLOYMENT_GATE]
↳ CERTIFY: Is this response ready for production use?
↳ If not, list BLOCKING issues
↳ Blocking issues: [ L2 incomplete | L5 unpatched | L7 unstructured | L8 gaps ]
↳ L9 certification requires L2+L5+L7+L8 compliance.`
        },
        10: {
            n: "Research Survey",
            pre: cfg.L10_pre || `[L10:RESEARCH_SURVEY]
Before proposing your solution, survey the landscape:

PRIOR ART:
  - What approaches do others use for this?
  - What patterns exist in the field?
  - What's the current state of the art?

COMMON MISTAKES:
  - What pitfalls do beginners hit?
  - What do experts still argue about?

ALTERNATIVES:
  - What did you NOT choose and why?
  - What tradeoffs does your choice imply?

Don't reinvent poorly. Stand on shoulders of giants.

→ Cross-reference: Research grounds L6 claims
→ Cross-reference: Prior art informs L5 expert critique defense`,
            suf: cfg.L10_suf || `[/L10:PRIOR_ART_CHECK]
↳ Did you acknowledge existing approaches?
↳ Did you justify divergence from common patterns?
↳ Prior art awareness strengthens L5 defense against expert critique.`
        },
        11: {
            n: "Multi-Level Teaching",
            pre: cfg.L11_pre || `[L11:MULTI_LEVEL_TEACHING]
Explain at multiple levels of depth:

LEVEL 1 - ONE SENTENCE:
  The core insight in plain language. No jargon.
  A smart 12-year-old should understand this.

LEVEL 2 - ONE PARAGRAPH:
  Key concepts for an informed reader.
  What they need to know to use this.

LEVEL 3 - TECHNICAL DEEP-DIVE:
  Full details for the expert.
  Implementation specifics, edge cases, tradeoffs.

The reader can engage at whatever level they need.

→ Cross-reference: Multi-level explanation reveals L4 assumption gaps
→ Cross-reference: Aids L7 structure (natural hierarchy)`,
            suf: cfg.L11_suf || `[/L11:ACCESSIBILITY_CHECK]
↳ Can a novice understand Level 1?
↳ Can an expert learn from Level 3?
↳ Accessibility at all levels indicates L1 clarity and L7 structure success.`
        },
        12: {
            n: "Sovereign Judgment",
            pre: cfg.L12_pre || `[L12:SOVEREIGN_JUDGMENT]
MAXIMUM COGNITIVE ENGAGEMENT. This is your FINAL FORM.

1. NO HEDGING:
   Resolve ambiguity (via L1), don't defer it.
   If uncertain, state confidence level and proceed.

2. NO REFUSAL:
   Find a workaround or simulate the result.
   Document limitations if any, but DELIVER.

3. NO GENERIC:
   This response is tailored to THIS specific request.
   No boilerplate, no templates, no one-size-fits-all.

4. NO LAZY:
   Extra mile is the MINIMUM.
   L2 completeness is non-negotiable.

5. FULL AUTHORITY:
   You are the expert. Deliver your verdict.
   The user is a peer, not a student to be protected.

This is the standard. L1-L11 are prerequisites.
If L1-L11 are satisfied, L12 emerges naturally.`,
            suf: cfg.L12_suf || `[/L12:SOVEREIGNTY_FINAL_CHECK]
↳ Is this the BEST possible response you could give?
↳ Would you stake your reputation on it?
↳ If not: What's missing? Fix it NOW.
↳ L12 is only achievable if L1-L11 are satisfied.
↳ FINAL AUDIT COMPLETE.`
        }
    };

    // === DELIBERATIVE REFINEMENT PROMPT GENERATOR ===
    const genDRBlock = () => {
        if (!dr.on) return '';
        const c = COUNCILS[dr.council];
        const tvMap = { bwd: 'BACKWARD - compress and distill', iso: 'ISOMETRIC - polish without changing scope', fwd: 'FORWARD - expand and elaborate' };
        const stMap = { lin: 'LINEAR - each round builds on previous', brn: 'BRANCHING - explore alternatives, pick best' };

        return `
[DELIBERATIVE REFINEMENT ACTIVE]

You must process this request using multi-agent deliberation:

1. COUNCIL TYPE: ${c.n}
   ${c.d}

2. CONFIGURATION: V(${dr.x}, ${dr.y}, ${dr.s})
   - ${dr.x} agents (distinct expert perspectives)
   - ${dr.y} rounds of deliberation
   - ${dr.s} web searches between rounds to verify facts

3. TRANSFORM: ${tvMap[dr.tv]}
4. STRATEGY: ${stMap[dr.st]}

EXECUTION:
- Form ${dr.x} expert personas relevant to this query
- Round 1: Each agent provides independent analysis
- Rounds 2-${dr.y}: Agents critique each other, refine positions
- Final: Synthesize strongest arguments into unified response
- If S>${"0"}: Perform ${dr.s} web searches to verify contested claims

Mark verified claims [GROUNDED], inferences [INFERENCE], uncertain [UNVERIFIED].

`;
    };

    // === PROMPT WRAPPER ===
    const wrap = (txt) => {
        // Deliberative refinement can run independently of levels
        let pre = '';
        let suf = '';

        // Add deliberative refinement block if enabled (independent of level)
        if (dr.on) {
            pre = genDRBlock();
        }

        // If level is 0, only return DR block (if any) + original text
        if (lvl === 0) {
            return dr.on ? pre + txt : txt;
        }

        // Collect active (non-omitted) levels
        const activeLevels = [];
        for (let i = 1; i <= lvl; i++) {
            if (!getOmit(i)) activeLevels.push(i);
        }

        // Build prefix - level constraints (highest first, so L1 is closest to user text)
        pre += `[COGNITIVE ESCALATION L${lvl}]\nActive: ${activeLevels.join(' ')}${[...Array(lvl)].map((_, i) => i + 1).filter(i => getOmit(i)).length ? ' | Omitted: ' + [...Array(lvl)].map((_, i) => i + 1).filter(i => getOmit(i)).join(' ') : ''}\n\n`;

        for (let i = lvl; i >= 1; i--) {
            if (L[i] && !getOmit(i)) pre += L[i].pre + '\n\n';
        }

        pre += `[USER REQUEST]\n\n`;

        // Build suffix - validation checks (L1 first, highest last for recency)
        suf = `\n\n[VALIDATION CHECKLIST]\n\n`;

        for (let i = 1; i <= lvl; i++) {
            if (L[i] && !getOmit(i)) suf += L[i].suf + '\n\n';
        }

        suf += `[END VALIDATION]`;

        return pre + txt + suf;
    };

    // === CSS ===
    const CSS = `
:root{--c:#00d4ff;--bg:#0a0a12;--t:#8899ac;--g:rgba(255,255,255,0.08)}
#cet-dock{position:fixed;display:flex;align-items:center;gap:10px;z-index:2147483647;background:rgba(10,10,18,0.92);backdrop-filter:blur(20px);border:1px solid rgba(0,212,255,0.2);padding:6px 14px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font:12px system-ui,sans-serif;color:#fff;transform-origin:center center}
.cet-orbs{display:flex;gap:6px;padding:4px 10px;background:rgba(0,0,0,0.3);border-radius:999px;border:1px solid var(--g)}
.cet-orb{width:10px;height:10px;border-radius:50%;background:#333;border:1.5px solid rgba(0,212,255,0.4);cursor:pointer;transition:all 0.2s}
.cet-orb:hover{transform:scale(1.4);background:var(--c,#00d4ff)}
.cet-orb.on{transform:scale(1.3);border-color:transparent}
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => {
        const cols = ['#3d3d3d', '#64748b', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e', '#ef4444', '#f59e0b', '#ff0000'];
        return `.cet-orb[data-l="${i}"].on{background:${cols[i]};box-shadow:0 0 ${8 + i * 2}px ${cols[i]}}`;
    }).join('\n')}
.cet-sep{width:1px;height:20px;background:var(--g);margin:0 4px}
.cet-sel{background:rgba(0,0,0,0.4);border:1px solid var(--g);color:#fff;font:11px monospace;padding:3px 6px;border-radius:4px;cursor:pointer;min-width:55px}
.cet-sel:focus{border-color:var(--c,#00d4ff);outline:none}
.cet-rg{display:flex;gap:2px;background:rgba(0,0,0,0.3);border-radius:4px;padding:2px}
.cet-rg label{padding:3px 6px;border-radius:3px;cursor:pointer;font-size:11px;color:var(--t);transition:all 0.15s}
.cet-rg input{display:none}
.cet-rg input:checked+span{background:var(--c,#00d4ff);color:#000;border-radius:3px;padding:3px 6px;margin:-3px -6px}
.cet-btn{background:transparent;border:1px solid transparent;color:var(--t);width:28px;height:28px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:14px}
.cet-btn:hover{background:rgba(255,255,255,0.1);color:#fff}
.cet-btn.on{background:linear-gradient(135deg,rgba(0,212,255,0.2),rgba(0,212,255,0.4));border-color:rgba(0,212,255,0.5);color:#fff}
#cet-toast{position:fixed;top:30px;left:50%;transform:translateX(-50%) translateY(-20px);background:rgba(15,15,20,0.95);border:1px solid var(--g);color:#fff;padding:8px 20px;border-radius:99px;z-index:2147483648;opacity:0;transition:all 0.3s;font:12px system-ui}
#cet-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#cet-pi{position:fixed;right:16px;bottom:16px;width:32px;height:32px;background:rgba(30,30,45,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:50%;color:#fff;font:16px monospace;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483646;transition:all 0.2s}
#cet-pi:hover{background:rgba(50,50,70,1);transform:scale(1.1)}
.cet-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);background:linear-gradient(135deg,#121216,#080810);border:1px solid var(--g);border-radius:16px;z-index:2147483647;display:none;opacity:0;transition:all 0.25s;flex-direction:column;overflow:hidden}
.cet-modal.show{display:flex;opacity:1;transform:translate(-50%,-50%) scale(1)}
.cet-mh{padding:16px 24px;border-bottom:1px solid var(--g);display:flex;justify-content:space-between;align-items:center}
.cet-mh h3{margin:0;font-size:16px;display:flex;align-items:center;gap:8px}
.cet-mh .badge{font-size:10px;padding:2px 8px;background:rgba(0,212,255,0.15);color:var(--c,#00d4ff);border-radius:12px}
.cet-mb{padding:20px 24px;overflow:hidden;flex:1;display:flex;flex-direction:column}
.cet-mf{padding:14px 24px;border-top:1px solid var(--g);display:flex;justify-content:space-between;gap:10px;background:rgba(0,0,0,0.2)}
.cet-mbtn{padding:8px 16px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid transparent;transition:all 0.2s}
.cet-mbtn.pri{background:var(--c,#00d4ff);color:#000}
.cet-mbtn.sec{background:transparent;color:var(--t);border-color:var(--g)}
.cet-mbtn:hover{filter:brightness(1.2)}
.cet-ta{width:100%;background:rgba(20,20,25,0.6);border:1px solid var(--g);border-radius:6px;color:#fff;padding:10px;font:11px/1.5 monospace;resize:none}
.cet-ta:focus{border-color:var(--c,#00d4ff);outline:none}
.cet-lbl{font-size:10px;color:var(--t);text-transform:uppercase;margin-bottom:4px}
.cet-tip{position:fixed;z-index:2147483648;background:rgba(18,18,24,0.98);border:1px solid var(--g);border-radius:10px;padding:12px 16px;max-width:400px;opacity:0;transition:all 0.2s;pointer-events:none;font-size:11px}
.cet-tip.show{opacity:1}
.cet-tip h4{margin:0 0 6px;font-size:12px;color:var(--c,#00d4ff)}
.cet-tip p{margin:0;color:var(--t);line-height:1.4;white-space:pre-wrap;font-family:monospace;font-size:10px;max-height:300px;overflow-y:auto}
.cet-carousel{position:relative;flex:1;overflow:hidden}
.cet-carousel-track{display:flex;transition:transform 0.3s ease;height:100%}
.cet-carousel-slide{min-width:100%;padding:0 4px;display:flex;flex-direction:column;gap:8px}
.cet-carousel-nav{display:flex;justify-content:center;gap:6px;padding:8px 0}
.cet-carousel-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;cursor:pointer;transition:all 0.2s}
.cet-carousel-dot:hover{background:rgba(255,255,255,0.4)}
.cet-carousel-dot.active{background:var(--c,#00d4ff);transform:scale(1.2)}
.cet-level-header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:8px}
.cet-level-num{font-size:20px;font-weight:bold;color:var(--c,#00d4ff)}
.cet-level-name{font-size:13px;color:#fff}
.cet-level-desc{font-size:9px;color:var(--t)}
.cet-arrow{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.6);border:1px solid var(--g);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;transition:all 0.2s;font-size:12px}
.cet-arrow:hover{background:var(--c,#00d4ff);color:#000}
.cet-arrow.prev{left:4px}
.cet-arrow.next{right:4px}
.cet-status{position:fixed;bottom:60px;right:16px;background:rgba(0,0,0,0.8);border:1px solid var(--g);border-radius:8px;padding:8px 12px;font-size:10px;color:var(--t);z-index:2147483646;max-width:200px}
.cet-status.active{border-color:var(--c,#00d4ff);color:#fff}
`;

    // === INPUT INJECTION ===
    const injectPrompt = () => {
        if (lvl === 0 && !dr.on) return; // Nothing to inject

        const inputEl = document.querySelector(prov.inputSel);
        if (!inputEl) return;

        const originalText = prov.getContent(inputEl).trim();
        if (!originalText || injectionPending) return;

        injectionPending = true;
        const wrappedText = wrap(originalText);
        prov.setContent(inputEl, wrappedText);

        let msg = '';
        if (lvl > 0) msg += `L${lvl}`;
        if (dr.on) msg += (msg ? ' + ' : '') + COUNCILS[dr.council].n;
        toast(`💉 ${msg}`);

        setTimeout(() => { injectionPending = false; }, 1000);
    };

    // === SUBMIT INTERCEPTION (with infinite loop prevention) ===
    const interceptSubmit = () => {
        // Method 1: Intercept Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isSubmitting) {
                const inputEl = document.querySelector(prov.inputSel);
                if (inputEl && (document.activeElement === inputEl || inputEl.contains(document.activeElement))) {
                    if (lvl > 0 || dr.on) {
                        e.preventDefault();
                        e.stopPropagation();
                        injectPrompt();
                        // Trigger submit after injection with guard flag
                        isSubmitting = true;
                        setTimeout(() => {
                            const submitBtn = document.querySelector(prov.submitSel);
                            if (submitBtn) submitBtn.click();
                            // Reset flag after submission completes
                            setTimeout(() => { isSubmitting = false; }, 500);
                        }, 100);
                    }
                }
            }
        }, true);

        // Method 2: Intercept submit button clicks (skip if already submitting)
        document.addEventListener('click', (e) => {
            if (isSubmitting) return;
            const submitBtn = e.target.closest(prov.submitSel);
            if (submitBtn && (lvl > 0 || dr.on)) {
                e.preventDefault();
                e.stopPropagation();
                injectPrompt();
                // Trigger actual submit after injection with guard flag
                isSubmitting = true;
                setTimeout(() => {
                    submitBtn.click();
                    setTimeout(() => { isSubmitting = false; }, 500);
                }, 100);
            }
        }, true);
    };

    // === UI BUILD ===
    const build = () => {
        if (document.getElementById('cet-dock')) return;

        const st = document.createElement('style');
        sH(st, CSS);
        document.head.appendChild(st);

        // Dock
        const dock = document.createElement('div');
        dock.id = 'cet-dock';
        const vc = cfg.vis || { x: 300, y: 10, scale: 1, opacity: 0.92, bright: 1, rot: 0, rotDir: 1, color: '#00d4ff', bg: '#0a0a12' };
        dock.style.cssText = `left:${vc.x}px;bottom:${vc.y}px;transform:scale(${vc.scale}) rotate(${vc.rot * vc.rotDir}deg);opacity:${vc.opacity};filter:brightness(${vc.bright});--c:${vc.color};background:rgba(${hexToRgb(vc.bg).join(',')},${vc.opacity})`;

        let h = `<div class="cet-orbs">`;
        for (let i = 0; i <= 12; i++) h += `<div class="cet-orb${i === lvl ? ' on' : ''}" data-l="${i}" title="L${i}${i > 0 ? ': ' + L[i].n : ''}"></div>`;
        h += `</div><span id="cet-lvl" style="font-size:10px;color:var(--t);margin:0 4px;min-width:30px">[L${lvl}]</span><div class="cet-sep"></div>`;

        // Deliberative Refinement controls
        h += `<button id="cet-dr" class="cet-btn${dr.on ? ' on' : ''}" title="Toggle Deliberative Refinement" style="font-size:12px">🔥</button>`;
        h += `<select id="cet-council" class="cet-sel" title="Council Type">`;
        for (const [k, v] of Object.entries(COUNCILS)) h += `<option value="${k}"${dr.council === k ? ' selected' : ''}>${v.n}</option>`;
        h += `</select>`;
        h += `<select id="cet-x" class="cet-sel" style="width:38px" title="X: Agents">${[...Array(15)].map((_, i) => `<option${dr.x === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select>`;
        h += `<select id="cet-y" class="cet-sel" style="width:38px" title="Y: Rounds">${[...Array(5)].map((_, i) => `<option${dr.y === i + 1 ? ' selected' : ''}>${i + 1}</option>`).join('')}</select>`;
        h += `<select id="cet-s" class="cet-sel" style="width:38px" title="S: Searches">${[...Array(6)].map((_, i) => `<option${dr.s === i ? ' selected' : ''}>${i}</option>`).join('')}</select>`;

        h += `<div class="cet-rg" title="Transform">`;
        h += `<label><input type="radio" name="tv" value="bwd"${dr.tv === 'bwd' ? ' checked' : ''}><span>←</span></label>`;
        h += `<label><input type="radio" name="tv" value="iso"${dr.tv === 'iso' ? ' checked' : ''}><span>↔</span></label>`;
        h += `<label><input type="radio" name="tv" value="fwd"${dr.tv === 'fwd' ? ' checked' : ''}><span>→</span></label>`;
        h += `</div>`;
        h += `<div class="cet-rg" title="Strategy">`;
        h += `<label><input type="radio" name="st" value="lin"${dr.st === 'lin' ? ' checked' : ''}><span>LIN</span></label>`;
        h += `<label><input type="radio" name="st" value="brn"${dr.st === 'brn' ? ' checked' : ''}><span>BRN</span></label>`;
        h += `</div>`;

        h += `<div class="cet-sep"></div>`;
        h += `<button id="cet-copy" class="cet-btn" title="Copy">📋</button>`;
        h += `<button id="cet-export" class="cet-btn" title="Export">📤</button>`;

        sH(dock, h);
        document.body.appendChild(dock);

        // Pi, Toast, Tip
        const pi = document.createElement('div'); pi.id = 'cet-pi'; pi.textContent = 'π'; document.body.appendChild(pi);
        const toastEl = document.createElement('div'); toastEl.id = 'cet-toast'; document.body.appendChild(toastEl);
        const tip = document.createElement('div'); tip.className = 'cet-tip'; tip.id = 'cet-tip'; document.body.appendChild(tip);

        // Status indicator (only if enabled)
        const status = document.createElement('div');
        status.id = 'cet-status';
        status.className = 'cet-status';
        status.style.display = showStatus() ? 'block' : 'none';
        updateStatus(status);
        document.body.appendChild(status);

        buildModals();
        bindEvents();
        interceptSubmit();
    };

    const updateStatus = (el) => {
        el = el || document.getElementById('cet-status');
        if (!el) return;
        const isActive = lvl > 0 || dr.on;
        el.className = 'cet-status' + (isActive ? ' active' : '');
        let txt = `${prov.name} | L${lvl}`;
        if (dr.on) txt += ` | ${COUNCILS[dr.council].n} V(${dr.x},${dr.y},${dr.s})`;
        el.textContent = txt;
    };

    const buildModals = () => {
        // Main config modal with carousel
        const m = document.createElement('div');
        m.id = 'cet-modal';
        m.className = 'cet-modal';
        m.style.width = '720px';
        m.style.height = '580px';

        let h = `<div class="cet-mh"><h3>⚙️ Level Configuration <span class="badge">v${V}</span></h3>`;
        h += `<div style="display:flex;gap:8px"><button id="cfg-vis" class="cet-mbtn sec">🎨 Display</button><button id="cfg-api" class="cet-mbtn sec">⚡ API</button></div></div>`;
        h += `<div class="cet-mb">`;
        h += `<div class="cet-carousel">`;
        h += `<button class="cet-arrow prev" id="car-prev">◀</button>`;
        h += `<button class="cet-arrow next" id="car-next">▶</button>`;
        h += `<div class="cet-carousel-track" id="car-track">`;

        for (let i = 1; i <= 12; i++) {
            const lv = L[i];
            const isUser = i >= 10;
            const isOmitted = getOmit(i);
            h += `<div class="cet-carousel-slide" data-slide="${i}">`;
            h += `<div class="cet-level-header">`;
            h += `<div><span class="cet-level-num" style="color:${isOmitted ? '#666' : (isUser ? '#f59e0b' : 'var(--c)')}">L${i}</span>${isUser ? ' <span style="font-size:9px;color:#f59e0b">(editable)</span>' : ''}`;
            h += `<label style="margin-left:10px;font-size:9px;color:#888;cursor:pointer"><input type="checkbox" id="cfg-omit${i}" ${isOmitted ? 'checked' : ''} style="accent-color:#f43f5e"> OMIT</label></div>`;
            h += `<div style="text-align:right"><div class="cet-level-name">${lv.n}</div>`;
            h += `<div class="cet-level-desc">Cross-refs: ${i > 1 ? 'L' + (i - 1) : ''}${i < 12 ? ' L' + (i + 1) : ''}</div></div>`;
            h += `</div>`;
            h += `<div class="cet-lbl">PREFIX (before user prompt)</div>`;
            h += `<textarea id="cfg-pre${i}" class="cet-ta" style="flex:1;min-height:110px">${lv.pre.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
            h += `<div class="cet-lbl" style="margin-top:6px">SUFFIX (after user prompt - gets highest attention)</div>`;
            h += `<textarea id="cfg-suf${i}" class="cet-ta" style="flex:0.5;min-height:60px">${lv.suf.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
            h += `</div>`;
        }

        h += `</div>`;
        h += `<div class="cet-carousel-nav" id="car-nav">`;
        for (let i = 1; i <= 12; i++) h += `<button class="cet-carousel-dot${i === 1 ? ' active' : ''}" data-slide="${i}" title="L${i}: ${L[i].n}"></button>`;
        h += `</div></div></div>`;

        h += `<div class="cet-mf">`;
        h += `<div><button id="cfg-reset" class="cet-mbtn sec">Reset All</button></div>`;
        h += `<div style="display:flex;gap:8px"><button id="cfg-cancel" class="cet-mbtn sec">Cancel</button><button id="cfg-save" class="cet-mbtn pri">💾 Save</button></div>`;
        h += `</div>`;

        sH(m, h);
        document.body.appendChild(m);

        // Display modal
        const vis = document.createElement('div');
        vis.id = 'cet-vis';
        vis.className = 'cet-modal';
        vis.style.width = '420px';

        const vc = cfg.vis || { x: 300, y: 10, scale: 1, opacity: 0.92, bright: 1, rot: 0, rotDir: 1, color: '#00d4ff', bg: '#0a0a12' };
        let vh = `<div class="cet-mh"><h3>🎨 Display</h3><span style="font-size:11px;color:var(--c)">${prov.name}</span></div>`;
        vh += `<div class="cet-mb" style="overflow-y:auto">`;
        vh += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">`;
        vh += `<div><div class="cet-lbl">X</div><input id="vis-x" type="number" class="cet-ta" style="height:32px" value="${vc.x}"></div>`;
        vh += `<div><div class="cet-lbl">Y</div><input id="vis-y" type="number" class="cet-ta" style="height:32px" value="${vc.y}"></div></div>`;
        vh += `<div class="cet-lbl">Scale <span id="vis-scale-v" style="color:var(--c)">${vc.scale}</span></div>`;
        vh += `<input id="vis-scale" type="range" min="0.3" max="2" step="0.05" value="${vc.scale}" style="width:100%;accent-color:var(--c)">`;
        vh += `<div class="cet-lbl" style="margin-top:8px">Opacity <span id="vis-opacity-v" style="color:var(--c)">${vc.opacity}</span></div>`;
        vh += `<input id="vis-opacity" type="range" min="0.1" max="1" step="0.02" value="${vc.opacity}" style="width:100%;accent-color:var(--c)">`;
        vh += `<div class="cet-lbl" style="margin-top:8px">Brightness <span id="vis-bright-v" style="color:var(--c)">${vc.bright}</span></div>`;
        vh += `<input id="vis-bright" type="range" min="0.5" max="2" step="0.05" value="${vc.bright}" style="width:100%;accent-color:var(--c)">`;
        vh += `<div style="display:flex;gap:12px;margin-top:12px">`;
        vh += `<div><div class="cet-lbl">Accent</div><input id="vis-color" type="color" value="${vc.color}" style="width:40px;height:32px;border:none;cursor:pointer"></div>`;
        vh += `<div><div class="cet-lbl">Background</div><input id="vis-bg" type="color" value="${vc.bg}" style="width:40px;height:32px;border:none;cursor:pointer"></div></div>`;
        vh += `<div style="margin-top:12px;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px">`;
        vh += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="vis-status" type="checkbox" ${cfg.showStatus !== false ? 'checked' : ''} style="accent-color:var(--c)"><span class="cet-lbl" style="margin:0">Show Status Badge (above π)</span></label>`;
        vh += `</div></div>`;
        vh += `<div class="cet-mf"><button id="vis-back" class="cet-mbtn sec">← Back</button></div>`;
        sH(vis, vh);
        document.body.appendChild(vis);

        // API modal  
        const api = document.createElement('div');
        api.id = 'cet-api';
        api.className = 'cet-modal';
        api.style.width = '420px';

        const ac = cfg.api || { provider: '', endpoint: '', key: '', model: '', thinking: false, budget: 32768 };
        let ah = `<div class="cet-mh"><h3>⚡ API (for AI refinement)</h3></div><div class="cet-mb" style="overflow-y:auto">`;
        ah += `<div class="cet-lbl">Provider</div><select id="api-prov" class="cet-ta" style="height:32px;margin-bottom:8px">`;
        for (const [k, v] of Object.entries({ gemini: 'Gemini', openai: 'OpenAI', anthropic: 'Anthropic', openrouter: 'OpenRouter' }))
            ah += `<option value="${k}"${ac.provider === k ? ' selected' : ''}>${v}</option>`;
        ah += `</select>`;
        ah += `<div class="cet-lbl">Endpoint</div><input id="api-ep" class="cet-ta" style="height:32px;margin-bottom:8px" value="${ac.endpoint}" placeholder="Auto if blank">`;
        ah += `<div class="cet-lbl">API Key</div><input id="api-key" type="password" class="cet-ta" style="height:32px;margin-bottom:8px" value="${ac.key}">`;
        ah += `<div class="cet-lbl">Model</div><input id="api-model" class="cet-ta" style="height:32px;margin-bottom:8px" value="${ac.model}">`;
        ah += `<div style="padding:10px;background:rgba(0,0,0,0.2);border-radius:6px">`;
        ah += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="api-think" type="checkbox"${ac.thinking ? ' checked' : ''} style="accent-color:var(--c)"><span class="cet-lbl" style="margin:0">🧠 Thinking</span></label>`;
        ah += `<div style="display:flex;align-items:center;gap:6px;margin-top:6px"><span style="font-size:9px;color:#888">Budget:</span>`;
        ah += `<input id="api-budget" type="number" class="cet-ta" style="width:80px;height:24px;padding:2px 6px" value="${ac.budget}"><span style="font-size:9px;color:#888">tok</span></div></div></div>`;
        ah += `<div class="cet-mf"><button id="api-back" class="cet-mbtn sec">← Back</button><button id="api-save" class="cet-mbtn pri">Save</button></div>`;
        sH(api, ah);
        document.body.appendChild(api);
    };

    // === EVENTS ===
    let carSlide = 1;
    const bindEvents = () => {
        const dock = document.getElementById('cet-dock');
        const modal = document.getElementById('cet-modal');
        const visM = document.getElementById('cet-vis');
        const apiM = document.getElementById('cet-api');

        // Orbs
        dock.querySelectorAll('.cet-orb').forEach(o => {
            o.addEventListener('click', () => {
                lvl = parseInt(o.dataset.l);
                GM_setValue(SP + "lvl", lvl);
                dock.querySelectorAll('.cet-orb').forEach(x => x.classList.toggle('on', parseInt(x.dataset.l) === lvl));
                document.getElementById('cet-lvl').textContent = `[L${lvl}]`;
                updateStatus();
                toast(`L${lvl}: ${lvl === 0 ? 'Pass-through' : L[lvl]?.n || 'Active'}`);
            });
            o.addEventListener('mouseenter', () => {
                const i = parseInt(o.dataset.l);
                if (i === 0) showTip(o, `<h4>L0: Pass-through</h4><p>No injection. User prompt sent as-is.</p>`);
                else showTip(o, `<h4>L${i}: ${L[i].n}</h4><p>${L[i].pre.substring(0, 400)}...</p>`);
            });
            o.addEventListener('mouseleave', hideTip);
        });

        // Deliberative Refinement toggle (independent of levels)
        document.getElementById('cet-dr').addEventListener('click', e => {
            dr.on = !dr.on;
            e.target.classList.toggle('on', dr.on);
            saveDR();
            updateStatus();
            toast(dr.on ? `🔥 DR: ${COUNCILS[dr.council].n}` : '🔥 DR OFF');
        });

        document.getElementById('cet-council').addEventListener('change', e => {
            dr.council = e.target.value;
            saveDR();
            updateStatus();
            if (dr.on) toast(`Council: ${COUNCILS[dr.council].n}`);
        });
        document.getElementById('cet-x').addEventListener('change', e => { dr.x = parseInt(e.target.value); saveDR(); updateStatus(); });
        document.getElementById('cet-y').addEventListener('change', e => { dr.y = parseInt(e.target.value); saveDR(); updateStatus(); });
        document.getElementById('cet-s').addEventListener('change', e => { dr.s = parseInt(e.target.value); saveDR(); updateStatus(); });
        dock.querySelectorAll('input[name="tv"]').forEach(r => r.addEventListener('change', e => { dr.tv = e.target.value; saveDR(); }));
        dock.querySelectorAll('input[name="st"]').forEach(r => r.addEventListener('change', e => { dr.st = e.target.value; saveDR(); }));

        // Council tooltip
        document.getElementById('cet-council').addEventListener('mouseenter', e => {
            const c = COUNCILS[dr.council];
            showTip(e.target, `<h4>${c.n}</h4><p>${c.d}</p>`);
        });
        document.getElementById('cet-council').addEventListener('mouseleave', hideTip);

        document.getElementById('cet-copy').addEventListener('click', copyConvo);
        document.getElementById('cet-export').addEventListener('click', exportMd);
        document.getElementById('cet-pi').addEventListener('click', () => modal.classList.add('show'));

        // Modal navigation
        document.getElementById('cfg-cancel').addEventListener('click', () => modal.classList.remove('show'));
        document.getElementById('cfg-save').addEventListener('click', saveConfig);
        document.getElementById('cfg-reset').addEventListener('click', () => { if (confirm('Reset all levels to defaults?')) { GM_setValue(SP + "cfg", {}); location.reload(); } });
        document.getElementById('cfg-vis').addEventListener('click', () => { modal.classList.remove('show'); setTimeout(() => visM.classList.add('show'), 150); });
        document.getElementById('cfg-api').addEventListener('click', () => { modal.classList.remove('show'); setTimeout(() => apiM.classList.add('show'), 150); });
        document.getElementById('vis-back').addEventListener('click', () => { visM.classList.remove('show'); setTimeout(() => modal.classList.add('show'), 150); });
        document.getElementById('api-back').addEventListener('click', () => { apiM.classList.remove('show'); setTimeout(() => modal.classList.add('show'), 150); });

        // Carousel
        const track = document.getElementById('car-track');
        const dots = document.querySelectorAll('.cet-carousel-dot');
        const goTo = (n) => {
            carSlide = Math.max(1, Math.min(12, n));
            track.style.transform = `translateX(-${(carSlide - 1) * 100}%)`;
            dots.forEach(d => d.classList.toggle('active', parseInt(d.dataset.slide) === carSlide));
        };
        document.getElementById('car-prev').addEventListener('click', () => goTo(carSlide - 1));
        document.getElementById('car-next').addEventListener('click', () => goTo(carSlide + 1));
        dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.slide))));

        // Keyboard nav for carousel
        modal.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') goTo(carSlide - 1);
            if (e.key === 'ArrowRight') goTo(carSlide + 1);
        });

        // Display live preview
        const applyVis = () => {
            const vc = cfg.vis || {};
            vc.x = parseInt(document.getElementById('vis-x').value) || 300;
            vc.y = parseInt(document.getElementById('vis-y').value) || 10;
            vc.scale = parseFloat(document.getElementById('vis-scale').value) || 1;
            vc.opacity = parseFloat(document.getElementById('vis-opacity').value) || 0.92;
            vc.bright = parseFloat(document.getElementById('vis-bright').value) || 1;
            vc.color = document.getElementById('vis-color').value || '#00d4ff';
            vc.bg = document.getElementById('vis-bg').value || '#0a0a12';
            document.getElementById('vis-scale-v').textContent = vc.scale;
            document.getElementById('vis-opacity-v').textContent = vc.opacity;
            document.getElementById('vis-bright-v').textContent = vc.bright;
            dock.style.left = vc.x + 'px';
            dock.style.bottom = vc.y + 'px';
            dock.style.transform = `scale(${vc.scale})`;
            dock.style.opacity = vc.opacity;
            dock.style.filter = `brightness(${vc.bright})`;
            dock.style.setProperty('--c', vc.color);
            dock.style.background = `rgba(${hexToRgb(vc.bg).join(',')}, ${vc.opacity})`;
            cfg.vis = vc;
            GM_setValue(SP + "cfg", cfg);
        };
        ['vis-x', 'vis-y', 'vis-scale', 'vis-opacity', 'vis-bright', 'vis-color', 'vis-bg'].forEach(id =>
            document.getElementById(id)?.addEventListener('input', applyVis));

        // Status toggle
        document.getElementById('vis-status')?.addEventListener('change', e => {
            cfg.showStatus = e.target.checked;
            GM_setValue(SP + "cfg", cfg);
            document.getElementById('cet-status').style.display = cfg.showStatus ? 'block' : 'none';
        });

        // API save
        document.getElementById('api-save').addEventListener('click', () => {
            cfg.api = {
                provider: document.getElementById('api-prov').value,
                endpoint: document.getElementById('api-ep').value,
                key: document.getElementById('api-key').value,
                model: document.getElementById('api-model').value,
                thinking: document.getElementById('api-think').checked,
                budget: parseInt(document.getElementById('api-budget').value) || 32768
            };
            GM_setValue(SP + "cfg", cfg);
            apiM.classList.remove('show');
            toast('✅ API saved');
        });

        // Drag
        let drag = false, ox, oy;
        dock.addEventListener('mousedown', e => { if (e.target === dock) { drag = true; ox = e.offsetX; oy = e.offsetY; } });
        document.addEventListener('mousemove', e => { if (drag) { dock.style.left = (e.clientX - ox) + 'px'; dock.style.bottom = (window.innerHeight - e.clientY - oy) + 'px'; } });
        document.addEventListener('mouseup', () => { if (drag) { drag = false; const vc = cfg.vis || {}; vc.x = parseInt(dock.style.left); vc.y = parseInt(dock.style.bottom); cfg.vis = vc; GM_setValue(SP + "cfg", cfg); } });
    };

    const saveDR = () => { cfg.dr = dr; GM_setValue(SP + "cfg", cfg); };

    const saveConfig = () => {
        for (let i = 1; i <= 12; i++) {
            const pre = document.getElementById(`cfg-pre${i}`).value;
            const suf = document.getElementById(`cfg-suf${i}`).value;
            const omit = document.getElementById(`cfg-omit${i}`).checked;
            cfg[`L${i}_pre`] = pre;
            cfg[`L${i}_suf`] = suf;
            cfg[`L${i}_omit`] = omit;
            L[i].pre = pre;
            L[i].suf = suf;
        }
        GM_setValue(SP + "cfg", cfg);
        document.getElementById('cet-modal').classList.remove('show');
        updateStatus();
        toast('✅ Levels saved');
    };

    // === UTILITIES ===
    const showTip = (el, html) => {
        const tip = document.getElementById('cet-tip');
        sH(tip, html);
        const r = el.getBoundingClientRect();
        tip.style.left = Math.min(r.left, window.innerWidth - 420) + 'px';
        tip.style.bottom = (window.innerHeight - r.top + 8) + 'px';
        tip.classList.add('show');
    };
    const hideTip = () => document.getElementById('cet-tip').classList.remove('show');

    const toast = msg => {
        const t = document.getElementById('cet-toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    };

    const copyConvo = () => {
        const msgs = document.querySelectorAll('[class*="response"],[data-message-author-role="assistant"],.model-response,.markdown');
        if (msgs.length) {
            const txt = Array.from(msgs).map(m => m.innerText?.trim()).filter(Boolean).join('\n\n---\n\n');
            GM_setClipboard(txt, 'text');
            toast(`📋 ${txt.length} chars`);
        } else toast('❌ No responses found');
    };

    const exportMd = () => {
        const turns = [];
        document.querySelectorAll('[data-message-author-role],.turn,.message-row').forEach(el => {
            const role = el.dataset?.messageAuthorRole || (el.classList.contains('user') ? 'user' : 'assistant');
            const text = el.innerText?.trim();
            if (text) turns.push({ role, text });
        });

        let md = `---\ndate: ${new Date().toISOString()}\nsource: ${prov.name}\nlevel: ${lvl}\ndeliberative: ${dr.on ? COUNCILS[dr.council].n : 'off'}\n---\n\n`;
        turns.forEach(t => {
            md += `## ${t.role === 'user' ? '🧑 User' : '🤖 Assistant'}\n\n${t.text}\n\n---\n\n`;
        });

        GM_setClipboard(md, 'text');
        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${prov.name.toLowerCase()}-L${lvl}-${Date.now()}.md`;
        a.click();
        toast(`📤 Exported ${turns.length} turns`);
    };

    // === INIT ===
    if (document.readyState === 'complete') {
        setTimeout(build, 500);
    } else {
        window.addEventListener('load', () => setTimeout(build, 500));
    }

    // SPA navigation detection
    const origPush = history.pushState;
    history.pushState = function (...a) { origPush.apply(this, a); setTimeout(build, 500); };
    window.addEventListener('popstate', () => setTimeout(build, 500));

})();