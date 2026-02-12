// ==UserScript==
// @name         Substack Subscribe Bouncer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically redirects from /subscribe and /welcome pages to the root or article page on Substack.
// @author       Ice-ninja Helper
// @match        *://*.substack.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // The specific paths we want to banish
    const bannedPaths = ['/subscribe', '/welcome', '/sign-up'];

    // Get the current path
    const currentPath = window.location.pathname;

    // Check if we are on a banned path
    // We check endsWith to catch cases like /p/some-post/subscribe
    if (bannedPaths.some(path => currentPath.endsWith(path))) {

        // Remove the banned suffix
        // This regex removes the banned path (e.g. /subscribe) from the end of the URL
        const cleanPath = currentPath.replace(new RegExp(`(${bannedPaths.join('|')})/?$`), '');
s
        // Construct the new clean URL
        const cleanUrl = window.location.origin + cleanPath + window.location.search + window.location.hash;

        // Perform the redirect immediately
        // .replace() is used so the "subscribe" page doesn't get stuck in your back-button history
        window.location.replace(cleanUrl);
    }
})();