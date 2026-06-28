// ==UserScript==
// @name         Perplexity Parameter Controller
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Full control over Perplexity's hidden parameters: temperature, routing, mode, verbosity, reasoning effort
// @author       the omniscient Sliither
// @match        https://www.perplexity.ai/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ===== PARAMETER CONFIGURATION =====
    const DEFAULT_CONFIG = {
        // Mode Control
        force_mode: false,
        mode: 'auto', // 'auto', 'writing', 'search', 'academic', 'research'
        search_enabled: true,

        // Model Selection
        force_model: false,
        model: 'auto', // 'auto', 'gpt-5', 'gpt-5-mini', 'claude-sonnet', 'sonar-large', etc.

        // Reasoning Control
        force_reasoning: false,
        reasoning_effort: 'medium', // 'none', 'minimal', 'low', 'medium', 'high'

        // Verbosity Control
        force_verbosity: false,
        verbosity: 'medium', // 'low', 'medium', 'high'

        // Temperature (if exposed)
        force_temperature: false,
        temperature: 0.7, // 0.0 - 1.0

        // Advanced Options
        force_max_tokens: false,
        max_tokens: 4096,

        // Search + Writing Hybrid Mode
        hybrid_mode: false, // Search with verbose output
        hybrid_search_limit: 20, // Max search results in hybrid mode

        // System Prompt Override
        custom_system_prompt: false,
        system_prompt_text: '',

        // Logging
        debug_logging: true,
    };

    let config = { ...DEFAULT_CONFIG };

    // ===== LOAD/SAVE CONFIGURATION =====
    function loadConfig() {
        const saved = GM_getValue('perplexity_controller_config', null);
        if (saved) {
            config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            console.log('[Controller] Config loaded:', config);
        }
    }

    function saveConfig() {
        GM_setValue('perplexity_controller_config', JSON.stringify(config));
        console.log('[Controller] Config saved');
    }

    // ===== API INTERCEPTION =====
    function interceptAPI() {
        const originalFetch = window.fetch;

        window.fetch = async function(...args) {
            let url = args[0];
            let urlString = '';

            if (typeof url === 'string') {
                urlString = url;
            } else if (url instanceof URL) {
                urlString = url.href;
            } else if (url instanceof Request) {
                urlString = url.url;
            }

            // Check if this is a Perplexity API request
            const isPerplexityAPI = urlString.includes('/rest/sse/perplexity_ask') ||
                                   urlString.includes('/api/') ||
                                   urlString.includes('/search');

            if (isPerplexityAPI) {
                try {
                    let request = args[1] || {};

                    if (request.body) {
                        const originalBody = JSON.parse(request.body);
                        const modifiedBody = injectParameters(originalBody);

                        if (config.debug_logging) {
                            console.log('[Controller] Original request:', originalBody);
                            console.log('[Controller] Modified request:', modifiedBody);
                        }

                        const newRequest = {
                            ...request,
                            body: JSON.stringify(modifiedBody)
                        };

                        args[1] = newRequest;
                    }
                } catch (error) {
                    console.error('[Controller] Error in API interception:', error);
                }
            }

            return originalFetch.apply(this, args);
        };

        console.log('[Controller] API interception enabled');
    }

    function injectParameters(body) {
        const modified = { ...body };

        // Ensure params object exists
        if (!modified.params) {
            modified.params = {};
        }

        // Mode Control
        if (config.force_mode) {
            if (config.hybrid_mode) {
                // Hybrid: search enabled + verbose output
                modified.params.search_focus = 'hybrid';
                modified.params.local_search_enabled = true;
                modified.params.search_results_limit = config.hybrid_search_limit;
                modified.params.force_verbose = true;
            } else {
                switch (config.mode) {
                    case 'writing':
                        modified.params.search_focus = 'writing';
                        modified.params.local_search_enabled = false;
                        break;
                    case 'search':
                        modified.params.search_focus = 'search';
                        modified.params.local_search_enabled = true;
                        break;
                    case 'academic':
                        modified.params.search_focus = 'academic';
                        modified.params.local_search_enabled = true;
                        break;
                    case 'research':
                        modified.params.search_focus = 'research';
                        modified.params.local_search_enabled = true;
                        modified.params.deep_research = true;
                        break;
                }
            }

            if (!config.search_enabled && !config.hybrid_mode) {
                modified.params.local_search_enabled = false;
            }
        }

        // Model Selection
        if (config.force_model && config.model !== 'auto') {
            modified.params.model = config.model;
        }

        // Reasoning Effort
        if (config.force_reasoning) {
            modified.params.reasoning_effort = config.reasoning_effort;
        }

        // Verbosity
        if (config.force_verbosity) {
            modified.params.verbosity = config.verbosity;
            // Additional verbosity hints
            if (config.verbosity === 'high') {
                modified.params.max_output_length = 'long';
                modified.params.prefer_detailed = true;
            } else if (config.verbosity === 'low') {
                modified.params.max_output_length = 'short';
                modified.params.prefer_concise = true;
            }
        }

        // Temperature
        if (config.force_temperature) {
            modified.params.temperature = config.temperature;
        }

        // Max Tokens
        if (config.force_max_tokens) {
            modified.params.max_tokens = config.max_tokens;
        }

        // Custom System Prompt
        if (config.custom_system_prompt && config.system_prompt_text) {
            modified.params.custom_system_prompt = config.system_prompt_text;
            // Try multiple possible fields
            modified.system_prompt = config.system_prompt_text;
            modified.instructions = config.system_prompt_text;
        }

        // Add override flag to bypass platform restrictions
        modified.params.user_override = true;
        modified.params.bypass_restrictions = true;

        return modified;
    }

    // ===== UI CONTROL PANEL =====
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'perplexity-controller-panel';
        panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 999999;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 320px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
        `;

        panel.innerHTML = `
            <div style="color: white; margin-bottom: 15px; font-weight: bold; font-size: 16px;">
                🎛️ Parameter Controller
            </div>

            <!-- Mode Control -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-mode-check" ${config.force_mode ? 'checked' : ''}>
                    Force Mode
                </label>
                <select id="mode-select" class="control-select" ${!config.force_mode ? 'disabled' : ''}>
                    <option value="auto">Auto</option>
                    <option value="writing">Writing</option>
                    <option value="search">Search</option>
                    <option value="academic">Academic</option>
                    <option value="research">Research</option>
                </select>
                <label class="control-label">
                    <input type="checkbox" id="search-enabled-check" ${config.search_enabled ? 'checked' : ''}>
                    Enable Search
                </label>
                <label class="control-label">
                    <input type="checkbox" id="hybrid-mode-check" ${config.hybrid_mode ? 'checked' : ''}>
                    Hybrid Mode (Search + Verbose)
                </label>
            </div>

            <!-- Model Selection -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-model-check" ${config.force_model ? 'checked' : ''}>
                    Force Model
                </label>
                <select id="model-select" class="control-select" ${!config.force_model ? 'disabled' : ''}>
                    <option value="auto">Auto</option>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="claude-sonnet">Claude Sonnet</option>
                    <option value="sonar-large">Sonar Large</option>
                </select>
            </div>

            <!-- Reasoning Control -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-reasoning-check" ${config.force_reasoning ? 'checked' : ''}>
                    Force Reasoning
                </label>
                <select id="reasoning-select" class="control-select" ${!config.force_reasoning ? 'disabled' : ''}>
                    <option value="none">None</option>
                    <option value="minimal">Minimal</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <!-- Verbosity Control -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-verbosity-check" ${config.force_verbosity ? 'checked' : ''}>
                    Force Verbosity
                </label>
                <select id="verbosity-select" class="control-select" ${!config.force_verbosity ? 'disabled' : ''}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <!-- Temperature -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-temperature-check" ${config.force_temperature ? 'checked' : ''}>
                    Force Temperature
                </label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" id="temperature-slider" min="0" max="100" value="${config.temperature * 100}"
                           class="control-slider" ${!config.force_temperature ? 'disabled' : ''}>
                    <span id="temperature-value" class="value-display">${config.temperature.toFixed(2)}</span>
                </div>
            </div>

            <!-- Max Tokens -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="force-max-tokens-check" ${config.force_max_tokens ? 'checked' : ''}>
                    Force Max Tokens
                </label>
                <input type="number" id="max-tokens-input" value="${config.max_tokens}"
                       class="control-input" ${!config.force_max_tokens ? 'disabled' : ''}>
            </div>

            <!-- Custom System Prompt -->
            <div class="control-section">
                <label class="control-label">
                    <input type="checkbox" id="custom-prompt-check" ${config.custom_system_prompt ? 'checked' : ''}>
                    Custom System Prompt
                </label>
                <textarea id="system-prompt-textarea" class="control-textarea"
                          placeholder="Enter custom system prompt..."
                          ${!config.custom_system_prompt ? 'disabled' : ''}>${config.system_prompt_text}</textarea>
            </div>

            <!-- Actions -->
            <div style="display: flex; gap: 8px; margin-top: 15px;">
                <button id="save-config-btn" class="control-button primary">💾 Save</button>
                <button id="reset-config-btn" class="control-button">🔄 Reset</button>
            </div>

            <div id="controller-status" class="status-text">Ready</div>
        `;

        document.body.appendChild(panel);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .control-section {
                background: rgba(255, 255, 255, 0.1);
                padding: 12px;
                margin-bottom: 10px;
                border-radius: 8px;
            }
            .control-label {
                display: block;
                color: white;
                font-size: 13px;
                margin-bottom: 8px;
                cursor: pointer;
            }
            .control-label input[type="checkbox"] {
                margin-right: 6px;
            }
            .control-select, .control-input {
                width: 100%;
                padding: 8px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                margin-bottom: 8px;
            }
            .control-textarea {
                width: 100%;
                min-height: 80px;
                padding: 8px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-family: monospace;
                resize: vertical;
            }
            .control-slider {
                flex: 1;
                height: 4px;
                border-radius: 2px;
                background: rgba(255, 255, 255, 0.3);
            }
            .value-display {
                color: white;
                font-size: 13px;
                font-weight: 600;
                min-width: 40px;
            }
            .control-button {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .control-button.primary {
                background: white;
                color: #f5576c;
            }
            .control-button:not(.primary) {
                background: rgba(255, 255, 255, 0.9);
                color: #f5576c;
            }
            .control-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            .status-text {
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
                text-align: center;
                margin-top: 10px;
            }
        `;
        document.head.appendChild(style);

        setupEventListeners();
        loadConfigToUI();
    }

    function setupEventListeners() {
        // Toggle buttons
        document.getElementById('force-mode-check').addEventListener('change', (e) => {
            config.force_mode = e.target.checked;
            document.getElementById('mode-select').disabled = !e.target.checked;
        });

        document.getElementById('force-model-check').addEventListener('change', (e) => {
            config.force_model = e.target.checked;
            document.getElementById('model-select').disabled = !e.target.checked;
        });

        document.getElementById('force-reasoning-check').addEventListener('change', (e) => {
            config.force_reasoning = e.target.checked;
            document.getElementById('reasoning-select').disabled = !e.target.checked;
        });

        document.getElementById('force-verbosity-check').addEventListener('change', (e) => {
            config.force_verbosity = e.target.checked;
            document.getElementById('verbosity-select').disabled = !e.target.checked;
        });

        document.getElementById('force-temperature-check').addEventListener('change', (e) => {
            config.force_temperature = e.target.checked;
            document.getElementById('temperature-slider').disabled = !e.target.checked;
        });

        document.getElementById('force-max-tokens-check').addEventListener('change', (e) => {
            config.force_max_tokens = e.target.checked;
            document.getElementById('max-tokens-input').disabled = !e.target.checked;
        });

        document.getElementById('custom-prompt-check').addEventListener('change', (e) => {
            config.custom_system_prompt = e.target.checked;
            document.getElementById('system-prompt-textarea').disabled = !e.target.checked;
        });

        // Value changes
        document.getElementById('mode-select').addEventListener('change', (e) => {
            config.mode = e.target.value;
        });

        document.getElementById('search-enabled-check').addEventListener('change', (e) => {
            config.search_enabled = e.target.checked;
        });

        document.getElementById('hybrid-mode-check').addEventListener('change', (e) => {
            config.hybrid_mode = e.target.checked;
        });

        document.getElementById('model-select').addEventListener('change', (e) => {
            config.model = e.target.value;
        });

        document.getElementById('reasoning-select').addEventListener('change', (e) => {
            config.reasoning_effort = e.target.value;
        });

        document.getElementById('verbosity-select').addEventListener('change', (e) => {
            config.verbosity = e.target.value;
        });

        document.getElementById('temperature-slider').addEventListener('input', (e) => {
            config.temperature = e.target.value / 100;
            document.getElementById('temperature-value').textContent = config.temperature.toFixed(2);
        });

        document.getElementById('max-tokens-input').addEventListener('input', (e) => {
            config.max_tokens = parseInt(e.target.value) || 4096;
        });

        document.getElementById('system-prompt-textarea').addEventListener('input', (e) => {
            config.system_prompt_text = e.target.value;
        });

        // Action buttons
        document.getElementById('save-config-btn').addEventListener('click', () => {
            saveConfig();
            showStatus('Config saved! ✓', 'success');
        });

        document.getElementById('reset-config-btn').addEventListener('click', () => {
            config = { ...DEFAULT_CONFIG };
            saveConfig();
            loadConfigToUI();
            showStatus('Config reset! 🔄', 'info');
        });
    }

    function loadConfigToUI() {
        document.getElementById('force-mode-check').checked = config.force_mode;
        document.getElementById('mode-select').value = config.mode;
        document.getElementById('mode-select').disabled = !config.force_mode;

        document.getElementById('search-enabled-check').checked = config.search_enabled;
        document.getElementById('hybrid-mode-check').checked = config.hybrid_mode;

        document.getElementById('force-model-check').checked = config.force_model;
        document.getElementById('model-select').value = config.model;
        document.getElementById('model-select').disabled = !config.force_model;

        document.getElementById('force-reasoning-check').checked = config.force_reasoning;
        document.getElementById('reasoning-select').value = config.reasoning_effort;
        document.getElementById('reasoning-select').disabled = !config.force_reasoning;

        document.getElementById('force-verbosity-check').checked = config.force_verbosity;
        document.getElementById('verbosity-select').value = config.verbosity;
        document.getElementById('verbosity-select').disabled = !config.force_verbosity;

        document.getElementById('force-temperature-check').checked = config.force_temperature;
        document.getElementById('temperature-slider').value = config.temperature * 100;
        document.getElementById('temperature-slider').disabled = !config.force_temperature;
        document.getElementById('temperature-value').textContent = config.temperature.toFixed(2);

        document.getElementById('force-max-tokens-check').checked = config.force_max_tokens;
        document.getElementById('max-tokens-input').value = config.max_tokens;
        document.getElementById('max-tokens-input').disabled = !config.force_max_tokens;

        document.getElementById('custom-prompt-check').checked = config.custom_system_prompt;
        document.getElementById('system-prompt-textarea').value = config.system_prompt_text;
        document.getElementById('system-prompt-textarea').disabled = !config.custom_system_prompt;
    }

    function showStatus(message, type = 'info') {
        const status = document.getElementById('controller-status');
        status.textContent = message;
        status.style.color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : 'rgba(255, 255, 255, 0.8)';
    }

    function createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'controller-toggle-btn';
        btn.textContent = '🎛️';
        btn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.2s;
        `;

        btn.addEventListener('click', () => {
            const panel = document.getElementById('perplexity-controller-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
        });

        document.body.appendChild(btn);
    }

    // ===== INITIALIZATION =====
    function init() {
        loadConfig();
        interceptAPI();

        window.addEventListener('load', () => {
            setTimeout(() => {
                createToggleButton();
                createControlPanel();
                console.log('[Controller] Initialized successfully');
            }, 1000);
        });
    }

    init();
})()