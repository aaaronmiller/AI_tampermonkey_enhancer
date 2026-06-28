// ==UserScript==
// @name         Cognitive Escalation Toolbar v20.0
// @namespace    http://tampermonkey.net/
// @version      20.0
// @description  5-slot cognitive escalation with site-specific system prompts
// @author       Ice-ninja
// @match        *://gemini.google.com/*
// @match        *://chatgpt.com/*
// @match        *://chat.openai.com/*
// @match        *://claude.ai/*
// @match        *://www.perplexity.ai/*
// @match        *://chat.deepseek.com/*
// @match        *://grok.x.ai/*
// @match        *://yiyan.baidu.com/*
// @match        *://tongyi.aliyun.com/*
// @match        *://qianwen.aliyun.com/*
// @match        *://tongyi.damo-model.com/*
// @match        *://kimi.moonshot.cn/*
// @match        *://chat.zhipuai.cn/*
// @match        *://chatglm.cn/*
// @match        *://www.doubao.com/*
// @match        *://chat.doubao.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const V = "20.0", SP = "cet_";
    let lvl = GM_getValue(SP + "lvl", 0), cfg = GM_getValue(SP + "cfg", null) || {};
    
    // Get omit setting for slot
    const getOmit = (i) => cfg[`S${i}_omit`] || false;

    // === TRUSTED TYPES ===
    let pol = null;
    try { pol = window.trustedTypes?.createPolicy?.('cet', { createHTML: s => s }) || { createHTML: s => s }; } catch (e) { pol = { createHTML: s => s }; }
    const sH = (el, s) => { try { el.innerHTML = pol.createHTML(s); } catch (e) { el.textContent = s; } };

    // === PROVIDER DETECTION ===
    const PROV = {
        // Western Providers
        'gemini.google.com': {
            name: 'Gemini', region: 'western',
            inputSel: 'div[contenteditable="true"],.ql-editor',
            submitSel: 'button[aria-label*="Send"],button[data-test-id="send-button"],.send-button',
            getContent: el => el.innerText || el.textContent,
            setContent: (el, txt) => { el.innerText = txt; el.dispatchEvent(new Event('input', { bubbles: true })); }
        },
        'claude.ai': {
            name: 'Claude', region: 'western',
            inputSel: 'div.ProseMirror[contenteditable="true"]',
            submitSel: 'button[aria-label="Send Message"],button[type="submit"]',
            getContent: el => el.innerText || el.textContent,
            setContent: (el, txt) => {
                const safeHTML = txt.split('\n').map(line => `<p>${line}</p>`).join('');
                sH(el, safeHTML);
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        },
        'chatgpt.com': {
            name: 'ChatGPT', region: 'western',
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
            name: 'ChatGPT', region: 'western',
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
            name: 'Perplexity', region: 'western',
            inputSel: 'textarea[placeholder*="Ask"],textarea[placeholder*="Search"],div[contenteditable="true"],textarea[id*="input"],textarea[class*="input"],div[class*="input"],[data-testid*="input"],textarea',
            submitSel: 'button[aria-label="Submit"],button[type="submit"],button[data-testid*="submit"],button[class*="send"],button[class*="submit"],button[title*="Send"],button:has(> svg)',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('keyup', { bubbles: true }));
                const reactHandler = Object.keys(el).find(k => k.startsWith('__reactEventHandlers'));
                if (reactHandler) {
                    const handlers = el[reactHandler];
                    if (handlers && handlers.onChange) { handlers.onChange({ target: el, currentTarget: el, bubbles: true }); }
                }
            }
        },
        'chat.deepseek.com': {
            name: 'DeepSeek', region: 'western',
            inputSel: 'textarea[placeholder*="Send"],textarea[placeholder*="Message"],#chat-input,textarea[class*="input"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[class*="send"],button[type="submit"],button[aria-label*="Send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('keyup', { bubbles: true }));
            }
        },
        'grok.x.ai': {
            name: 'Grok', region: 'western',
            inputSel: 'textarea[data-testid="composer"],textarea[placeholder*="Message"],textarea[class*="input"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[aria-label*="Send"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        // Chinese Providers
        'yiyan.baidu.com': {
            name: 'Ernie Bot', region: 'chinese',
            inputSel: 'textarea[placeholder],textarea#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'tongyi.aliyun.com': {
            name: 'Qwen', region: 'chinese',
            inputSel: 'textarea[placeholder],textarea#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'qianwen.aliyun.com': {
            name: 'Qwen', region: 'chinese',
            inputSel: 'textarea[placeholder],textarea#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'kimi.moonshot.cn': {
            name: 'Kimi', region: 'chinese',
            inputSel: 'textarea.chat-input,textarea[placeholder],#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'chat.zhipuai.cn': {
            name: 'ZhiPuAI', region: 'chinese',
            inputSel: 'textarea[placeholder],textarea#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'chatglm.cn': {
            name: 'ChatGLM', region: 'chinese',
            inputSel: 'textarea[placeholder],textarea#chat-input,textarea[class*="input"],div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'www.doubao.com': {
            name: 'Doubao', region: 'chinese',
            inputSel: 'textarea[class*="input"],textarea[placeholder],#chat-input,div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        },
        'chat.doubao.com': {
            name: 'Doubao', region: 'chinese',
            inputSel: 'textarea[class*="input"],textarea[placeholder],#chat-input,div[contenteditable="true"],textarea:not([disabled]):not([readonly])',
            submitSel: 'button[type="submit"],button[class*="send"],button:not([disabled])',
            getContent: el => {
                if (!el) return '';
                if (el.tagName === 'TEXTAREA') return el.value;
                if (el.contentEditable === 'true') return el.innerText || el.textContent;
                return el.value || el.innerText || el.textContent || '';
            },
            setContent: (el, txt) => {
                if (!el) return;
                if (el.tagName === 'TEXTAREA') { el.value = txt; }
                else if (el.contentEditable === 'true' || el.isContentEditable) { el.innerText = txt; el.textContent = txt; }
                else { el.value = txt; el.innerText = txt; }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    };
    const prov = PROV[location.hostname] || PROV['gemini.google.com'];

    // === 5 CUSTOMIZABLE SLOTS ===
    // Each slot can be configured with custom pre/suf prompts
    const S = {
        1: {
            n: cfg.S1_name || "Slot 1",
            pre: cfg.S1_pre || `<instruction name="slot1">
[Configure this slot in settings]
</instruction>`,
            suf: cfg.S1_suf || `<verify name="slot1">
[Configure verification in settings]
</verify>`
        },
        2: {
            n: cfg.S2_name || "Slot 2",
            pre: cfg.S2_pre || `<instruction name="slot2">
[Configure this slot in settings]
</instruction>`,
            suf: cfg.S2_suf || `<verify name="slot2">
[Configure verification in settings]
</verify>`
        },
        3: {
            n: cfg.S3_name || "Slot 3",
            pre: cfg.S3_pre || `<instruction name="slot3">
[Configure this slot in settings]
</instruction>`,
            suf: cfg.S3_suf || `<verify name="slot3">
[Configure verification in settings]
</verify>`
        },
        4: {
            n: cfg.S4_name || "Slot 4",
            pre: cfg.S4_pre || `<instruction name="slot4">
[Configure this slot in settings]
</instruction>`,
            suf: cfg.S4_suf || `<verify name="slot4">
[Configure verification in settings]
</verify>`
        },
        5: {
            n: cfg.S5_name || "Slot 5",
            pre: cfg.S5_pre || `<instruction name="slot5">
[Configure this slot in settings]
</instruction>`,
            suf: cfg.S5_suf || `<verify name="slot5">
[Configure verification in settings]
</verify>`
        }
    };

    // === STATE ===
    let injectionPending = false;
    let isSubmitting = false;

    // Session tracking for custom system prompts
    const SESSION_KEY = `cet_session_${location.hostname}`;
    let sessionInjected = sessionStorage.getItem(SESSION_KEY) === 'true';

    const showStatus = () => cfg.showStatus !== false;

    // === HELPERS ===
    const hexToRgb = (hex) => {
        const h = (hex || '#000').replace('#', '');
        return [parseInt(h.substring(0, 2), 16) || 0, parseInt(h.substring(2, 4), 16) || 0, parseInt(h.substring(4, 6), 16) || 0];
    };

    // Get system prompt for current provider
    // Site-specific + Universal are COMBINED (site-specific first, then universal)
    const getSystemPrompt = () => {
        if (sessionInjected) return null;

        const sysPrompts = cfg.systemPrompts || {};
        const providerKey = location.hostname;

        const parts = [];

        // Site-specific prompt FIRST (if exists)
        if (sysPrompts[providerKey] && sysPrompts[providerKey].trim().length > 0) {
            parts.push(sysPrompts[providerKey].trim());
        }

        // Universal prompt SECOND (if exists)
        if (sysPrompts['_universal'] && sysPrompts['_universal'].trim().length > 0) {
            parts.push(sysPrompts['_universal'].trim());
        }

        if (parts.length === 0) return null;
        return parts.join('\n\n');
    };

    const markSessionInjected = () => {
        sessionInjected = true;
        sessionStorage.setItem(SESSION_KEY, 'true');
    };

    // === PROMPT WRAPPER ===
    const wrap = (txt) => {
        let pre = '';
        let suf = '';

        // Check for system prompt (only on first message of session)
        const systemPrompt = getSystemPrompt();
        const hasSystemPrompt = systemPrompt !== null;

        // If level is 0, check for system prompt only
        if (lvl === 0) {
            if (hasSystemPrompt) {
                return systemPrompt + '\n\n' + txt;
            }
            return txt;
        }

        // Collect active (non-omitted) slots
        const activeSlots = [];
        const omittedSlots = [];
        for (let i = 1; i <= lvl; i++) {
            if (getOmit(i)) omittedSlots.push(i);
            else activeSlots.push(i);
        }

        // Build prefix with clean XML structure
        pre += `<cognitive_escalation level="${lvl}" active="${activeSlots.join(',')}"${omittedSlots.length ? ` omitted="${omittedSlots.join(',')}"` : ''}>\n\n`;

        // Add system prompt FIRST (before slot prompts)
        if (hasSystemPrompt) {
            pre += `<system_prompt>\n${systemPrompt}\n</system_prompt>\n\n`;
        }

        for (let i = lvl; i >= 1; i--) {
            if (S[i] && !getOmit(i)) pre += S[i].pre + '\n\n';
        }

        pre += `<user_request>\n\n`;

        // Build suffix
        suf = `\n\n</user_request>\n\n<validation>\n\n`;

        for (let i = 1; i <= lvl; i++) {
            if (S[i] && !getOmit(i)) suf += S[i].suf + '\n\n';
        }

        suf += `</validation>\n</cognitive_escalation>`;

        return pre + txt + suf;
    };

    // === CSS ===
    const CSS = `
:root{--c:#00d4ff;--bg:#0a0a12;--t:#8899ac;--g:rgba(255,255,255,0.08)}
#cet-dock{position:fixed;display:flex;align-items:center;gap:10px;z-index:2147483647;background:rgba(10,10,18,0.92);backdrop-filter:blur(20px);border:1px solid rgba(0,212,255,0.2);padding:6px 14px;border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font:12px system-ui,sans-serif;color:#fff;transform-origin:center center}
.cet-orbs{display:flex;gap:6px;padding:4px 10px;background:rgba(0,0,0,0.3);border-radius:999px;border:1px solid var(--g)}
.cet-orb{width:12px;height:12px;border-radius:50%;background:#333;border:1.5px solid rgba(0,212,255,0.4);cursor:pointer;transition:all 0.2s}
.cet-orb:hover{transform:scale(1.4);background:var(--c,#00d4ff)}
.cet-orb.on{transform:scale(1.3);border-color:transparent}
${[0, 1, 2, 3, 4, 5].map(i => {
    const cols = ['#3d3d3d', '#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
    return `.cet-orb[data-l="${i}"].on{background:${cols[i]};box-shadow:0 0 ${8 + i * 2}px ${cols[i]}}`;
}).join('\n')}
.cet-sep{width:1px;height:20px;background:var(--g);margin:0 4px}
.cet-btn{background:transparent;border:1px solid transparent;color:var(--t);width:28px;height:28px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;font-size:14px}
.cet-btn:hover{background:rgba(255,255,255,0.1);color:#fff}
.cet-btn.on{background:linear-gradient(135deg,rgba(0,212,255,0.2),rgba(0,212,255,0.4));border-color:rgba(0,212,255,0.5);color:#fff}
#cet-toast{position:fixed;top:30px;left:50%;transform:translateX(-50%) translateY(-20px);background:rgba(15,15,20,0.95);border:1px solid var(--g);color:#fff;padding:8px 20px;border-radius:99px;z-index:2147483648;opacity:0;transition:all 0.3s;font:12px system-ui}
#cet-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
#cet-pi{position:fixed;right:16px;bottom:16px;width:32px;height:32px;background:rgba(30,30,45,0.9);border:1px solid rgba(255,255,255,0.2);border-radius:50%;color:#fff;font:16px monospace;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2147483646;transition:all 0.2s}
#cet-pi:hover{background:rgba(50,50,70,1);transform:scale(1.1)}
.cet-modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.95);background:linear-gradient(135deg,#121216,#080810);border:1px solid var(--g);border-radius:16px;z-index:2147483647;display:none;opacity:0;transition:all 0.25s;flex-direction:column;overflow:hidden;max-height:90vh}
.cet-modal.show{display:flex;opacity:1;transform:translate(-50%,-50%) scale(1)}
.cet-mh{padding:16px 24px;border-bottom:1px solid var(--g);display:flex;justify-content:space-between;align-items:center}
.cet-mh h3{margin:0;font-size:16px;display:flex;align-items:center;gap:8px}
.cet-mb{padding:20px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column}
.cet-mf{padding:14px 24px;border-top:1px solid var(--g);display:flex;justify-content:space-between;gap:10px;background:rgba(0,0,0,0.2)}
.cet-mbtn{padding:8px 16px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid transparent;transition:all 0.2s}
.cet-mbtn.pri{background:var(--c,#00d4ff);color:#000}
.cet-mbtn.sec{background:transparent;color:var(--t);border-color:var(--g)}
.cet-mbtn:hover{filter:brightness(1.2)}
.cet-ta{width:100%;background:rgba(20,20,25,0.6);border:1px solid var(--g);border-radius:6px;color:#fff;padding:10px;font:11px/1.5 monospace;resize:none}
.cet-ta:focus{border-color:var(--c,#00d4ff);outline:none}
.cet-lbl{font-size:10px;color:var(--t);text-transform:uppercase;margin-bottom:4px}
.cet-carousel{position:relative;flex:1;overflow:hidden}
.cet-carousel-track{display:flex;transition:transform 0.3s ease;height:100%}
.cet-carousel-slide{min-width:100%;padding:0 4px;display:flex;flex-direction:column;gap:8px}
.cet-carousel-nav{display:flex;justify-content:center;gap:6px;padding:8px 0}
.cet-carousel-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.2);border:none;cursor:pointer;transition:all 0.2s}
.cet-carousel-dot:hover{background:rgba(255,255,255,0.4)}
.cet-carousel-dot.active{background:var(--c,#00d4ff);transform:scale(1.2)}
.cet-slot-header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(0,0,0,0.3);border-radius:8px}
.cet-slot-num{font-size:20px;font-weight:bold;color:var(--c,#00d4ff)}
.cet-arrow{position:absolute;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.6);border:1px solid var(--g);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;transition:all 0.2s;font-size:12px}
.cet-arrow:hover{background:var(--c,#00d4ff);color:#000}
.cet-arrow.prev{left:4px}
.cet-arrow.next{right:4px}
.cet-status{position:fixed;bottom:60px;right:16px;background:rgba(0,0,0,0.8);border:1px solid var(--g);border-radius:8px;padding:8px 12px;font-size:10px;color:var(--t);z-index:2147483646;max-width:200px}
.cet-status.active{border-color:var(--c,#00d4ff);color:#fff}
.cet-provider-list{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.cet-provider-chip{padding:4px 10px;border-radius:12px;font-size:10px;cursor:pointer;border:1px solid var(--g);background:rgba(0,0,0,0.3);color:var(--t);transition:all 0.2s}
.cet-provider-chip:hover{background:rgba(0,212,255,0.2);border-color:var(--c)}
.cet-provider-chip.active{background:var(--c);color:#000;border-color:var(--c)}
.cet-provider-chip.chinese{border-color:rgba(245,158,11,0.4)}
.cet-provider-chip.chinese.active{background:#f59e0b;border-color:#f59e0b}
.cet-tabs{display:flex;gap:4px;margin-bottom:12px;background:rgba(0,0,0,0.3);padding:4px;border-radius:8px}
.cet-tab{padding:6px 12px;border-radius:6px;font-size:11px;cursor:pointer;color:var(--t);transition:all 0.2s}
.cet-tab:hover{background:rgba(255,255,255,0.1)}
.cet-tab.active{background:var(--c);color:#000}
`;

    // === INPUT INJECTION ===
    const injectPrompt = (retryCount = 0) => {
        if (lvl === 0) return;

        let inputEl = document.querySelector(prov.inputSel);

        if (!inputEl && retryCount < 3) {
            setTimeout(() => {
                console.log(`[CET] Retrying input detection (${retryCount + 1}/3)...`);
                injectPrompt(retryCount + 1);
            }, 500 * (retryCount + 1));
            return;
        }

        if (!inputEl) {
            console.log('[CET] Input element not found after retries:', prov.inputSel);
            return;
        }

        const originalText = prov.getContent(inputEl).trim();
        if (!originalText || injectionPending) return;

        injectionPending = true;
        const wrappedText = wrap(originalText);

        console.log('[CET] Injecting prompt:', {
            originalLength: originalText.length,
            wrappedLength: wrappedText.length,
            provider: prov.name,
            level: lvl
        });

        prov.setContent(inputEl, wrappedText);

        if (getSystemPrompt() !== null) {
            markSessionInjected();
            console.log('[CET] System prompt injected, session marked as used');
        }

        let msg = `S${lvl}`;
        if (getSystemPrompt() !== null) {
            msg += ' + System';
        }

        toast(msg);
        injectionPending = false;
    };

    // === TOAST ===
    const toast = (msg) => {
        const t = document.getElementById('cet-toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
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

        // 5 slots + 0 (pass-through)
        let h = `<div class="cet-orbs">`;
        for (let i = 0; i <= 5; i++) h += `<div class="cet-orb${i === lvl ? ' on' : ''}" data-l="${i}" title="S${i}${i > 0 ? ': ' + S[i].n : ': Pass-through'}"></div>`;
        h += `</div><span id="cet-lvl" style="font-size:10px;color:var(--t);margin:0 4px;min-width:30px">[S${lvl}]</span><div class="cet-sep"></div>`;

        // System prompt toggle
        const hasSystem = cfg.systemPrompts && (cfg.systemPrompts[location.hostname] || cfg.systemPrompts['_universal']);
        h += `<button id="cet-sys" class="cet-btn${hasSystem ? ' on' : ''}" title="Toggle System Prompt" style="font-size:12px">🎯</button>`;

        h += `<div class="cet-sep"></div>`;
        h += `<button id="cet-copy" class="cet-btn" title="Copy">📋</button>`;
        h += `<button id="cet-export" class="cet-btn" title="Export">📤</button>`;

        sH(dock, h);
        document.body.appendChild(dock);

        // Pi, Toast
        const pi = document.createElement('div'); pi.id = 'cet-pi'; pi.textContent = 'π'; document.body.appendChild(pi);
        const toastEl = document.createElement('div'); toastEl.id = 'cet-toast'; document.body.appendChild(toastEl);

        // Smart Pi Indicator
        const smartPi = () => {
            const isActive = lvl > 0;
            const hasSystem = cfg.systemPrompts && (cfg.systemPrompts[location.hostname] || cfg.systemPrompts['_universal']);
            const isReady = hasSystem && !sessionInjected;

            const piEl = document.getElementById('cet-pi');
            if (piEl) {
                if ({}
                isActive) {
                    piEl.style.boxShadow = `0 0 ${8 + lvl * 2}px var(--c)`;
                    piEl.style.border = `1px solid var(--c)`;
                } else if (isReady) {
                    piEl.style.boxShadow = `0 0 12px #f59e0b`;
                    piEl.style.border = `1px solid #f59e0b`;
                    piEl.style.background = `rgba(245, 158, 11, 0.3)`;
                } else {
                    piEl.style.boxShadow = '';
                    piEl.style.border = '1px solid rgba(255,255,255,0.2)';
                    piEl.style.background = 'rgba(30,30,45,0.9)';
                }
            }
        };

        // Status indicator
        const status = document.createElement('div');
        status.id = 'cet-status';
        status.className = 'cet-status';
        status.style.display = showStatus() ? 'block' : 'none';
        updateStatus(status);
        document.body.appendChild(status);

        smartPi();
        buildModals();
        bindEvents();
        interceptSubmit();
    };

    const updateStatus = (el) => {
        el = el || document.getElementById('cet-status');
        if (!el) return;
        const isActive = lvl > 0;
        el.className = 'cet-status' + (isActive ? ' active' : '');

        let txt = `${prov.name} | S${lvl}`;
        
        const sysPrompts = cfg.systemPrompts || {};
        const hasSystem = sysPrompts[location.hostname] || sysPrompts['_universal'];
        if (hasSystem) {
            if (sessionInjected) {
                txt += ` | System: used`;
            } else {
                txt += ` | System: READY`;
            }
        }

        el.textContent = txt;
    };

    // === MODALS ===
    const buildModals = () => {
        // Main config modal
        const m = document.createElement('div');
        m.id = 'cet-modal';
        m.className = 'cet-modal';
        m.style.width = '600px';

        let h = `<div class="cet-mh"><h3>⚙️ CET v${V} Config</h3><span class="badge">${prov.name}</span></div>`;
        h += `<div class="cet-mb">`;
        
        // Tabs
        h += `<div class="cet-tabs">`;
        h += `<div class="cet-tab active" data-tab="slots">📦 Slots</div>`;
        h += `<div class="cet-tab" data-tab="system">🎯 System Prompts</div>`;
        h += `<div class="cet-tab" data-tab="display">🎨 Display</div>`;
        h += `</div>`;
        
        // Slots tab content
        h += `<div id="tab-slots" class="cet-tab-content">`;
        h += `<div class="cet-carousel">`;
        h += `<button class="cet-arrow prev" id="car-prev">◀</button>`;
        h += `<button class="cet-arrow next" id="car-next">▶</button>`;
        h += `<div class="cet-carousel-track" id="car-track">`;

        for (let i = 1; i <= 5; i++) {
            const isOmitted = getOmit(i);
            h += `<div class="cet-carousel-slide" data-slide="${i}">`;
            h += `<div class="cet-slot-header">`;
            h += `<div><span class="cet-slot-num" style="color:${isOmitted ? '#666' : 'var(--c)'}">S${i}</span></div>`;
            h += `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:11px">`;
            h += `<input type="checkbox" id="omit-${i}"${isOmitted ? ' checked' : ''} style="accent-color:var(--c)">`;
            h += `<span style="color:var(--t)">Omit from stack</span></label>`;
            h += `</div>`;
            h += `<div class="cet-lbl">Name</div>`;
            h += `<input id="name-${i}" class="cet-ta" style="height:28px;margin-bottom:8px" value="${S[i].n}" placeholder="Slot name">`;
            h += `<div class="cet-lbl">Prefix (before user prompt)</div>`;
            h += `<textarea id="pre-${i}" class="cet-ta" style="height:80px;margin-bottom:8px">${S[i].pre}</textarea>`;
            h += `<div class="cet-lbl">Suffix (validation after prompt)</div>`;
            h += `<textarea id="suf-${i}" class="cet-ta" style="height:60px">${S[i].suf}</textarea>`;
            h += `</div>`;
        }

        h += `</div>`;
        h += `<div class="cet-carousel-nav" id="car-nav">`;
        for (let i = 1; i <= 5; i++) h += `<button class="cet-carousel-dot${i === 1 ? ' active' : ''}" data-slide="${i}" title="S${i}: ${S[i].n}"></button>`;
        h += `</div></div></div>`;
        
        // System Prompts tab content
        h += `<div id="tab-system" class="cet-tab-content" style="display:none">`;
        h += `<div style="font-size:11px;color:var(--t);margin-bottom:12px;line-height:1.4">`;
        h += `<strong>Combination Order:</strong> Site-specific prompt → Universal prompt<br>`;
        h += `Both are combined on the first message of each session. Site-specific comes first, then universal.`;
        h += `</div>`;
        
        // Universal prompt (shown first in UI, but injected SECOND)
        h += `<div style="margin-bottom:12px;padding:10px;background:rgba(0,212,255,0.1);border-radius:8px;border:1px solid rgba(0,212,255,0.3)">`;
        h += `<div class="cet-lbl">🌐 Universal Prompt (injected SECOND)</div>`;
        h += `<div style="font-size:9px;color:var(--t);margin-bottom:4px">Applied to ALL sites after site-specific prompt</div>`;
        const uniVal = (cfg.systemPrompts && cfg.systemPrompts['_universal']) || '';
        h += `<textarea id="sys-universal" class="cet-ta" style="height:60px" placeholder="Universal system prompt for all providers...">${uniVal}</textarea>`;
        h += `</div>`;
        
        // Provider list
        h += `<div class="cet-lbl" style="margin-top:16px">Site-Specific Prompts</div>`;
        h += `<div class="cet-provider-list">`;
        
        // Western providers
        const westernProviders = [
            { key: 'gemini.google.com', name: 'Gemini' },
            { key: 'claude.ai', name: 'Claude' },
            { key: 'chatgpt.com', name: 'ChatGPT' },
            { key: 'www.perplexity.ai', name: 'Perplexity' },
            { key: 'chat.deepseek.com', name: 'DeepSeek' },
            { key: 'grok.x.ai', name: 'Grok' }
        ];
        
        // Chinese providers
        const chineseProviders = [
            { key: 'yiyan.baidu.com', name: 'Ernie Bot' },
            { key: 'tongyi.aliyun.com', name: 'Qwen' },
            { key: 'kimi.moonshot.cn', name: 'Kimi' },
            { key: 'chat.zhipuai.cn', name: 'ZhiPuAI' },
            { key: 'chatglm.cn', name: 'ChatGLM' },
            { key: 'www.doubao.com', name: 'Doubao' }
        ];
        
        h += `<div style="width:100%;font-size:10px;color:var(--t);margin-bottom:4px">Western:</div>`;
        westernProviders.forEach(p => {
            const isActive = location.hostname === p.key;
            h += `<div class="cet-provider-chip${isActive ? ' active' : ''}" data-provider="${p.key}">${p.name}</div>`;
        });
        
        h += `<div style="width:100%;font-size:10px;color:var(--t);margin:8px 0 4px">Chinese:</div>`;
        chineseProviders.forEach(p => {
            const isActive = location.hostname === p.key;
            h += `<div class="cet-provider-chip chinese${isActive ? ' active' : ''}" data-provider="${p.key}">${p.name}</div>`;
        });
        
        h += `</div>`;
        
        // Selected provider textarea
        h += `<div id="sys-provider-edit" style="margin-top:12px">`;
        h += `<div class="cet-lbl">Prompt for <span id="sys-provider-name">${prov.name}</span></div>`;
        const sysPrompts = cfg.systemPrompts || {};
        const currentVal = sysPrompts[location.hostname] || '';
        h += `<textarea id="sys-provider-text" class="cet-ta" style="height:80px" placeholder="Site-specific system prompt...">${currentVal}</textarea>`;
        h += `</div>`;
        
        // Add custom site
        h += `<div style="margin-top:16px;padding:10px;background:rgba(0,0,0,0.2);border-radius:8px">`;
        h += `<div class="cet-lbl">➕ Add Custom Site</div>`;
        h += `<div style="display:flex;gap:8px;margin-top:4px">`;
        h += `<input id="custom-site-name" class="cet-ta" style="height:28px;flex:1" placeholder="Site name (e.g., MyAI)">`;
        h += `<input id="custom-site-host" class="cet-ta" style="height:28px;flex:1" placeholder="Hostname (e.g., myai.com)">`;
        h += `<button id="add-custom-site" class="cet-mbtn pri" style="padding:4px 12px">Add</button>`;
        h += `</div></div>`;
        
        h += `</div>`;
        
        // Display tab content
        h += `<div id="tab-display" class="cet-tab-content" style="display:none">`;
        const v = cfg.vis || {};
        h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">`;
        h += `<div><div class="cet-lbl">X Position</div><input id="vis-x" class="cet-ta" style="height:28px" value="${v.x || 300}"></div>`;
        h += `<div><div class="cet-lbl">Y Position</div><input id="vis-y" class="cet-ta" style="height:28px" value="${v.y || 10}"></div>`;
        h += `<div><div class="cet-lbl">Scale</div><input id="vis-scale" class="cet-ta" style="height:28px" value="${v.scale || 1}" step="0.1"></div>`;
        h += `<div><div class="cet-lbl">Opacity</div><input id="vis-opacity" class="cet-ta" style="height:28px" value="${v.opacity || 0.92}" step="0.1"></div>`;
        h += `<div><div class="cet-lbl">Accent Color</div><input id="vis-color" type="color" style="height:28px;width:100%" value="${v.color || '#00d4ff'}"></div>`;
        h += `<div><div class="cet-lbl">Background</div><input id="vis-bg" type="color" style="height:28px;width:100%" value="${v.bg || '#0a0a12'}"></div>`;
        h += `</div>`;
        h += `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:12px">`;
        h += `<input type="checkbox" id="show-status"${showStatus() ? ' checked' : ''} style="accent-color:var(--c)">`;
        h += `<span style="font-size:11px;color:var(--t)">Show status indicator</span></label>`;
        h += `</div>`;
        
        h += `</div>`;
        h += `<div class="cet-mf">`;
        h += `<button id="cfg-reset" class="cet-mbtn sec">Reset</button>`;
        h += `<div style="display:flex;gap:8px"><button id="cfg-cancel" class="cet-mbtn sec">Cancel</button><button id="cfg-save" class="cet-mbtn pri">💾 Save</button></div>`;
        h += `</div>`;

        sH(m, h);
        document.body.appendChild(m);
    };

    // === EVENTS ===
    let carSlide = 1;
    let selectedProvider = location.hostname;
    
    const bindEvents = () => {
        const dock = document.getElementById('cet-dock');
        const modal = document.getElementById('cet-modal');

        // Orbs
        dock.querySelectorAll('.cet-orb').forEach(o => {
            o.addEventListener('click', () => {
                lvl = parseInt(o.dataset.l);
                GM_setValue(SP + "lvl", lvl);
                dock.querySelectorAll('.cet-orb').forEach(x => x.classList.toggle('on', parseInt(x.dataset.l) === lvl));
                document.getElementById('cet-lvl').textContent = `[S${lvl}]`;
                updateStatus();
                toast(`S${lvl}: ${lvl === 0 ? 'Pass-through' : S[lvl]?.n || 'Active'}`);
            });
        });

        // System prompt toggle
        document.getElementById('cet-sys').addEventListener('click', () => {
            const sysPrompts = cfg.systemPrompts || {};
            const hasSystem = sysPrompts[location.hostname] || sysPrompts['_universal'];
            if (hasSystem) {
                // Toggle off by clearing
                if (cfg.useUniversalPrompt) {
                    delete cfg.systemPrompts['_universal'];
                } else {
                    delete cfg.systemPrompts[location.hostname];
                }
                GM_setValue(SP + "cfg", cfg);
                document.getElementById('cet-sys').classList.remove('on');
                toast('System prompt disabled');
            } else {
                modal.classList.add('show');
                // Switch to system tab
                document.querySelectorAll('.cet-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('.cet-tab[data-tab="system"]').classList.add('active');
                document.querySelectorAll('.cet-tab-content').forEach(c => c.style.display = 'none');
                document.getElementById('tab-system').style.display = 'block';
            }
            updateStatus();
        });

        document.getElementById('cet-copy').addEventListener('click', copyConvo);
        document.getElementById('cet-export').addEventListener('click', exportMd);
        document.getElementById('cet-pi').addEventListener('click', () => modal.classList.add('show'));

        // Tab switching
        document.querySelectorAll('.cet-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.cet-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.cet-tab-content').forEach(c => c.style.display = 'none');
                document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
            });
        });

        // Provider chip selection
        document.querySelectorAll('.cet-provider-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.cet-provider-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedProvider = chip.dataset.provider;
                document.getElementById('sys-provider-name').textContent = chip.textContent;
                const sysPrompts = cfg.systemPrompts || {};
                document.getElementById('sys-provider-text').value = sysPrompts[selectedProvider] || '';
            });
        });

        // Modal buttons
        document.getElementById('cfg-cancel').addEventListener('click', () => modal.classList.remove('show'));
        document.getElementById('cfg-save').addEventListener('click', saveConfig);
        document.getElementById('cfg-reset').addEventListener('click', () => { if (confirm('Reset all settings?')) { GM_setValue(SP + "cfg", {}); location.reload(); } });

        // Carousel
        const track = document.getElementById('car-track');
        const dots = document.querySelectorAll('.cet-carousel-dot');
        const goTo = (n) => {
            carSlide = Math.max(1, Math.min(5, n));
            track.style.transform = `translateX(-${(carSlide - 1) * 100}%)`;
            dots.forEach(d => d.classList.toggle('active', parseInt(d.dataset.slide) === carSlide));
        };
        document.getElementById('car-prev').addEventListener('click', () => goTo(carSlide - 1));
        document.getElementById('car-next').addEventListener('click', () => goTo(carSlide + 1));
        dots.forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.slide))));

        // Add custom site
        document.getElementById('add-custom-site').addEventListener('click', () => {
            const name = document.getElementById('custom-site-name').value.trim();
            const host = document.getElementById('custom-site-host').value.trim();
            if (name && host) {
                cfg.customSites = cfg.customSites || [];
                cfg.customSites.push({ name, host });
                GM_setValue(SP + "cfg", cfg);
                toast(`Added ${name}`);
                // Add chip
                const list = document.querySelector('.cet-provider-list');
                const chip = document.createElement('div');
                chip.className = 'cet-provider-chip';
                chip.dataset.provider = host;
                chip.textContent = name;
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.cet-provider-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    selectedProvider = host;
                    document.getElementById('sys-provider-name').textContent = name;
                    const sysPrompts = cfg.systemPrompts || {};
                    document.getElementById('sys-provider-text').value = sysPrompts[host] || '';
                });
                list.appendChild(chip);
                document.getElementById('custom-site-name').value = '';
                document.getElementById('custom-site-host').value = '';
            }
        });
    };

    const saveConfig = () => {
        // Save slot configs
        for (let i = 1; i <= 5; i++) {
            cfg[`S${i}_name`] = document.getElementById(`name-${i}`).value;
            cfg[`S${i}_pre`] = document.getElementById(`pre-${i}`).value;
            cfg[`S${i}_suf`] = document.getElementById(`suf-${i}`).value;
            cfg[`S${i}_omit`] = document.getElementById(`omit-${i}`).checked;
        }

        // Save system prompts
        cfg.systemPrompts = cfg.systemPrompts || {};
        cfg.systemPrompts['_universal'] = document.getElementById('sys-universal').value;
        cfg.systemPrompts[selectedProvider] = document.getElementById('sys-provider-text').value;
        cfg.useUniversalPrompt = document.getElementById('use-universal').checked;

        // Save display settings
        cfg.vis = {
            x: parseInt(document.getElementById('vis-x').value) || 300,
            y: parseInt(document.getElementById('vis-y').value) || 10,
            scale: parseFloat(document.getElementById('vis-scale').value) || 1,
            opacity: parseFloat(document.getElementById('vis-opacity').value) || 0.92,
            color: document.getElementById('vis-color').value || '#00d4ff',
            bg: document.getElementById('vis-bg').value || '#0a0a12'
        };
        cfg.showStatus = document.getElementById('show-status').checked;

        GM_setValue(SP + "cfg", cfg);
        document.getElementById('cet-modal').classList.remove('show');
        toast('Config saved');
        location.reload();
    };

    // === SUBMIT INTERCEPTION ===
    const interceptSubmit = () => {
        document.addEventListener('click', (e) => {
            if (isSubmitting || lvl === 0) return;

            let submitBtn = e.target.closest(prov.submitSel);
            
            if (!submitBtn) {
                const submitFallbacks = ['button[type="submit"]', 'button[class*="send"]', 'button[aria-label*="Send"]'];
                for (const sel of submitFallbacks) {
                    submitBtn = e.target.closest(sel);
                    if (submitBtn) break;
                }
            }

            if (submitBtn && lvl > 0) {
                e.preventDefault();
                e.stopPropagation();
                injectPrompt();
                isSubmitting = true;
                setTimeout(() => {
                    submitBtn.click();
                    setTimeout(() => { isSubmitting = false; }, 500);
                }, 100);
            }
        }, true);
    };

    // === COPY/EXPORT ===
    const copyConvo = () => {
        const content = document.body.innerText;
        GM_setClipboard(content);
        toast('Conversation copied');
    };

    const exportMd = () => {
        const content = `# Conversation Export\n\n**Provider:** ${prov.name}\n**Date:** ${new Date().toISOString()}\n\n---\n\n${document.body.innerText}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Exported as Markdown');
    };

    // === INIT ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
