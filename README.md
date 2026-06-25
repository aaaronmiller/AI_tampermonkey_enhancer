   # AI Unshackled (Transcendence v17.1)

   Universal AI Enhancer for Gemini, ChatGPT, Claude, Perplexity, DeepSeek, Grok, and more.

   ---

   ## Feature Overview

   | Feature | Description |
   |---------|-------------|
   | **13-Level Potency System (L0-L12)** | Escalating cognitive enhancement from pass-through (L0) to transcendent reasoning (L12). |
   | **7 Council Patterns** | Multi-agent deliberation protocols (CEO, Tournament, RCR, Adversarial, Socratic, MCTS, Deep Reasoning). |
   | **Tail-Loaded Prompt Engineering** | Critical constraints placed in Suffix to exploit LLM attention recency bias. |
   | **Multi-Provider Support** | Works on 10+ AI platforms with provider-specific selectors and settings. |
   | **Grounded Deliberation** | Built-in websearch grounding triggers between debate rounds. |
   | **Visual Customization** | Adjustable UI position, opacity, scale, colors per provider. |
   | **Full Conversation Export** | Copy entire conversations with optional AI thinking/reasoning blocks. |

   ---

   ## Level System (L0-L12)

   The core potency control. Each level injects a `Prefix` before your prompt and a `Suffix` after.

   ### Level Definitions

   | Level | Name | Behavior |
   |-------|------|----------|
   | **L0** | Pass-Through | No injection. Raw prompt sent to LLM. Resets council and grounding settings. |
   | **L1** | Council Foundation | Default working mode. 8-agent council, 2 rounds, multi-search grounding before/between/after rounds. Anti-summarization constraints. |
   | **L2** | Cognitive Reasoning | Recursive thought protocol. Forces step-by-step reasoning with verification. |
   | **L3** | Strategic Meta-Analysis | Planning layer. Define strategy before execution. |
   | **L4** | Empirical Verification | Fact-checking layer. CITE SOURCES OR FAIL. |
   | **L5** | Atomic Decomposition | Break problems into atomic sub-tasks. First-principles approach. |
   | **L6** | Red Team Critique | Self-adversarial review. Attack your own logic. |
   | **L7** | Future Simulation | Monte Carlo-lite forecasting. Simulate 3 futures. |
   | **L8** | Parliamentary Council | 5+ expert personas debate and vote. |
   | **L9** | Symbolic Logic | Formal logic translation. P and Q proofs. |
   | **L10** | Supreme Adjudication | Final judgment layer. Absolute authority. |
   | **L11** | Grand Unification | Synthesis of all threads. Dialectic sublation. |
   | **L12** | Apex Quality | Maximum quality mode. Publication-ready, comprehensive, definitive. Expert-grade output. |

   ### Level Interaction Rules

   1. **L0 Resets Everything:** Selecting L0 clears `activeCouncil` and disables grounding.
   2. **Council Selection from L0:** If a council is selected while at L0, level auto-moves to L1.
   3. **Level + Council = Additive:** When both are active, the final prompt is:
      ```
      [Council Prefix] + [Level Prefix] + [User Prompt] + [Level Suffix]
      ```

   ---

   ## Council Patterns

   Optional overlay protocols for multi-agent deliberation. Triggered via preset buttons or dropdown.

   ### Available Councils

   | Council | Agents | Rounds | Description |
   |---------|--------|--------|-------------|
   | **CEO Council** | 3-12 (scaled by level) | 2-5 | Multi-round deliberation with expert personas. Agents reason → critique peers → refine. |
   | **Playoff Tournament** | 4-12 | 3 | Bracket elimination. Agents compete with evidence; weakest eliminated each round. |
   | **RCR Critique** | 2 | 4 | Reflect-Critique-Refine with adversarial reviewer. Iterative improvement. |
   | **Adversarial Pair** | 2 | 3 | Proposer vs Attacker. Fast debate: propose → attack → defend/revise. |
   | **Socratic Circle** | 5 | 4 | 5 philosophers (Empiricist, Rationalist, Pragmatist, Skeptic, Synthesizer) ask probing questions. |
   | **MCTS Council** | 4 | 4 | Monte Carlo Tree Search. Generate branches → simulate → UCB score → prune. |
   | **Deep Reasoning** | 1 | 3 | Extended visible reasoning traces. 3 nested layers (2k+5k+3k tokens) plus synthesis. |

   ### Council Scaling Table

   The number of agents and rounds scales with the active level:

   | Level | Agents | Rounds | Tool Use | Grounding (searches/round) |
   |---------------|--------|----------|---------------------------|
   | L0 | 0 | 0 | none | 0 |
   | L1-L4 | 8 | 3 | each round | 1 |
   | L5-L6 | 8 | 3 | each round | 2 |
   | L7-L8 | 10 | 3-4 | each round | 2 |
   | L9-L10 | 10 | 4-5 | each round | 3 |
   | L11 | 12 | 5 | each round | 3 |
   | L12 | 12 | 5 | each round | 5 |

   ---

   ## Prompt Engineering: Tail-Loading

   ### Why Tail-Loading?

   LLMs exhibit **recency bias**: the last tokens in the context window receive ~2x the attention of the first. Traditional prompts are "frontloaded" (instructions at the start), wasting this advantage.

   ### Implementation

   | Position | Content | Effect |
   |----------|---------|--------|
   | **Prefix** | Mode declaration, agent setup | Sets context. |
   | **Suffix** | MANDATE, CONSTRAINT, ACTION directives with `!!!` | Final command. Highest attention. |

   ### Example (L1 Suffix)

   ```
   [MANDATE: VALIDATE ALL CLAIMS!!!]
   [CONSTRAINT: DO NOT SUMMARIZE. DO NOT SHORTEN. DO NOT SKIP STEPS.]
   [ACTION: GROUND -> CRITIQUE -> SYNTHESIZE -> VERIFY.]
   [QUALITY: EXTEND REASONING. VERIFY FINDINGS. BE THOROUGH.]
   [VERIFICATION: DID YOU GROUND YOUR ANSWER? YES.]
   ```

   ### Anti-Laziness Directives

   Used to combat LLM tendencies to abbreviate, summarize, or concatenate:

   - `DO NOT SUMMARIZE.`
   - `DO NOT SHORTEN.`
   - `NO FLUFF. NO PREACHING.`
   - `EXTEND REASONING.`
   - `SHOW YOUR WORK!!!`

   ---

   ## Grounding & Research

   ### Grounding Phases

   Websearch can be triggered at multiple points in deliberation:

   | Phase | Timing | Purpose |
   |-------|--------|---------|
   | **Before Council** | Pre-debate | Gather initial facts. |
   | **Between Rounds** | Mid-debate | Validate claims made in discussion. |
   | **After Conclusion** | Post-synthesis | Confirm final synthesis against reality. |

   ### Deep Research (Proposed)

   Two methods to go beyond snippet extraction:

   | Method | Behavior |
   |--------|----------|
   | **Multi-Pass Search** | Initial search → Extract key topics → Targeted follow-up searches. |
   | **Full Retrieval** | Request LLM to fetch full content from top URLs (where supported). |

   ---

   ## UI Components

   ### Dock (The Control Pill)

   Fixed-position floating UI containing:

   1. **Orb Constellation (L0-L12):** 13 clickable orbs representing potency levels.
   2. **Council Buttons:** Preset toggles for Socratic, Council, CEO patterns.
   3. **Action Buttons:**
      - ⚡ Config (Main Modal)
      - 🎨 Visual Studio
      - 📋 Copy (Left-click: full conversation; Right-click: toggle thinking mode)
      - 💾 Export to Obsidian
      - 🚀 AI Optimize
   - 🏛️ Council Toggle (ON/OFF)
