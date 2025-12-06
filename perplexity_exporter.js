// ==UserScript==
// @name         Perplexity → Obsidian Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export Perplexity conversations to Obsidian-optimized Markdown
// @author       Ultrathink Architect
// @match        https://www.perplexity.ai/*
// @grant        GM_setClipboard
// @grant        GM_download
// ==/UserScript==

(function () {
    'use strict';

    class PerplexityExporter {
        constructor() {
            this.chatHistory = [];
            this.sourceRegistry = new Map();
            this.sourceCounter = 1;
            this.isExporting = false;
        }

        // Scroll through entire thread to force DOM population
        async loadFullConversation() {
            const chatContainer = document.querySelector('[class*="Thread"]') ||
                document.querySelector('main') ||
                document.querySelector('[class*="ConversationThread"]');

            if (!chatContainer) {
                console.error('Chat container not found');
                return false;
            }

            // Scroll to bottom first
            chatContainer.scrollTo(0, chatContainer.scrollHeight);
            await this.sleep(500);

            // Scroll to top in chunks, pausing to let DOM render
            const scrollStep = 500;
            let currentScroll = chatContainer.scrollHeight;

            while (currentScroll > 0) {
                currentScroll -= scrollStep;
                chatContainer.scrollTo(0, currentScroll);
                await this.sleep(200);
            }

            // Final pause for complete render
            await this.sleep(800);
            return true;
        }

        // Extract user messages
        extractUserMessages() {
            const selectors = [
                '[class*="UserMessage"]',
                '[class*="user-message"]',
                '[data-testid*="user"]',
                '.prose-user'
            ];

            let userMsgs = [];
            for (const sel of selectors) {
                const found = document.querySelectorAll(sel);
                if (found.length > 0) {
                    userMsgs = Array.from(found);
                    break;
                }
            }

            // Fallback: look for message pairs
            if (userMsgs.length === 0) {
                const allMessages = document.querySelectorAll('[class*="Message"], [class*="message"]');
                userMsgs = Array.from(allMessages).filter((el, idx) => idx % 2 === 0);
            }

            return userMsgs.map(msg => ({
                type: 'user',
                content: this.cleanText(msg.innerText || msg.textContent),
                timestamp: this.extractTimestamp(msg)
            }));
        }

        // Extract AI responses
        extractAIMessages() {
            const selectors = [
                '[class*="AssistantMessage"]',
                '[class*="ai-message"]',
                '[class*="Answer"]',
                '[data-testid*="assistant"]',
                '.prose-assistant'
            ];

            let aiMsgs = [];
            for (const sel of selectors) {
                const found = document.querySelectorAll(sel);
                if (found.length > 0) {
                    aiMsgs = Array.from(found);
                    break;
                }
            }

            // Fallback: look for message pairs
            if (aiMsgs.length === 0) {
                const allMessages = document.querySelectorAll('[class*="Message"], [class*="message"]');
                aiMsgs = Array.from(allMessages).filter((el, idx) => idx % 2 === 1);
            }

            return aiMsgs.map(msg => {
                const content = this.extractMessageContent(msg);
                const sources = this.extractSources(msg);

                return {
                    type: 'assistant',
                    content: content,
                    sources: sources,
                    timestamp: this.extractTimestamp(msg)
                };
            });
        }

        // Clean message content - remove UI cruft
        extractMessageContent(msgElement) {
            const clone = msgElement.cloneNode(true);

            // Remove UI elements
            const junkSelectors = [
                '[class*="CopyButton"]',
                '[class*="ShareButton"]',
                '[class*="ActionButton"]',
                '[class*="Toolbar"]',
                '[class*="SourceList"]',
                '[class*="CitationList"]',
                'button',
                '[role="button"]',
                'svg'
            ];

            junkSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach(el => el.remove());
            });

            return this.cleanText(clone.innerText || clone.textContent);
        }

        // Extract and normalize sources
        extractSources(msgElement) {
            const sources = [];
            const sourceElements = msgElement.querySelectorAll('[class*="Source"], [class*="Citation"], a[href^="http"]');

            sourceElements.forEach(src => {
                const url = src.href;
                const title = src.textContent?.trim() || src.getAttribute('aria-label') || 'Untitled';

                if (url && url.startsWith('http') && !this.sourceRegistry.has(url)) {
                    this.sourceRegistry.set(url, {
                        id: this.sourceCounter++,
                        url: url,
                        title: title.substring(0, 80)
                    });
                }

                if (url && url.startsWith('http')) {
                    sources.push(this.sourceRegistry.get(url).id);
                }
            });

            return [...new Set(sources)]; // Dedupe
        }

        // Merge user/AI messages chronologically
        mergeMessages() {
            const userMsgs = this.extractUserMessages();
            const aiMsgs = this.extractAIMessages();

            const allMessages = [];
            const maxLen = Math.max(userMsgs.length, aiMsgs.length);

            for (let i = 0; i < maxLen; i++) {
                if (userMsgs[i]) allMessages.push(userMsgs[i]);
                if (aiMsgs[i]) allMessages.push(aiMsgs[i]);
            }

            this.chatHistory = allMessages;
        }

        // Generate Obsidian-optimized Markdown
        generateMarkdown() {
            let md = '';

            // Frontmatter
            md += '---\n';
            md += `date: ${new Date().toISOString()}\n`;
            md += `source: perplexity.ai\n`;
            md += `url: ${window.location.href}\n`;
            md += `tags: [ai-chat, perplexity, export]\n`;
            md += '---\n\n';

            // Title
            const firstUserMsg = this.chatHistory.find(m => m.type === 'user');
            const title = firstUserMsg?.content.split('\n')[0].substring(0, 60) || 'Perplexity Chat';
            md += `# ${title}\n\n`;

            // Messages
            let queryCount = 0;
            this.chatHistory.forEach((msg) => {
                if (msg.type === 'user') {
                    queryCount++;
                    md += `## 🧑 Query ${queryCount}\n\n`;
                    md += `${msg.content}\n\n`;
                } else {
                    md += `## 🤖 Response\n\n`;
                    md += `${msg.content}\n\n`;

                    // Inline source citations
                    if (msg.sources && msg.sources.length > 0) {
                        md += `**Sources**: `;
                        md += msg.sources.map(srcId => `[^${srcId}]`).join(' ');
                        md += '\n\n';
                    }
                }

                md += '---\n\n';
            });

            // Sources section with horizontal compact layout
            if (this.sourceRegistry.size > 0) {
                md += '## 📚 References\n\n';

                // Compact inline format
                this.sourceRegistry.forEach((src) => {
                    const domain = new URL(src.url).hostname.replace('www.', '');
                    md += `[^${src.id}]: [${src.title}](${src.url}) _(${domain})_\n`;
                });
            }

            return md;
        }

        // Utilities
        cleanText(text) {
            return text
                .replace(/\n{3,}/g, '\n\n')
                .replace(/[ \t]+/g, ' ')
                .trim();
        }

        extractTimestamp(element) {
            const timeEl = element.querySelector('time') ||
                element.querySelector('[class*="timestamp"]');
            return timeEl?.getAttribute('datetime') || timeEl?.textContent || null;
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Main export flow
        async export() {
            if (this.isExporting) {
                alert('Export already in progress...');
                return;
            }

            this.isExporting = true;
            this.chatHistory = [];
            this.sourceRegistry = new Map();
            this.sourceCounter = 1;

            console.log('🚀 Starting Perplexity export...');

            try {
                const loaded = await this.loadFullConversation();
                if (!loaded) {
                    alert('Failed to load conversation');
                    return;
                }

                this.mergeMessages();

                if (this.chatHistory.length === 0) {
                    alert('No messages found to export');
                    return;
                }

                const markdown = this.generateMarkdown();

                // Copy to clipboard
                GM_setClipboard(markdown, 'text');

                // Generate filename
                const firstMsg = this.chatHistory.find(m => m.type === 'user');
                const slug = (firstMsg?.content || 'perplexity-chat')
                    .substring(0, 30)
                    .replace(/[^a-zA-Z0-9]+/g, '-')
                    .toLowerCase();
                const filename = `perplexity-${slug}-${Date.now()}.md`;

                // Offer download
                const blob = new Blob([markdown], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);

                GM_download({
                    url: url,
                    name: filename,
                    saveAs: true
                });

                alert(`✅ Exported ${this.chatHistory.length} messages!\n\n📋 Markdown copied to clipboard\n💾 Download initiated: ${filename}`);

            } catch (err) {
                console.error('Export error:', err);
                alert(`Export failed: ${err.message}`);
            } finally {
                this.isExporting = false;
            }
        }
    }

    // Create export button
    function injectExportButton() {
        if (document.getElementById('perp-export-btn')) return;

        const exporter = new PerplexityExporter();

        const btn = document.createElement('button');
        btn.id = 'perp-export-btn';
        btn.innerHTML = '📥 Export';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 9999;
            padding: 10px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: system-ui, -apple-system, sans-serif;
        `;

        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        };
        btn.onclick = () => exporter.export();

        document.body.appendChild(btn);
    }

    // Wait for page load then inject
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(injectExportButton, 1500));
    } else {
        setTimeout(injectExportButton, 1500);
    }

    // Re-inject if SPA navigation occurs
    const observer = new MutationObserver(() => {
        if (!document.getElementById('perp-export-btn')) {
            setTimeout(injectExportButton, 500);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
