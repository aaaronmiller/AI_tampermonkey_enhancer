// ==UserScript==
// @name         AI Stream Capture
// @namespace    https://streamcapture.dev
// @version      1.0.0
// @description  Records all AI model output as it streams. Preserves thinking/reasoning text even after collapse/removal. 1GB rolling buffer, chunked markdown viewer.
// @author       StreamCapture
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @match        https://chat.mistral.ai/*
// @match        https://www.perplexity.ai/*
// @match        https://copilot.microsoft.com/*
// @match        https://pi.ai/*
// @match        https://chat.deepseek.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* ══════════════════════════════════════════════════
       CONFIGURATION
       ══════════════════════════════════════════════════ */
    const CFG = {
        maxBytes: 1073741824,   // 1 GB rolling buffer
        chunkSize: 307200,      // 300 KB per viewer chunk
        flushMs: 200,           // write dirty messages to DB every 200 ms
        finalizeMs: 5000,       // mark a message "final" after 5 s of silence
        storageCheckMs: 30000,  // prune old records every 30 s
        rescanMs: 5000,         // re-detect chat container every 5 s
        autoRefreshMs: 2000,    // refresh viewer while panel is open
    };

    const DB_NAME = 'ai_stream_cap';
    const DB_VER = 1;
    const STORE = 'msgs';

    /* ══════════════════════════════════════════════════
       INDEXEDDB LAYER
       ══════════════════════════════════════════════════ */
    let db = null;

    function dbOpen() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VER);
            req.onupgradeneeded = (e) => {
                const d = e.target.result;
                if (!d.objectStoreNames.contains(STORE)) {
                    const s = d.createObjectStore(STORE, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    s.createIndex('ts', 'ts');
                    s.createIndex('eid', 'eid');
                }
            };
            req.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    function dbOp(mode, fn) {
        return new Promise((resolve, reject) => {
            if (!db) return reject(new Error('DB not open'));
            const tx = db.transaction(STORE, mode);
            const store = tx.objectStore(STORE);
            const req = fn(store);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    const dbAdd = (rec) => dbOp('readwrite', (s) => s.add(rec));
    const dbPut = (rec) => dbOp('readwrite', (s) => s.put(rec));
    const dbDel = (id) => dbOp('readwrite', (s) => s.delete(id));
    const dbAll = () => dbOp('readonly', (s) => s.getAll());
    const dbClear = () => dbOp('readwrite', (s) => s.clear());
    const dbCount = () => dbOp('readonly', (s) => s.count());

    /* ══════════════════════════════════════════════════
       PER-ELEMENT MESSAGE STATE
       WeakMaps so stale entries are GC'd with the DOM node.
       ══════════════════════════════════════════════════ */
    let eidCounter = 0;
    const eidMap = new WeakMap();     // Element → string id
    const stateMap = new WeakMap();   // Element → state object
    const dirtySet = new Set();       // Elements with unsaved changes
    const trackedSet = new Set();     // All elements we've ever seen

    function getEid(el) {
        if (!eidMap.has(el)) eidMap.set(el, 'm' + ++eidCounter);
        return eidMap.get(el);
    }

    function getState(el) {
        if (!stateMap.has(el)) {
            stateMap.set(el, {
                eid: getEid(el),
                maxText: '',
                lastTs: 0,
                role: guessRole(el),
                dbId: null,
                dirty: false,
                finalized: false,
            });
        }
        return stateMap.get(el);
    }

    function guessRole(el) {
        // ChatGPT
        const attr = el.dataset && el.dataset.messageAuthorRole;
        if (attr) return attr;
        // Walk up for ChatGPT attribute
        const parentAttr =
            el.closest &&
            el.closest('[data-message-author-role]');
        if (parentAttr) return parentAttr.dataset.messageAuthorRole;
        // Claude data-testid
        if (el.matches && el.matches('[data-testid="assistant-message"]'))
            return 'assistant';
        if (el.matches && el.matches('[data-testid="user-message"]'))
            return 'user';
        const claudeA = el.closest && el.closest('[data-testid="assistant-message"]');
        if (claudeA) return 'assistant';
        const claudeU = el.closest && el.closest('[data-testid="user-message"]');
        if (claudeU) return 'user';
        // Generic class heuristics
        const cls = (el.className || '').toString();
        if (cls.includes('assistant') || cls.includes('model'))
            return 'assistant';
        if (cls.includes('user') && !cls.includes('assistant'))
            return 'user';
        // Default: if we're tracking it, it's probably assistant output
        return 'assistant';
    }

    /* ══════════════════════════════════════════════════
       DOM OBSERVATION — find chat container & message blocks
       ══════════════════════════════════════════════════ */
    let container = null;
    let observer = null;

    function findContainer() {
        const h = location.hostname;
        // ChatGPT
        if (h.includes('chatgpt.com') || h.includes('openai.com')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // Claude
        if (h.includes('claude.ai')) {
            const flex =
                document.querySelector(
                    '[class*="flex-1"][class*="min-h-0"]'
                ) ||
                document.querySelector('[class*="flex-1"][class*="overflow"]');
            if (flex) return flex;
        }
        // Gemini
        if (h.includes('gemini.google.com')) {
            const conv = document.querySelector(
                '.conversation-container, .chat-container'
            );
            if (conv) return conv;
        }
        // Perplexity
        if (h.includes('perplexity.ai')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // DeepSeek
        if (h.includes('deepseek.com')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // Mistral
        if (h.includes('mistral.ai')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // Pi / Inflection
        if (h.includes('pi.ai')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // Copilot
        if (h.includes('copilot.microsoft.com')) {
            const main = document.querySelector('main');
            if (main) return main;
        }
        // Generic fallback
        return (
            document.querySelector('main') ||
            document.querySelector('[role="main"]') ||
            document.querySelector('[role="log"]') ||
            document.body
        );
    }

    /**
     * Walk up from `node` to find the nearest "message block" ancestor.
     * Uses site-specific attributes first, then class heuristics.
     */
    function findMsgBlock(node) {
        let el = node.nodeType === 3 ? node.parentElement : node;
        for (let i = 0; i < 25 && el && el !== document.body; i++) {
            // Strong attribute signals
            if (el.matches && el.matches('[data-message-author-role]'))
                return el;
            if (el.matches && el.matches('[data-message-id]')) return el;
            if (
                el.matches &&
                el.matches('[data-testid*="message"]')
            )
                return el;
            if (el.getAttribute && el.getAttribute('role') === 'article')
                return el;
            // Class heuristics — only match if element has real text
            const cls = (el.className || '').toString();
            if (
                (cls.includes('message') ||
                    cls.includes('response') ||
                    cls.includes('turn') ||
                    cls.includes('prose')) &&
                (el.textContent || '').trim().length > 5
            ) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    /* ══════════════════════════════════════════════════
       MUTATION HANDLER
       ══════════════════════════════════════════════════ */
    function onMutations(mutations) {
        for (const m of mutations) {
            // Single character / text node change (streaming token)
            if (m.type === 'characterData') {
                const blk = findMsgBlock(m.target);
                if (blk) ingest(blk);
                continue;
            }
            if (m.type !== 'childList') continue;

            // Nodes added — capture new text
            for (const n of m.addedNodes) {
                if (n.nodeType === 3) {
                    // Text node added directly
                    const blk = findMsgBlock(n);
                    if (blk) ingest(blk);
                } else if (n.nodeType === 1) {
                    // Element added — could BE a message block or contain one
                    const blk = findMsgBlock(n);
                    if (blk) {
                        ingest(blk);
                    } else {
                        // Walk descendants for any text node
                        const walker = document.createTreeWalker(
                            n,
                            NodeFilter.SHOW_TEXT
                        );
                        let tn;
                        while ((tn = walker.nextNode())) {
                            if (tn.textContent.trim()) {
                                const blk2 = findMsgBlock(tn);
                                if (blk2) {
                                    ingest(blk2);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Nodes removed — the parent block's text may have shrunk.
            // We do NOT overwrite maxText; we keep the longer version we already captured.
            if (m.removedNodes.length > 0 && m.target.nodeType === 1) {
                const blk = findMsgBlock(m.target);
                if (blk) {
                    const st = stateMap.get(blk);
                    if (st) st.lastTs = Date.now();
                }
            }
        }
    }

    /**
     * Core capture logic: if the block's textContent is longer than
     * we've ever seen for this element, update maxText and mark dirty.
     */
    function ingest(el) {
        const text = el.textContent || '';
        if (!text.trim()) return;

        const st = getState(el);
        trackedSet.add(el);

        // If text shrank or stayed the same, just bump timestamp
        if (text.length <= st.maxText.length) {
            st.lastTs = Date.now();
            return;
        }

        // Text grew — this is new content (or at least includes new content)
        st.maxText = text;
        st.lastTs = Date.now();
        st.dirty = true;
        st.finalized = false;
        dirtySet.add(el);
    }

    function attachObserver() {
        const newContainer = findContainer();
        if (newContainer === container && observer) return; // no change

        if (observer) observer.disconnect();
        container = newContainer;
        if (!container) return;

        observer = new MutationObserver(onMutations);
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    /* ══════════════════════════════════════════════════
       FLUSH / FINALIZE / STORAGE MANAGEMENT
       ══════════════════════════════════════════════════ */
    async function flushDirty() {
        if (dirtySet.size === 0) return;
        const batch = [...dirtySet];
        dirtySet.clear();
        for (const el of batch) {
            const st = stateMap.get(el);
            if (!st || !st.dirty) continue;
            const rec = {
                eid: st.eid,
                ts: st.lastTs,
                role: st.role,
                text: st.maxText,
                bytes: new Blob([st.maxText]).size,
                final: false,
            };
            try {
                if (st.dbId !== null) {
                    rec.id = st.dbId;
                    await dbPut(rec);
                } else {
                    st.dbId = await dbAdd(rec);
                }
                st.dirty = false;
            } catch (err) {
                // Don't let a DB error break the page
                console.warn('[StreamCapture] flush error:', err);
            }
        }
    }

    async function finalizeStale() {
        const now = Date.now();
        const toFinalize = [];
        for (const el of trackedSet) {
            const st = stateMap.get(el);
            if (!st || st.finalized || !st.maxText) continue;
            if (now - st.lastTs > CFG.finalizeMs) {
                toFinalize.push({ el, st });
            }
        }
        for (const { el, st } of toFinalize) {
            const rec = {
                id: st.dbId,
                eid: st.eid,
                ts: st.lastTs,
                role: st.role,
                text: st.maxText,
                bytes: new Blob([st.maxText]).size,
                final: true,
            };
            try {
                if (st.dbId !== null) {
                    await dbPut(rec);
                } else {
                    st.dbId = await dbAdd(rec);
                }
                st.finalized = true;
                st.dirty = false;
                dirtySet.delete(el);
            } catch (err) {
                console.warn('[StreamCapture] finalize error:', err);
            }
        }
    }

    async function enforceStorageLimit() {
        try {
            const all = await dbAll();
            all.sort((a, b) => a.ts - b.ts);
            let total = all.reduce((s, r) => s + (r.bytes || 0), 0);
            while (total > CFG.maxBytes && all.length > 0) {
                const oldest = all.shift();
                total -= oldest.bytes || 0;
                await dbDel(oldest.id);
            }
        } catch (err) {
            console.warn('[StreamCapture] storage limit error:', err);
        }
    }

    function cleanupTracked() {
        for (const el of trackedSet) {
            if (!el.isConnected) {
                trackedSet.delete(el);
                dirtySet.delete(el);
            }
        }
    }

    /* ══════════════════════════════════════════════════
       STREAM BUILDER — turns DB records into readable markdown
       ══════════════════════════════════════════════════ */
    function buildChunks(records) {
        // Deduplicate: for each element id, keep only the latest record
        const byEid = new Map();
        for (const r of records) {
            const existing = byEid.get(r.eid);
            if (!existing || r.ts >= existing.ts) {
                byEid.set(r.eid, r);
            }
        }
        const sorted = [...byEid.values()].sort((a, b) => a.ts - b.ts);

        // Format each message as a markdown block
        const msgs = sorted.map((r) => {
            const d = new Date(r.ts);
            const ts = d.toLocaleString();
            const role = (r.role || 'unknown').toUpperCase();
            const bar = '\u2500'.repeat(56);
            const tag = r.final ? role : role + ' (streaming)';
            return `\n${bar}\n[${ts}]  ${tag}\n${bar}\n${r.text}`;
        });

        // Split into chunks at message boundaries (~300 KB each)
        const chunks = [];
        let cur = '';
        for (const msg of msgs) {
            if (cur.length + msg.length > CFG.chunkSize && cur.length > 0) {
                chunks.push(cur);
                cur = msg;
            } else {
                cur += msg;
            }
        }
        if (cur) chunks.push(cur);
        return chunks.length ? chunks : [''];
    }

    function buildFullText(records) {
        return buildChunks(records).join('');
    }

    /* ══════════════════════════════════════════════════
       UI — floating indicator + viewer panel
       ══════════════════════════════════════════════════ */
    let panelOpen = false;
    let chunks = [''];
    let chunkIdx = 0;
    let autoRefreshTimer = null;

    function fmtBytes(b) {
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
        return (b / 1073741824).toFixed(2) + ' GB';
    }

    function setupUI() {
        // ── Styles ──
        const style = document.createElement('style');
        style.id = 'sc-styles';
        style.textContent = `
            #sc-dot {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 42px;
                height: 42px;
                border-radius: 50%;
                background: radial-gradient(circle at 40% 38%, #ff4444, #aa0000);
                border: 2px solid #ff6666;
                cursor: grab;
                z-index: 2147483640;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 16px rgba(200,0,0,0.35);
                transition: box-shadow 0.3s;
                user-select: none;
                -webkit-user-select: none;
            }
            #sc-dot:active { cursor: grabbing; }
            #sc-dot.recording {
                animation: sc-glow 1.8s ease-in-out infinite;
            }
            @keyframes sc-glow {
                0%,100% { box-shadow: 0 2px 16px rgba(200,0,0,0.35); }
                50%     { box-shadow: 0 2px 32px rgba(255,30,30,0.7), 0 0 60px rgba(255,0,0,0.2); }
            }
            #sc-dot .sc-icon {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #fff;
                pointer-events: none;
            }
            #sc-dot .sc-rec {
                position: absolute;
                top: -6px;
                right: -4px;
                font-size: 9px;
                font-weight: 800;
                color: #ff4444;
                background: #1a1a1a;
                border: 1px solid #ff4444;
                border-radius: 4px;
                padding: 0 3px;
                line-height: 14px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s;
                font-family: sans-serif;
            }
            #sc-dot.recording .sc-rec { opacity: 1; }

            #sc-panel {
                position: fixed;
                bottom: 76px;
                right: 24px;
                width: 660px;
                max-height: 72vh;
                background: #0d1117;
                border: 1px solid #30363d;
                border-radius: 14px;
                z-index: 2147483639;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                box-shadow: 0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03);
                font-family: 'SF Mono','Fira Code','Cascadia Code','JetBrains Mono',monospace;
                transform: translateY(12px);
                opacity: 0;
                pointer-events: none;
                transition: transform 0.25s cubic-bezier(.4,0,.2,1), opacity 0.2s;
            }
            #sc-panel.open {
                transform: translateY(0);
                opacity: 1;
                pointer-events: auto;
            }
            .sc-hdr {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 18px 10px;
                background: #161b22;
                border-bottom: 1px solid #21262d;
            }
            .sc-hdr-left h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 700;
                color: #e6edf3;
                letter-spacing: 0.02em;
            }
            .sc-hdr-left .sc-sub {
                font-size: 11px;
                color: #7d8590;
                margin-top: 2px;
            }
            .sc-hdr-right {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            .sc-hdr-right button {
                background: #21262d;
                border: 1px solid #30363d;
                color: #8b949e;
                width: 30px;
                height: 30px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                line-height: 1;
            }
            .sc-hdr-right button:hover {
                background: #30363d;
                color: #e6edf3;
            }
            .sc-nav {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 14px;
                padding: 8px 18px;
                background: #0d1117;
                border-bottom: 1px solid #21262d;
            }
            .sc-nav button {
                background: #21262d;
                border: 1px solid #30363d;
                color: #c9d1d9;
                padding: 4px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
                transition: background 0.15s;
            }
            .sc-nav button:hover:not(:disabled) { background: #30363d; }
            .sc-nav button:disabled { opacity: 0.25; cursor: default; }
            .sc-nav .sc-info {
                font-size: 11px;
                color: #7d8590;
                min-width: 160px;
                text-align: center;
            }
            .sc-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px 20px;
                font-size: 12.5px;
                line-height: 1.65;
                color: #c9d1d9;
                white-space: pre-wrap;
                word-break: break-word;
                tab-size: 4;
            }
            .sc-body::-webkit-scrollbar { width: 7px; }
            .sc-body::-webkit-scrollbar-track { background: transparent; }
            .sc-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
            .sc-body::-webkit-scrollbar-thumb:hover { background: #484f58; }
            .sc-foot {
                display: flex;
                gap: 8px;
                padding: 10px 18px 14px;
                background: #161b22;
                border-top: 1px solid #21262d;
            }
            .sc-foot button {
                flex: 1;
                background: #21262d;
                border: 1px solid #30363d;
                color: #c9d1d9;
                padding: 9px 10px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 12px;
                font-family: inherit;
                font-weight: 500;
                transition: all 0.15s;
            }
            .sc-foot button:hover { background: #30363d; color: #e6edf3; }
            .sc-foot button.sc-danger {
                border-color: #5c2121;
                color: #f85149;
            }
            .sc-foot button.sc-danger:hover {
                background: #3d1515;
                border-color: #f85149;
            }
            .sc-empty {
                color: #484f58;
                text-align: center;
                padding: 40px 20px;
                font-size: 13px;
                line-height: 1.7;
            }
        `;
        document.head.appendChild(style);

        // ── Indicator dot ──
        const dot = document.createElement('div');
        dot.id = 'sc-dot';
        dot.title = 'AI Stream Capture  (Ctrl+Shift+S)';
        dot.innerHTML =
            '<div class="sc-icon"></div><span class="sc-rec">REC</span>';
        document.body.appendChild(dot);

        // ── Panel ──
        const panel = document.createElement('div');
        panel.id = 'sc-panel';
        panel.innerHTML = `
            <div class="sc-hdr">
                <div class="sc-hdr-left">
                    <h3>Stream Capture</h3>
                    <div class="sc-sub" id="sc-stats">0 messages &middot; 0 B</div>
                </div>
                <div class="sc-hdr-right">
                    <button id="sc-refresh" title="Refresh">&#x21bb;</button>
                    <button id="sc-close" title="Close">&times;</button>
                </div>
            </div>
            <div class="sc-nav">
                <button id="sc-prev" disabled>&#8592; Prev</button>
                <span class="sc-info" id="sc-chunk-info">No data</span>
                <button id="sc-next" disabled>Next &#8594;</button>
            </div>
            <div class="sc-body" id="sc-body">
                <div class="sc-empty">No captured content yet.<br>Start a conversation and the stream will be recorded here automatically.</div>
            </div>
            <div class="sc-foot">
                <button id="sc-copy">Copy Chunk</button>
                <button id="sc-dl">Download All</button>
                <button id="sc-clear" class="sc-danger">Clear History</button>
            </div>
        `;
        document.body.appendChild(panel);

        // ── Draggable indicator ──
        let dragging = false,
            dx0 = 0,
            dy0 = 0,
            ox = 0,
            oy = 0;
        dot.addEventListener('mousedown', onDragStart);
        dot.addEventListener('touchstart', onDragStart, { passive: false });

        function onDragStart(e) {
            if (e.type === 'touchstart') e.preventDefault();
            const pt = e.touches ? e.touches[0] : e;
            dx0 = pt.clientX;
            dy0 = pt.clientY;
            const r = dot.getBoundingClientRect();
            ox = r.left;
            oy = r.top;
            dragging = false;

            const move = (ev) => {
                const p = ev.touches ? ev.touches[0] : ev;
                const mx = p.clientX - dx0;
                const my = p.clientY - dy0;
                if (!dragging && Math.abs(mx) + Math.abs(my) < 6) return;
                dragging = true;
                dot.style.left = ox + mx + 'px';
                dot.style.top = oy + my + 'px';
                dot.style.right = 'auto';
                dot.style.bottom = 'auto';
                // Move panel with dot
                panel.style.left = dot.style.left;
                panel.style.right = 'auto';
            };
            const up = () => {
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', move);
                document.removeEventListener('touchend', up);
                if (!dragging) togglePanel();
            };
            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', move, { passive: false });
            document.addEventListener('touchend', up);
        }

        // ── Panel toggle ──
        function togglePanel() {
            panelOpen = !panelOpen;
            panel.classList.toggle('open', panelOpen);
            if (panelOpen) {
                refreshViewer();
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }

        document.getElementById('sc-close').addEventListener('click', () => {
            panelOpen = false;
            panel.classList.remove('open');
            stopAutoRefresh();
        });

        document.getElementById('sc-refresh').addEventListener('click', refreshViewer);

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                togglePanel();
            }
        });

        // ── Chunk navigation ──
        document.getElementById('sc-prev').addEventListener('click', () => {
            if (chunkIdx > 0) {
                chunkIdx--;
                renderChunk();
            }
        });
        document.getElementById('sc-next').addEventListener('click', () => {
            if (chunkIdx < chunks.length - 1) {
                chunkIdx++;
                renderChunk();
            }
        });

        // ── Actions ──
        document.getElementById('sc-copy').addEventListener('click', () => {
            const txt = chunks[chunkIdx] || '';
            if (!txt || txt.startsWith('No captured')) return;
            navigator.clipboard.writeText(txt).then(() => {
                const btn = document.getElementById('sc-copy');
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.color = '#3fb950';
                setTimeout(() => {
                    btn.textContent = orig;
                    btn.style.color = '';
                }, 1200);
            });
        });

        document.getElementById('sc-dl').addEventListener('click', async () => {
            const all = await dbAll();
            const text = buildFullText(all);
            if (!text.trim()) return;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const stamp = new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[T:]/g, '-');
            a.download = 'stream-capture-' + stamp + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        document.getElementById('sc-clear').addEventListener('click', async () => {
            // Custom confirm via inline replacement
            const btn = document.getElementById('sc-clear');
            if (btn.dataset.confirming === 'yes') {
                await dbClear();
                eidCounter = 0;
                trackedSet.clear();
                dirtySet.clear();
                chunks = [''];
                chunkIdx = 0;
                renderChunk();
                updateStats();
                btn.textContent = 'Clear History';
                btn.dataset.confirming = '';
                return;
            }
            btn.textContent = 'Click again to confirm';
            btn.dataset.confirming = 'yes';
            setTimeout(() => {
                btn.textContent = 'Clear History';
                btn.dataset.confirming = '';
            }, 3000);
        });

        // ── Recording indicator pulse ──
        setInterval(() => {
            dot.classList.toggle('recording', dirtySet.size > 0);
        }, 400);

        // ── Viewer refresh ──
        async function refreshViewer() {
            try {
                const all = await dbAll();
                chunks = buildChunks(all);
                // Keep chunkIdx in bounds
                if (chunkIdx >= chunks.length) chunkIdx = Math.max(0, chunks.length - 1);
                renderChunk();
                await updateStats();
            } catch (err) {
                console.warn('[StreamCapture] refresh error:', err);
            }
        }

        function renderChunk() {
            const body = document.getElementById('sc-body');
            const info = document.getElementById('sc-chunk-info');
            const prev = document.getElementById('sc-prev');
            const next = document.getElementById('sc-next');

            const txt = chunks[chunkIdx] || '';
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);

            if (!txt.trim() || chunks.length <= 1 && !txt.trim()) {
                body.innerHTML =
                    '<div class="sc-empty">No captured content yet.<br>Start a conversation and the stream will be recorded here automatically.</div>';
                info.textContent = 'No data';
                prev.disabled = true;
                next.disabled = true;
                return;
            }

            body.textContent = txt;
            body.scrollTop = 0;

            if (chunks.length === 1) {
                info.textContent = fmtBytes(totalLen) + ' total';
            } else {
                info.textContent =
                    'Chunk ' +
                    (chunkIdx + 1) +
                    ' / ' +
                    chunks.length +
                    '  \u00B7  ' +
                    fmtBytes(txt.length);
            }
            prev.disabled = chunkIdx === 0;
            next.disabled = chunkIdx >= chunks.length - 1;
        }

        async function updateStats() {
            try {
                const count = await dbCount();
                const all = await dbAll();
                const bytes = all.reduce((s, r) => s + (r.bytes || 0), 0);
                document.getElementById('sc-stats').textContent =
                    count + ' messages \u00B7 ' + fmtBytes(bytes);
            } catch (err) {
                // silent
            }
        }

        function startAutoRefresh() {
            stopAutoRefresh();
            autoRefreshTimer = setInterval(refreshViewer, CFG.autoRefreshMs);
        }
        function stopAutoRefresh() {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
        }
    }

    /* ══════════════════════════════════════════════════
       INIT
       ══════════════════════════════════════════════════ */
    async function init() {
        try {
            await dbOpen();
        } catch (err) {
            console.error('[StreamCapture] Failed to open database:', err);
            return;
        }

        // Attach observer to chat container
        attachObserver();

        // Periodic tasks
        setInterval(attachObserver, CFG.rescanMs);
        setInterval(flushDirty, CFG.flushMs);
        setInterval(finalizeStale, CFG.finalizeMs);
        setInterval(enforceStorageLimit, CFG.storageCheckMs);
        setInterval(cleanupTracked, CFG.storageCheckMs);

        // Build UI
        setupUI();
    }

    // Start when DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Small delay to let the SPA finish its initial render
        setTimeout(init, 500);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    }
})();