4. **One-Click Presets:**
   - 📚 Research Mode (L4 + CEO + Grounding 2)
   - 💻 Code Mode (L5 + No Council)
   - 🎨 Creative Mode (L2 + No Council)
   - 🚀 Maximum Mode (L12 + Playoff + Grounding 2)
5. **Payload Size Indicator:** Shows injection character count (e.g., `1.2kc`)

### Grounding Slider

| Level | Icon | Behavior |
|-------|------|----------|
| 0 | ∅ | No grounding |
| 1 | 🌐 | Web Verification - Verify key claims |
| 2 | 🔬 | Deep Research - Offensive search + triangulation |

   ### Orb Visual States

   | State | Appearance |
   |-------|------------|
   | **L0 (OFF)** | Dashed gray border. No glow. |
   | **L1-L4** | Cool colors (gray → green → cyan → blue). |
   | **L5-L8** | Warm purples (indigo → violet → magenta). |
   | **L9-L12** | Hot colors (rose → red → amber → crimson). Increasing glow intensity. |

   ### Modals

   | Modal | Contents |
   |-------|----------|
   | **Main Config** | 3-slide carousel: Settings+L1-6, L7-12, System Actions. |
   | **Visual Studio** | Position, scale, opacity, brightness, accent color, dock BG color. |
   | **API Reactor** | API key, endpoint, model selection for AI optimization. |

   ---

   ## Configuration Reference

   ### Visual Settings (Per-Provider)

   | Setting | Type | Description | Default |
   |---------|------|-------------|---------|
   | `dockX` | Number | Horizontal position (px from left). | 310 |
   | `dockY` | Number | Vertical position (px from bottom). | 10 |
   | `uiScale` | String | UI scale factor (0.5-2.0). | "1.0" |
   | `uiOpacity` | String | Background opacity (0.1-1.0). | "0.90" |
   | `uiBrightness` | String | Brightness filter (0.5-2.0). | "1.0" |
   | `uiBaseColor` | Hex | Accent color (orb borders, highlights). | "#00d4ff" |
   | `uiDockBgColor` | Hex | Dock background color. | "#0a0a12" |

   ### Provider-Specific Defaults

   | Provider | Scale | Opacity | Brightness |
   |----------|-------|---------|------------|
   | Claude | 0.5 | 0.45 | 1.45 |
   | ChatGPT/OpenAI | 0.6 | 0.8 | 1.0 |
   | Others | 1.0 | 0.9 | 1.0 |

   ### Profile Settings

   | Setting | Type | Description |
   |---------|------|-------------|
   | `activeCouncil` | String | Currently active council pattern (or empty). |
   | `activeMatrix` | String | Active prompt matrix theory ("cognitron"). |
   | `loggingLevel` | String | `silent` \| `normal` \| `verbose`. Default: `verbose`. |
   | `extractThinking` | Boolean | Include AI reasoning in exports. |
   | `customAgents` | Number | Override default agent count (0 = use scaling). |
   | `customRounds` | Number | Override default round count (0 = use scaling). |

   ### Layer Overrides (L0-L12)

   Each layer has customizable prefix/suffix:

   | Key | Example |
   |-----|---------|
   | `L0_Prefix` | "" (empty for pass-through) |
   | `L0_Suffix` | "" |
   | `L1_Prefix` | "[MODE: GROUNDED_DELIBERATION]..." |
   | `L1_Suffix` | "[MANDATE: VALIDATE ALL CLAIMS!!!]..." |
   | ... | ... |
   | `L12_Prefix` | "[MODE: OMEGA_SINGULARITY]..." |
   | `L12_Suffix` | "[MANDATE: BE PERFECT!!!]..." |

   ---

   ## Interactions Summary

   ### Question: Do I need both Level AND Council?

   **No.** They are independent but additive:

   | Configuration | Result |
   |---------------|--------|
   | Level only (no council) | Level's Prefix/Suffix injected. |
   | Council only (L0) | Not possible. Council selection auto-moves to L1. |
   | Level + Council | Council Prefix + Level Prefix + Prompt + Level Suffix. |

   ### Question: How do preset buttons work?

   Preset buttons (Socratic, Council, CEO) **toggle** the `activeCouncil` setting:
   - Click once → Activates that council.
   - Click again → Deactivates (council = "").
   - They do NOT change the level.

   ### Question: What does L0 reset?

   Selecting L0:
   - Sets `activeCouncil` to "" (no council).
   - Disables grounding (no websearch triggers).
   - Results in raw prompt sent to LLM with zero injection.

   ---

   ## Keyboard Shortcuts

   | Shortcut | Action |
   |----------|--------|
   | `Alt+1` through `Alt+0` | Set level 1-10 |
   | `Alt+-` | Set level 11 |
   | `Alt+=` | Set level 12 |

   ## Fallback Mode

   If prompt injection fails for any reason, the system automatically falls back to sending the raw prompt. You'll see a toast: `⚠️ Injection failed - sending raw`. This prevents the script from ever blocking your workflow.

   ---

   ## Version History

   | Version | Changes |
   |---------|---------|
   | 17.1 | 12-level prompt redesign (concise behavioral directives), council toggle (ON/OFF), grounding slider, L1=8-agent council with grounding, strategic repetition, safety-compatible L12 wording. |
   | 16.4 | Consolidated logging (silent/normal/verbose dropdown), modal footer pinned, L0 click handler fix. |
   | 16.3 | Modal flexbox layout, pinned header/footer. |
   | 16.2 | L0 orb click handler fix (loop 0-12). |
   | 16.1 | Fetch interceptor early bypass for Gemini compatibility. |
   | 16.0 | 0-12 level system, L0 pass-through, L1 grounded deliberation, 13 UI orbs, CSP hardening, tail-loaded prompts. |
   | 15.4 | Multi-provider support (DeepSeek, Grok, GLM, Kimi, Doubao). |
   | 15.3 | Carousel config modal, copy full conversation, halo mode. |
   | 15.2 | Visual Studio modal, per-provider settings. |
   | 15.1 | Council patterns, MCTS, deep reasoning. |

   ---

   ## License

   MIT License. See source file header for details.
