Here is the consolidated **Project State & Developer Handoff** based on the transcript and README. You can use this to prime a new session.

***

# 📂 Project State: AI Unshackled (Transcendence v16.4)

## 1. Core Mandates & User Preferences
* **Prompt Architecture:** **"Tail-Loaded"**. Critical commands (`MANDATE`, `CONSTRAINT`, `ACTION`) must appear in the **Suffix** to exploit LLM recency bias. Commands must be "decidedly frontloaded" in importance (i.e., at the end of the context window).
* **Tone:** "No fluff. No preaching. Direct answers." Combat laziness/summarization aggressively.
* **Visuals:**
    * **Dock:** The oval background *must* be visible (colored/tinted), not just the text. (Fixed via Z-index `2147483647` and default opacity bump to `0.8` for OpenAI).
    * **Orbs:** 13 orbs (0-12). L0 is "OFF" (neutral/gray).
    * **Icons:** Use System Emojis (⚙️, 💾) instead of external fonts (Material Icons) to bypass CSP.
* **Levels:** **0-12**.
    * **L0:** Pass-through (Raw prompt, no injection, no grounding).
    * **L1:** **Grounded Deliberation** (Robust default: 3 agents, 2 rounds).
    * **L12:** Transcendent/Omega.
* **Versioning:** Must bump version number with **EVERY** edit. Current: `v16.4`.

## 2. Technical Implementation Details
* **CSP Hardening:** External assets (Google Fonts, Material Icons) are **removed**. Styles use `system-ui` and local fonts.
* **Gemini Compatibility:**
    * **Fetch Interceptor:** Includes an **early bypass** and `try/catch` block. If `__UT_SENTINEL_BUFFER` (user prompt) is empty, the interceptor exits immediately to prevent breaking Gemini's internal status/auth requests (`/batchelor`).
* **Copy Logic:**
    * **Left-Click:** Copies **Full Conversation** (User + AI pairs), not just the last message.
    * **Right-Click:** Toggles "Thinking Mode" (Halo effect) to include/exclude reasoning blocks.
    * **Selectors:** Updated fallback selectors for Claude (`.font-user-message`) and ChatGPT (`data-message-author-role`).
* **Configuration:**
    * **Storage:** `GM_getValue` / `GM_setValue`.
    * **Logging:** Consolidated to `loggingLevel` (`silent`, `normal`, `verbose`). Default: `verbose`.
    * **Modal:** Flexbox layout with **pinned footer** (always visible).

## 3. Current Architecture (v16.4)

### The 13-Level System
| Level | Behavior |
| :--- | :--- |
| **L0** | **Reset/Pass-through.** Clears Council. No Injection. |
| **L1** | **Default.** Embedded "Grounded Deliberation" (Proposer/Critic/Synthesizer). |
| **L2-12** | Cumulative escalation. L3+ inherits L1/L2 mandates in the Suffix. |

### Council Overlay
* **Additive:** Council Pattern + Level = `[Council Prefix] + [Level Prefix] + [Prompt] + [Level Suffix]`.
* **Interaction:** Selecting a council from L0 auto-moves the slider to **L1**.

### Grounding (Websearch)
* **Trigger:** Injected text prompts the LLM to search [BEFORE], [BETWEEN], and [AFTER] rounds.
* **Status:** "Deep Research" (Multi-pass / Full Retrieval) logic is defined in theory but **UI configuration is currently UNIMPLEMENTED**.

## 4. Known Issues & Pending Tasks
* **⚠️ Unimplemented Features:** The "Grounding Level" (# of queries) and "Deep Research" (multipass toggle) settings were requested but **not yet built** into the Config UI.
* **Regression Watch:** Ensure L3+ levels maintain **cumulative inheritance** (L3 must include L1 grounding + L2 reasoning mandates). This was fixed in v16.4 but must be preserved.

## 5. Quick Reference: Config Objects
* **Global Defaults:** `loggingLevel: 'verbose'`, `extractThinking: true`.
* **Provider Defaults:**
    * **Claude:** Scale `0.5`, Opacity `0.45`, Brightness `1.45`.
    * **OpenAI:** Scale `0.6`, Opacity `0.80` (bumped from 0.2 for visibility).

***

**Instruction for Next Session:**
"Resume work on **AI Unshackled v16.4**. The system is stable on all providers (Gemini/Claude/ChatGPT). Immediate priority is to implement the **Grounding & Deep Research Configuration** UI that was deferred."