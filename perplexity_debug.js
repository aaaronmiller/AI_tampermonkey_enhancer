// ==UserScript==
// @name         Perplexity Debug & Selector Finder
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Debug script to find current Perplexity selectors and test injection
// @match        *://www.perplexity.ai/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('🔍 Perplexity Debug Script Loaded');

    // Helper: Find elements matching multiple selectors
    function findElements() {
        console.group('🔍 PERPLEXITY DEBUG - Element Search');

        // Input candidates
        const inputSelectors = [
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="Search"]',
            'div[contenteditable="true"]',
            'textarea[id*="input"]',
            'textarea[class*="input"]',
            'div[class*="input"]',
            '[data-testid*="input"]',
            'textarea'
        ];

        // Submit button candidates
        const submitSelectors = [
            'button[aria-label="Submit"]',
            'button[type="submit"]',
            'button[data-testid*="submit"]',
            'button[class*="send"]',
            'button[class*="submit"]',
            'button:has(> svg)',
            'button[title*="Send"]'
        ];

        // Container candidates
        const containerSelectors = [
            '[class*="Thread"]',
            'main',
            '[class*="ConversationThread"]',
            '[class*="ChatContainer"]',
            'div[class*="container"]'
        ];

        console.log('INPUT SEARCH:');
        let foundInput = null;
        for (const sel of inputSelectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel} - Found ${els.length} elements`, els);
                if (!foundInput) foundInput = els[0];
            } else {
                console.log(`❌ ${sel} - Not found`);
            }
        }

        console.log('\nSUBMIT BUTTON SEARCH:');
        let foundSubmit = null;
        for (const sel of submitSelectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel} - Found ${els.length} elements`, els);
                if (!foundSubmit) foundSubmit = els[0];
            } else {
                console.log(`❌ ${sel} - Not found`);
            }
        }

        console.log('\nCONTAINER SEARCH:');
        for (const sel of containerSelectors) {
            const els = document.querySelectorAll(sel);
            if (els.length > 0) {
                console.log(`✅ ${sel} - Found ${els.length} elements`, els);
            } else {
                console.log(`❌ ${sel} - Not found`);
            }
        }

        // Active element info
        const activeEl = document.activeElement;
        if (activeEl) {
            console.log('\nACTIVE ELEMENT:');
            console.log('Tag:', activeEl.tagName);
            console.log('Type:', activeEl.type);
            console.log('Placeholder:', activeEl.placeholder);
            console.log('Class:', activeEl.className);
            console.log('ContentEditable:', activeEl.contentEditable);
            console.log('Value:', activeEl.value || activeEl.innerText);
        }

        // Show all textareas and their properties
        const allTextareas = document.querySelectorAll('textarea');
        if (allTextareas.length > 0) {
            console.log('\nALL TEXTAREAS:');
            allTextareas.forEach((ta, i) => {
                console.log(`[${i}] placeholder="${ta.placeholder}"`, ta);
            });
        }

        // Show all buttons
        const allButtons = document.querySelectorAll('button');
        if (allButtons.length > 0) {
            console.log('\nALL BUTTONS (first 10):');
            Array.from(allButtons).slice(0, 10).forEach((btn, i) => {
                console.log(`[${i}] aria-label="${btn.ariaLabel}"`, btn);
            });
        }

        console.groupEnd();

        return { input: foundInput, submit: foundSubmit };
    }

    // Helper: Monitor network requests
    function monitorNetwork() {
        console.log('📡 Starting network monitoring...');

        const nativeFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0]?.toString() || '';
            if (url.includes('perplexity') || url.includes('/query/') || url.includes('/api/')) {
                console.log('📡 FETCH:', url, args[1]?.body || '');
            }
            return nativeFetch.apply(this, args);
        };

        const origSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(body) {
            const url = this._url || this.responseURL || '';
            if (url.includes('perplexity') || url.includes('/query/')) {
                console.log('📡 XHR:', url, body);
            }
            return origSend.call(this, body);
        };
    }

    // Test injection
    function testInjection() {
        console.log('🧪 TESTING INJECTION');
        const els = findElements();

        if (els.input) {
            const testText = 'TEST INJECTION - This should appear in the input field';
            console.log('Setting input to:', testText);

            // Try setting value
            if (els.input.tagName === 'TEXTAREA') {
                els.input.value = testText;
            } else {
                els.input.innerText = testText;
            }

            // Trigger events
            els.input.dispatchEvent(new Event('input', { bubbles: true }));
            els.input.dispatchEvent(new Event('change', { bubbles: true }));

            console.log('✅ Input set. Check if text appears in the field.');
            console.log('Current value:', els.input.value || els.input.innerText);

            if (els.submit) {
                console.log('Submit button found:', els.submit);
                console.log('Click it? (Check the checkbox that appears below)');

                // Create a test button
                const btn = document.createElement('button');
                btn.textContent = 'CLICK TO SUBMIT TEST';
                btn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 999999; background: red; color: white; padding: 10px; font-weight: bold;';
                btn.onclick = () => {
                    els.submit.click();
                    console.log('Submitted!');
                    btn.remove();
                };
                document.body.appendChild(btn);

                setTimeout(() => {
                    if (document.body.contains(btn)) {
                        console.log('Test button still available. Click red button to submit.');
                    }
                }, 2000);
            }

            return true;
        } else {
            console.log('❌ No input found to inject into');
            return false;
        }
    }

    // Create UI controls
    function createUI() {
        const container = document.createElement('div');
        container.id = 'perplexity-debug-ui';
        container.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 999999;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        container.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; font-size: 14px;">🔍 Perplexity Debug</div>
            <button id="dbg-find" style="margin: 2px; padding: 5px;">Find Elements</button>
            <button id="dbg-monitor" style="margin: 2px; padding: 5px;">Monitor Network</button>
            <button id="dbg-test" style="margin: 2px; padding: 5px; background: #4CAF50;">Test Injection</button>
            <button id="dbg-hide" style="margin: 2px; padding: 5px; background: #666;">Hide UI</button>
            <div id="dbg-output" style="margin-top: 10px; padding: 5px; background: rgba(255,255,255,0.1); max-height: 200px; overflow-y: auto;"></div>
            <button id="dbg-clear" style="margin-top: 5px; padding: 3px; font-size: 10px;">Clear Output</button>
        `;

        document.body.appendChild(container);

        // Add click handlers
        container.querySelector('#dbg-find').onclick = () => {
            const result = findElements();
            const output = container.querySelector('#dbg-output');
            output.innerHTML = `<div>Input: ${result.input ? '✅ Found' : '❌ Not found'}<br>Submit: ${result.submit ? '✅ Found' : '❌ Not found'}</div>`;
        };

        container.querySelector('#dbg-monitor').onclick = () => {
            monitorNetwork();
            const output = container.querySelector('#dbg-output');
            output.innerHTML = '<div>📡 Network monitoring started. Check browser dev tools console.</div>';
        };

        container.querySelector('#dbg-test').onclick = () => {
            const success = testInjection();
            const output = container.querySelector('#dbg-output');
            output.innerHTML = `<div>${success ? '✅ Test started' : '❌ Failed to start'}</div>`;
        };

        container.querySelector('#dbg-clear').onclick = () => {
            container.querySelector('#dbg-output').innerHTML = '';
        };

        container.querySelector('#dbg-hide').onclick = () => {
            container.style.display = 'none';
            // Show a small toggle button
            const toggle = document.createElement('button');
            toggle.textContent = '🔍';
            toggle.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 999999; padding: 8px; font-size: 16px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;';
            toggle.onclick = () => {
                container.style.display = 'block';
                toggle.remove();
            };
            document.body.appendChild(toggle);
        };
    }

    // Auto-run on load with delay
    setTimeout(() => {
        console.log('🔍 Running initial analysis...');
        createUI();
        const result = findElements();

        if (!result.input || !result.submit) {
            console.warn('⚠️ Perplexity selectors may be outdated. Use the Debug UI to investigate.');
        } else {
            console.log('✅ Selectors appear to be working. Ready for injection.');
        }
    }, 2000);

    // Also run after any SPA navigation
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('🔄 URL changed, re-analyzing...');
            setTimeout(() => {
                findElements();
                if (document.getElementById('perplexity-debug-ui')) {
                    document.getElementById('perplexity-debug-ui').style.display = 'block';
                }
            }, 1500);
        }
    });
    urlObserver.observe(document, { subtree: true, childList: true });

})();