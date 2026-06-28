// ==UserScript==
// @name         Perplexity DOM Freezer + Obsidian Export
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Prevents DOM virtualization and exports full conversations to markdown for Obsidian
// @author       the relentless Sliither
// @match        https://www.perplexity.ai/*
// @grant        GM_setClipboard
// @grant        GM_download
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURATION =====
    const CONFIG = {
        FREEZE_INTERVAL_MS: 1000,
        FREEZE_DURATION_MS: 60000,
        AUTO_FREEZE_ON_LOAD: true,
        INCLUDE_CITATIONS: true,
        INCLUDE_SOURCES: true,
        CITATION_STYLE: 'inline', // 'inline', 'endnotes', 'none'
    };

    let freezeInterval = null;
    let isFrozen = false;

    // ===== DOM VIRTUALIZATION DISABLER =====
    function disableVirtualization() {
        // Disable scroll event listeners that trigger virtualization
        const disableScrollHandlers = () => {
            const originalAddEventListener = EventTarget.prototype.addEventListener;
            EventTarget.prototype.addEventListener = function(type, listener, options) {
                if (type === 'scroll' && this === window) {
                    console.log('[DOM Freezer] Blocked scroll listener');
                    return;
                }
                return originalAddEventListener.call(this, type, listener, options);
            };
        };

        // Disable intersection observers that manage virtualization
        const disableIntersectionObserver = () => {
            const OriginalIntersectionObserver = window.IntersectionObserver;
            window.IntersectionObserver = class extends OriginalIntersectionObserver {
                constructor(callback, options) {
                    super(() => {}, options);
                    console.log('[DOM Freezer] Blocked IntersectionObserver');
                }
            };
        };

        // Disable ResizeObserver
        const disableResizeObserver = () => {
            window.ResizeObserver = class {
                constructor() {}
                observe() {}
                unobserve() {}
                disconnect() {}
            };
        };

        disableScrollHandlers();
        disableIntersectionObserver();
        disableResizeObserver();
        console.log('[DOM Freezer] Virtualization blockers installed');
    }

    // ===== FORCE ALL ELEMENTS TO RENDER =====
    function forceRenderAll() {
        // Remove display:none, visibility:hidden
        document.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach(el => {
            el.style.display = '';
        });
        document.querySelectorAll('[style*="visibility: hidden"], [style*="visibility:hidden"]').forEach(el => {
            el.style.visibility = '';
        });

        // Remove virtualization classes/attributes
        document.querySelectorAll('[data-virtualized], .virtualized, .virtual-list').forEach(el => {
            el.removeAttribute('data-virtualized');
            el.classList.remove('virtualized', 'virtual-list');
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
        });

        // Force expand all collapsed elements
        document.querySelectorAll('[aria-expanded="false"]').forEach(el => {
            el.setAttribute('aria-expanded', 'true');
            if (typeof el.click === 'function') {
                el.click();
            }
        });

        console.log('[DOM Freezer] Forced all elements to render');
    }

    // ===== CONTINUOUS FREEZE MONITOR =====
    function startFreezeMonitor() {
        if (freezeInterval) return;

        freezeInterval = setInterval(() => {
            if (!isFrozen) return;

            forceRenderAll();

            // Prevent any DOM node removal
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            mutation.target.appendChild(node);
                            console.log('[DOM Freezer] Prevented node removal');
                        }
                    });
                });
            });

            const mainContent = document.querySelector('main, .main, [role="main"]');
            if (mainContent) {
                observer.observe(mainContent, {
                    childList: true,
                    subtree: true
                });
            }
        }, CONFIG.FREEZE_INTERVAL_MS);

        console.log('[DOM Freezer] Freeze monitor started');
    }

    function stopFreezeMonitor() {
        if (freezeInterval) {
            clearInterval(freezeInterval);
            freezeInterval = null;
        }
        console.log('[DOM Freezer] Freeze monitor stopped');
    }

    // ===== MARKDOWN EXPORT =====
    function extractConversation() {
        const messages = [];

        // Try multiple selectors for message containers
        const selectors = [
            '.prose', // Common Perplexity prose container
            '[class*="thread"]',
            '[class*="message"]',
            '[class*="answer"]',
            'article',
        ];

        let messageElements = [];
        for (const selector of selectors) {
            messageElements = Array.from(document.querySelectorAll(selector));
            if (messageElements.length > 0) break;
        }

        if (messageElements.length === 0) {
            console.warn('[Export] No message elements found');
            return { messages: [], title: 'Perplexity Export' };
        }

        messageElements.forEach((el, idx) => {
            const message = {
                role: 'assistant',
                content: '',
                timestamp: null,
                citations: []
            };

            // Detect role (user vs assistant)
            const roleIndicators = el.textContent.toLowerCase();
            if (roleIndicators.includes('you:') || el.querySelector('[class*="user"]')) {
                message.role = 'user';
            }

            // Extract timestamp
            const timeEl = el.querySelector('time');
            if (timeEl) {
                message.timestamp = timeEl.getAttribute('datetime') || timeEl.textContent;
            }

            // Extract main content
            const contentEls = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, pre, code');
            contentEls.forEach(contentEl => {
                let text = contentEl.textContent.trim();

                // Handle citations
                if (CONFIG.INCLUDE_CITATIONS) {
                    const citationLinks = contentEl.querySelectorAll('a[href^="http"]');
                    citationLinks.forEach((link, cidx) => {
                        const citationText = `[${message.citations.length + 1}]`;
                        message.citations.push({
                            index: message.citations.length + 1,
                            url: link.href,
                            text: link.textContent.trim()
                        });
                        text = text.replace(link.textContent, citationText);
                    });
                }

                message.content += text + '\n\n';
            });

            messages.push(message);
        });

        // Extract title
        const titleEl = document.querySelector('h1, [class*="title"]');
        const title = titleEl ? titleEl.textContent.trim() : 'Perplexity Export';

        return { messages, title };
    }

    function generateMarkdown() {
        const { messages, title } = extractConversation();

        let markdown = `---\n`;
        markdown += `title: ${title}\n`;
        markdown += `date: ${new Date().toISOString()}\n`;
        markdown += `source: Perplexity.ai\n`;
        markdown += `tags: [perplexity, export]\n`;
        markdown += `---\n\n`;
        markdown += `# ${title}\n\n`;

        messages.forEach((msg, idx) => {
            const roleLabel = msg.role === 'user' ? '**User**' : '**Assistant**';
            markdown += `## ${roleLabel}`;
            if (msg.timestamp) {
                markdown += ` (${msg.timestamp})`;
            }
            markdown += `\n\n${msg.content}\n\n`;

            // Add citations
            if (CONFIG.CITATION_STYLE === 'endnotes' && msg.citations.length > 0) {
                markdown += `### Sources\n\n`;
                msg.citations.forEach(cite => {
                    markdown += `[${cite.index}]: ${cite.url}\n`;
                });
                markdown += `\n`;
            }

            markdown += `---\n\n`;
        });

        // Add global sources section
        if (CONFIG.INCLUDE_SOURCES && CONFIG.CITATION_STYLE === 'endnotes') {
            const allCitations = messages.flatMap(m => m.citations);
            if (allCitations.length > 0) {
                markdown += `## All Sources\n\n`;
                allCitations.forEach(cite => {
                    markdown += `- [${cite.text}](${cite.url})\n`;
                });
            }
        }

        return markdown;
    }

    function exportToMarkdown() {
        const markdown = generateMarkdown();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `perplexity-export-${timestamp}.md`;

        GM_download({
            url: 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdown),
            name: filename,
            saveAs: true
        });

        console.log(`[Export] Downloaded as ${filename}`);
    }

    function copyToClipboard() {
        const markdown = generateMarkdown();
        GM_setClipboard(markdown, 'text');
        showNotification('Copied to clipboard!');
        console.log('[Export] Copied to clipboard');
    }

    // ===== UI CONTROLS =====
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'perplexity-dom-freezer-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-width: 200px;
        `;

        panel.innerHTML = `
            <div style="color: white; margin-bottom: 10px; font-weight: bold; font-size: 14px;">
                🧊 DOM Freezer
            </div>
            <button id="freeze-toggle-btn" style="
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                color: #667eea;
                transition: all 0.2s;
            ">
                ❄️ Freeze DOM
            </button>
            <button id="export-md-btn" style="
                width: 100%;
                padding: 8px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                color: #667eea;
                transition: all 0.2s;
            ">
                💾 Export Markdown
            </button>
            <button id="copy-btn" style="
                width: 100%;
                padding: 8px;
                background: rgba(255, 255, 255, 0.9);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                color: #667eea;
                transition: all 0.2s;
            ">
                📋 Copy to Clipboard
            </button>
            <div id="status-text" style="
                color: rgba(255, 255, 255, 0.8);
                margin-top: 10px;
                font-size: 12px;
                text-align: center;
            ">
                Ready
            </div>
        `;

        document.body.appendChild(panel);

        // Add hover effects
        const buttons = panel.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.05)';
                btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
        });

        // Event listeners
        document.getElementById('freeze-toggle-btn').addEventListener('click', toggleFreeze);
        document.getElementById('export-md-btn').addEventListener('click', exportToMarkdown);
        document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
    }

    function toggleFreeze() {
        const btn = document.getElementById('freeze-toggle-btn');
        const status = document.getElementById('status-text');

        if (isFrozen) {
            isFrozen = false;
            stopFreezeMonitor();
            btn.textContent = '❄️ Freeze DOM';
            btn.style.background = 'white';
            status.textContent = 'Ready';
            console.log('[DOM Freezer] Unfrozen');
        } else {
            isFrozen = true;
            forceRenderAll();
            startFreezeMonitor();
            btn.textContent = '🔥 Unfreeze DOM';
            btn.style.background = '#ff6b6b';
            btn.style.color = 'white';
            status.textContent = 'DOM Frozen ❄️';
            console.log('[DOM Freezer] Frozen');
        }
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000000;
            background: #10b981;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // ===== INITIALIZATION =====
    function init() {
        disableVirtualization();

        window.addEventListener('load', () => {
            setTimeout(() => {
                createControlPanel();

                if (CONFIG.AUTO_FREEZE_ON_LOAD) {
                    toggleFreeze();
                }

                console.log('[DOM Freezer] Initialized successfully');
            }, 1000);
        });
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    init();
})();