// ==UserScript==
// @name         AI Chat Backend Proxy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Intercept AI chat API calls and redirect to custom backend
// @author       Ice-ninja
// @match        https://claude.ai/*
// @match        https://chat.openai.com/*
// @match        https://www.perplexity.ai/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
// @connect      localhost
// @connect      your-proxy-server.com
// ==/UserScript==

(function() {
    'use strict';

    // Configuration
    const PROXY_BASE_URL = 'http://localhost:8080'; // Your proxy server
    const TARGET_APIS = [
        'https://api.anthropic.com',
        'https://api.openai.com',
        'https://api.perplexity.ai'
    ];

    // Store original fetch
    const originalFetch = unsafeWindow.fetch;

    // Override fetch
    unsafeWindow.fetch = function(...args) {
        let [url, options] = args;

        // Check if this is an API call we want to intercept
        const shouldIntercept = TARGET_APIS.some(api =>
            (typeof url === 'string' && url.startsWith(api)) ||
            (url instanceof Request && url.url.startsWith(api))
        );

        if (shouldIntercept) {
            console.log('[AI Proxy] Intercepting:', url);

            // Redirect to your proxy
            const newUrl = url.replace(/https:\/\/api\.(anthropic|openai|perplexity)\.(com|ai)/, PROXY_BASE_URL);

            // Modify options if needed (e.g., add custom headers)
            const newOptions = {
                ...options,
                headers: {
                    ...options?.headers,
                    'X-Proxy-Target': url, // Tell proxy where to route
                    'X-Custom-Model': 'gpt-4o' // Override model if desired
                }
            };

            console.log('[AI Proxy] Redirecting to:', newUrl);
            return originalFetch(newUrl, newOptions);
        }

        // Pass through non-intercepted requests
        return originalFetch(...args);
    };

    // ALSO intercept XMLHttpRequest for older implementations
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        const shouldIntercept = TARGET_APIS.some(api => url.startsWith(api));

        if (shouldIntercept) {
            console.log('[AI Proxy XHR] Intercepting:', url);
            url = url.replace(/https:\/\/api\.(anthropic|openai|perplexity)\.(com|ai)/, PROXY_BASE_URL);
        }

        return originalXHROpen.call(this, method, url, ...rest);
    };

    console.log('[AI Proxy] Script loaded and active!');
})();