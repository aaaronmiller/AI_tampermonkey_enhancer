// ==UserScript==
// @name         YouTube Feed Content Filter Pro
// @namespace    https://github.com/ice-ninja
// @version      2.0.0
// @description  Comprehensive filter for YouTube feed: hides sponsored, promotional, fundraiser, members-only, premium, merch, tickets, and other unwanted content. Based on YouTube's actual labeling taxonomy and best practices from yt-neuter, Unhook, and uBlock community filters.
// @author       Ice-ninja (with Sliither assistance)
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION - All toggleable by user
    // ============================================================
    const DEFAULT_CONFIG = {
        // Core promotional content filters
        hideSponsored: true,           // "Includes paid promotion", sponsored content
        hideFundraiser: true,          // YouTube Giving, charity, donation prompts
        hidePromotional: true,         // General promotional content
        hideAds: true,                 // In-feed ads, promoted videos

        // Paywall content filters
        hideMembersOnly: true,         // "Members only", "Members first" videos
        hidePremium: true,             // "Premium", "Pay to watch", rental content

        // Commerce/merch filters (from Unhook/yt-neuter)
        hideMerch: true,               // Merch shelf, product placements
        hideTickets: true,             // Concert tickets, event tickets
        hideOffers: true,              // Special offers, deals
        hideShopping: true,            // Shopping tags, product cards

        // Content type filters
        hideShorts: false,             // YouTube Shorts (disabled by default)
        hideMix: false,                // Mix/Radio playlists (disabled by default)
        hideLive: false,               // Live streams (disabled by default)
        hideUpcoming: false,           // Scheduled/Premiere videos (disabled by default)
        hideStreamed: false,           // "Streamed X ago" past livestreams

        // UI element filters (from Unhook)
        hideDonationShelf: true,       // Donation shelf on video pages
        hideInfoPanels: true,          // Info panels (Wikipedia, etc.)

        // Behavior
        debug: false,
        scanDebounce: 150,
        showFilteredCount: true
    };

    // Load saved config or use defaults
    let CONFIG = { ...DEFAULT_CONFIG };
    try {
        const saved = GM_getValue('yt_filter_config', null);
        if (saved) CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) { /* use defaults */ }

    // ============================================================
    // YOUTUBE'S ACTUAL LABELING TAXONOMY
    // Based on official YouTube policies, badge text, and DOM analysis
    // ============================================================
    const YOUTUBE_LABELS = {
        // Official YouTube disclosure labels
        paidPromotion: [
            'includes paid promotion',
            'paid promotion',
            'paid partnership',
            'sponsored',
            'sponsorship',
            'brand deal',
            'ad',                       // Exact match only
            'advertisement',
            'advertiser content',
            'paid content',
            'commercial content',
            // German
            'enthält produktplatzierung',
            'bezahlte werbung',
            'gesponsert',
            'werbung',
            'anzeige',
            // French
            'inclut une communication commerciale',
            'sponsorisé',
            'publicité',
            'partenariat rémunéré',
            // Spanish
            'incluye promoción pagada',
            'patrocinado',
            'publicidad',
            // Italian
            'include promozione a pagamento',
            'sponsorizzato',
            'pubblicità',
            // Portuguese
            'inclui promoção paga',
            'patrocinado',
            // Dutch
            'bevat betaalde promotie',
            'gesponsord',
            'advertentie',
            // Japanese
            'プロモーションを含みます',
            'スポンサー',
            '広告',
            '有料プロモーション',
            // Chinese
            '包含付费推广',
            '赞助',
            '广告',
            // Korean
            '유료 광고 포함',
            '스폰서',
            // Russian
            'включает платную рекламу',
            'спонсор',
            'реклама',
            // Polish
            'zawiera płatną promocję',
            'sponsorowane',
            // Turkish
            'ücretli tanıtım içerir',
            'sponsorlu'
        ],

        // YouTube Giving / Fundraiser labels
        fundraiser: [
            'fundraiser',
            'donate',
            'donation',
            'charity',
            'giving',
            'nonprofit',
            'non-profit',
            '501(c)(3)',
            'raise funds',
            'support cause',
            // German
            'spendenaktion',
            'spenden',
            'wohltätigkeit',
            // French
            'collecte de fonds',
            'don',
            'caritatif',
            'association caritative',
            // Spanish
            'recaudación de fondos',
            'donación',
            'caridad',
            'organización benéfica',
            // Italian
            'raccolta fondi',
            'donazione',
            'beneficenza',
            // Dutch
            'inzamelingsactie',
            'donatie',
            'goed doel',
            // Japanese
            '募金',
            '寄付',
            'チャリティー',
            // Chinese
            '筹款',
            '捐款',
            '慈善',
            // Russian
            'сбор средств',
            'пожертвование',
            'благотворительность'
        ],

        // Membership/paywall labels
        membersOnly: [
            'members only',
            'members first',
            'member exclusive',
            'join to watch',
            'channel membership',
            // German
            'nur für mitglieder',
            'mitglieder zuerst',
            // French
            'réservé aux membres',
            'membres uniquement',
            // Spanish
            'solo para miembros',
            'miembros primero',
            // Italian
            'solo per i membri',
            // Dutch
            'alleen voor leden',
            // Japanese
            'メンバー限定',
            'メンバー専用',
            // Chinese
            '仅限会员',
            '会员专享'
        ],

        // Premium/rental content
        premium: [
            'premium',
            'pay to watch',
            'purchase',
            'rent',
            'buy',
            'movie',
            'rental',
            // German
            'kaufen',
            'leihen',
            // French
            'acheter',
            'louer',
            // Spanish
            'comprar',
            'alquilar'
        ],

        // Commerce labels (from yt-neuter SponsorBlock list)
        merch: [
            'merch',
            'merchandise',
            'shop',
            'store',
            'buy now',
            'get yours',
            'official store',
            'product',
            // German
            'merchandise',
            'shop',
            // French
            'boutique',
            'marchandise'
        ],

        tickets: [
            'tickets',
            'concert',
            'tour',
            'event',
            'live event',
            'get tickets',
            'buy tickets',
            // German
            'tickets',
            'konzert',
            // French
            'billets',
            'concert'
        ],

        offers: [
            'offer',
            'deal',
            'discount',
            'sale',
            'limited time',
            'special offer',
            'promo code',
            'coupon',
            // German
            'angebot',
            'rabatt',
            // French
            'offre',
            'réduction'
        ],

        // Video type labels
        shorts: [
            'shorts',
            '#shorts'
        ],

        mix: [
            'mix',
            'radio',
            'my mix',
            'playlist radio'
        ],

        live: [
            'live',
            'live now',
            'streaming',
            'watching now',
            'watching'
        ],

        upcoming: [
            'upcoming',
            'premiere',
            'premieres',
            'scheduled',
            'set reminder',
            'notify me'
        ],

        streamed: [
            'streamed'
        ]
    };

    // ============================================================
    // DOM SELECTORS - Updated for 2026 YouTube
    // Based on yt-neuter, uBlock easylist, and manual analysis
    // ============================================================
    const SELECTORS = {
        // Video containers (multiple fallbacks)
        videoContainers: [
            'ytd-rich-item-renderer',
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer',
            'yt-lockup-view-model',
            'ytd-playlist-video-renderer',
            'ytd-playlist-panel-video-renderer'
        ],

        // Direct ad/promo elements to always hide
        adElements: [
            'ytd-ad-slot-renderer',
            'ytd-promoted-sparkles-web-renderer',
            'ytd-promoted-video-renderer',
            'ytd-display-ad-renderer',
            'ytd-in-feed-ad-layout-renderer',
            'ytd-banner-promo-renderer',
            'ytd-statement-banner-renderer',
            'ytd-brand-video-shelf-renderer',
            'ytd-brand-video-singleton-renderer',
            'ytd-player-legacy-desktop-watch-ads-renderer',
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
            '[is-companion-ad]'
        ],

        // Badge/label selectors
        badges: [
            '.badge',
            '.ytd-badge-supported-renderer',
            'ytd-badge-supported-renderer',
            '.badge-style-type-members-only',
            '.badge-style-type-live-now',
            '.badge-style-type-live-now-alternate',
            '.yt-badge-shape',
            '.yt-badge-shape--membership',
            '.badge-shape-wiz--commerce',
            '.badge-shape-wiz--thumbnail-live',
            'badge-shape',
            'yt-content-metadata-view-model',
            '[aria-label]',
            '.ytp-paid-content-overlay'
        ],

        // Metadata containers
        metadata: [
            '#metadata',
            '#meta',
            '.ytd-video-meta-block',
            'yt-content-metadata-view-model',
            '#channel-info',
            '.inline-metadata-item',
            '#video-title',
            'yt-formatted-string',
            '#description',
            '.description'
        ],

        // Commerce/merch elements (from yt-neuter)
        commerce: [
            'ytd-merch-shelf-renderer',
            '#merch-shelf',
            'ytd-product-details-image-carousel-renderer',
            'ytd-product-details-renderer',
            '[target-id="engagement-panel-structured-description-product-list"]',
            '.ytp-featured-product',
            'ytd-metadata-row-renderer:has(a[href*="store"])',
            'ytd-metadata-row-renderer:has(a[href*="shop"])'
        ],

        // Tickets elements
        ticketElements: [
            'ytd-ticket-shelf-renderer',
            '[target-id="engagement-panel-structured-description-ticket-offers"]'
        ],

        // Donation/fundraiser elements
        donationElements: [
            '#donation-shelf',
            'ytd-donation-shelf-renderer',
            'ytd-donation-unavailable-renderer',
            '.ytd-donation-shelf-renderer'
        ],

        // Info panels (Wikipedia, etc.)
        infoPanels: [
            'ytd-info-panel-content-renderer',
            'ytd-info-panel-container-renderer',
            '#clarify-box'
        ],

        // Rich sections (shelves, promoted sections)
        richSections: [
            'ytd-rich-section-renderer',
            'ytd-shelf-renderer',
            'ytd-horizontal-card-list-renderer',
            'ytd-reel-shelf-renderer'
        ],

        // Shorts-specific
        shortsElements: [
            'ytd-reel-shelf-renderer',
            '[is-shorts]',
            'a[href^="/shorts/"]',
            '.shortsLockupViewModelHost'
        ]
    };

    // ============================================================
    // CSS STYLES
    // ============================================================
    const CSS_STYLES = `
        /* === ALWAYS HIDE: Ad elements === */
        ytd-ad-slot-renderer,
        ytd-promoted-sparkles-web-renderer,
        ytd-promoted-video-renderer,
        ytd-display-ad-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-banner-promo-renderer,
        ytd-statement-banner-renderer,
        ytd-brand-video-shelf-renderer,
        ytd-brand-video-singleton-renderer,
        ytd-player-legacy-desktop-watch-ads-renderer,
        [is-companion-ad],
        .ytp-ad-module,
        #masthead-ad,
        #player-ads {
            display: none !important;
        }

        /* === Filtered content animation === */
        .yt-feed-filtered {
            opacity: 0 !important;
            max-height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            pointer-events: none !important;
            transition: all 0.15s ease-out !important;
        }

        /* === Prevent layout gaps === */
        ytd-rich-grid-row:has(> #contents > ytd-rich-item-renderer.yt-feed-filtered:only-child) {
            display: none !important;
        }

        /* === Commerce/merch elements === */
        ytd-merch-shelf-renderer,
        #merch-shelf,
        ytd-ticket-shelf-renderer {
            display: none !important;
        }

        /* === Donation shelf === */
        #donation-shelf,
        ytd-donation-shelf-renderer {
            display: none !important;
        }

        /* === Filter counter badge === */
        #yt-filter-counter {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 8px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-family: 'YouTube Sans', 'Roboto', sans-serif;
            z-index: 9999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        #yt-filter-counter.visible {
            opacity: 1;
        }
    `;

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================

    let filteredCount = 0;
    let counterElement = null;
    let counterTimeout = null;

    function log(...args) {
        if (CONFIG.debug) {
            console.log('[YT-Filter-Pro]', ...args);
        }
    }

    function saveConfig() {
        try {
            GM_setValue('yt_filter_config', JSON.stringify(CONFIG));
        } catch (e) { /* ignore */ }
    }

    function normalizeText(text) {
        if (!text) return '';
        return text.toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    function matchesAnyLabel(text, labelArray) {
        if (!text || !labelArray) return false;
        const normalized = normalizeText(text);

        return labelArray.some(label => {
            const normalizedLabel = normalizeText(label);
            // For short labels (<=3 chars), require word boundary
            if (normalizedLabel.length <= 3) {
                const regex = new RegExp(`\\b${normalizedLabel}\\b`, 'i');
                return regex.test(normalized);
            }
            // For longer labels, substring match is fine
            return normalized.includes(normalizedLabel);
        });
    }

    function getElementText(element) {
        if (!element) return '';
        // Get aria-label first (most reliable)
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Get visible text
        return element.textContent || element.innerText || '';
    }

    function showCounter() {
        if (!CONFIG.showFilteredCount) return;

        if (!counterElement) {
            counterElement = document.createElement('div');
            counterElement.id = 'yt-filter-counter';
            document.body.appendChild(counterElement);
        }

        counterElement.textContent = `Filtered: ${filteredCount}`;
        counterElement.classList.add('visible');

        if (counterTimeout) clearTimeout(counterTimeout);
        counterTimeout = setTimeout(() => {
            counterElement.classList.remove('visible');
        }, 2000);
    }

    // ============================================================
    // DETECTION FUNCTIONS
    // ============================================================

    function checkBadges(element, labelArray) {
        for (const selector of SELECTORS.badges) {
            try {
                const badges = element.querySelectorAll(selector);
                for (const badge of badges) {
                    const text = getElementText(badge);
                    if (matchesAnyLabel(text, labelArray)) {
                        return true;
                    }
                }
            } catch (e) { /* selector may not match */ }
        }
        return false;
    }

    function checkMetadata(element, labelArray) {
        for (const selector of SELECTORS.metadata) {
            try {
                const items = element.querySelectorAll(selector);
                for (const item of items) {
                    const text = getElementText(item);
                    if (matchesAnyLabel(text, labelArray)) {
                        return true;
                    }
                }
            } catch (e) { /* ignore */ }
        }
        return false;
    }

    function hasDirectElement(element, selectorArray) {
        for (const selector of selectorArray) {
            try {
                if (element.matches(selector) || element.querySelector(selector)) {
                    return true;
                }
            } catch (e) { /* ignore */ }
        }
        return false;
    }

    // Individual content type checkers
    function isSponsored(element) {
        if (!CONFIG.hideSponsored) return false;
        return checkBadges(element, YOUTUBE_LABELS.paidPromotion) ||
               checkMetadata(element, YOUTUBE_LABELS.paidPromotion);
    }

    function isFundraiser(element) {
        if (!CONFIG.hideFundraiser) return false;
        return checkBadges(element, YOUTUBE_LABELS.fundraiser) ||
               hasDirectElement(element, SELECTORS.donationElements);
    }

    function isAd(element) {
        if (!CONFIG.hideAds) return false;
        return hasDirectElement(element, SELECTORS.adElements);
    }

    function isMembersOnly(element) {
        if (!CONFIG.hideMembersOnly) return false;
        // Check specific class first
        if (element.querySelector('.badge-style-type-members-only, .yt-badge-shape--membership, .badge-shape-wiz--commerce')) {
            return true;
        }
        return checkBadges(element, YOUTUBE_LABELS.membersOnly);
    }

    function isPremium(element) {
        if (!CONFIG.hidePremium) return false;
        const premiumBadge = element.querySelector('.badge[aria-label="Premium"], .badge[aria-label="Pay to watch"]');
        if (premiumBadge) return true;
        return checkBadges(element, YOUTUBE_LABELS.premium);
    }

    function isMerch(element) {
        if (!CONFIG.hideMerch) return false;
        return hasDirectElement(element, SELECTORS.commerce) ||
               checkBadges(element, YOUTUBE_LABELS.merch);
    }

    function isTickets(element) {
        if (!CONFIG.hideTickets) return false;
        return hasDirectElement(element, SELECTORS.ticketElements) ||
               checkBadges(element, YOUTUBE_LABELS.tickets);
    }

    function isOffers(element) {
        if (!CONFIG.hideOffers) return false;
        return checkBadges(element, YOUTUBE_LABELS.offers);
    }

    function isShorts(element) {
        if (!CONFIG.hideShorts) return false;
        // Check for shorts link
        if (element.querySelector('a[href^="/shorts/"]')) return true;
        return hasDirectElement(element, SELECTORS.shortsElements);
    }

    function isMix(element) {
        if (!CONFIG.hideMix) return false;
        // Check for collections stack (mix indicator)
        if (element.querySelector('yt-collections-stack')) return true;
        return checkBadges(element, YOUTUBE_LABELS.mix);
    }

    function isLive(element) {
        if (!CONFIG.hideLive) return false;
        const liveBadge = element.querySelector('.badge[aria-label="LIVE"], .badge-shape-wiz--thumbnail-live, .badge-style-type-live-now');
        if (liveBadge) return true;
        return checkBadges(element, YOUTUBE_LABELS.live);
    }

    function isUpcoming(element) {
        if (!CONFIG.hideUpcoming) return false;
        if (element.querySelector('ytd-thumbnail-overlay-time-status-renderer[overlay-style="UPCOMING"]')) {
            return true;
        }
        return checkBadges(element, YOUTUBE_LABELS.upcoming);
    }

    function isStreamed(element) {
        if (!CONFIG.hideStreamed) return false;
        return checkMetadata(element, YOUTUBE_LABELS.streamed);
    }

    // Master filter check
    function shouldFilter(element) {
        return isAd(element) ||
               isSponsored(element) ||
               isFundraiser(element) ||
               isMembersOnly(element) ||
               isPremium(element) ||
               isMerch(element) ||
               isTickets(element) ||
               isOffers(element) ||
               isShorts(element) ||
               isMix(element) ||
               isLive(element) ||
               isUpcoming(element) ||
               isStreamed(element);
    }

    function getFilterReason(element) {
        const reasons = [];
        if (isAd(element)) reasons.push('ad');
        if (isSponsored(element)) reasons.push('sponsored');
        if (isFundraiser(element)) reasons.push('fundraiser');
        if (isMembersOnly(element)) reasons.push('members-only');
        if (isPremium(element)) reasons.push('premium');
        if (isMerch(element)) reasons.push('merch');
        if (isTickets(element)) reasons.push('tickets');
        if (isOffers(element)) reasons.push('offers');
        if (isShorts(element)) reasons.push('shorts');
        if (isMix(element)) reasons.push('mix');
        if (isLive(element)) reasons.push('live');
        if (isUpcoming(element)) reasons.push('upcoming');
        if (isStreamed(element)) reasons.push('streamed');
        return reasons;
    }

    // ============================================================
    // FILTERING ENGINE
    // ============================================================

    function filterElement(element) {
        if (element.classList.contains('yt-feed-filtered')) return;
        if (element.dataset.ytFilterChecked === 'true') return;

        element.dataset.ytFilterChecked = 'true';

        if (shouldFilter(element)) {
            const reasons = getFilterReason(element);
            element.classList.add('yt-feed-filtered');
            element.dataset.ytFilterReason = reasons.join(',');
            filteredCount++;
            log('Filtered:', reasons.join(', '), element);
            showCounter();
        }
    }

    function scanPage() {
        // Scan video containers
        for (const selector of SELECTORS.videoContainers) {
            try {
                document.querySelectorAll(selector).forEach(filterElement);
            } catch (e) { /* ignore */ }
        }

        // Scan rich sections for promotional content
        for (const selector of SELECTORS.richSections) {
            try {
                document.querySelectorAll(selector).forEach(section => {
                    if (section.classList.contains('yt-feed-filtered')) return;

                    // Check section header for promotional keywords
                    const header = section.querySelector('#title, h2, .title, yt-formatted-string');
                    if (header) {
                        const text = getElementText(header);
                        const allPromoLabels = [
                            ...YOUTUBE_LABELS.paidPromotion,
                            ...YOUTUBE_LABELS.merch,
                            ...YOUTUBE_LABELS.offers
                        ];
                        if (matchesAnyLabel(text, allPromoLabels)) {
                            section.classList.add('yt-feed-filtered');
                            section.dataset.ytFilterReason = 'promo-section';
                            filteredCount++;
                            log('Filtered section:', text);
                            showCounter();
                        }
                    }
                });
            } catch (e) { /* ignore */ }
        }

        // Always hide commerce elements if configured
        if (CONFIG.hideMerch) {
            SELECTORS.commerce.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (!el.classList.contains('yt-feed-filtered')) {
                            el.classList.add('yt-feed-filtered');
                        }
                    });
                } catch (e) { /* ignore */ }
            });
        }

        // Always hide donation elements if configured
        if (CONFIG.hideFundraiser || CONFIG.hideDonationShelf) {
            SELECTORS.donationElements.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (!el.classList.contains('yt-feed-filtered')) {
                            el.classList.add('yt-feed-filtered');
                        }
                    });
                } catch (e) { /* ignore */ }
            });
        }

        // Hide info panels if configured
        if (CONFIG.hideInfoPanels) {
            SELECTORS.infoPanels.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (!el.classList.contains('yt-feed-filtered')) {
                            el.classList.add('yt-feed-filtered');
                        }
                    });
                } catch (e) { /* ignore */ }
            });
        }
    }

    // ============================================================
    // MUTATION OBSERVER
    // ============================================================

    let scanTimeout = null;

    function debouncedScan() {
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => {
            scanPage();
            scanTimeout = null;
        }, CONFIG.scanDebounce);
    }

    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if relevant content was added
                            for (const selector of [...SELECTORS.videoContainers, ...SELECTORS.richSections]) {
                                if (node.matches?.(selector) || node.querySelector?.(selector)) {
                                    shouldScan = true;
                                    break;
                                }
                            }
                            if (shouldScan) break;
                        }
                    }
                }
                if (shouldScan) break;
            }

            if (shouldScan) debouncedScan();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver started');
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function init() {
        log('YouTube Feed Filter Pro v2.0.0 initializing...');
        log('Config:', CONFIG);

        // Inject styles
        GM_addStyle(CSS_STYLES);

        // Initial scan
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                scanPage();
                setupObserver();
            });
        } else {
            scanPage();
            setupObserver();
        }

        // Handle YouTube SPA navigation
        window.addEventListener('yt-navigate-finish', () => {
            log('Navigation detected');
            filteredCount = 0;  // Reset counter on navigation
            setTimeout(scanPage, 300);
        });

        // Also listen for popstate (back/forward)
        window.addEventListener('popstate', () => {
            setTimeout(scanPage, 300);
        });

        // Periodic rescan for edge cases
        setInterval(scanPage, 5000);

        log('Initialization complete');
    }

    // ============================================================
    // MENU COMMANDS
    // ============================================================

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('⚙️ Toggle Debug Mode', () => {
            CONFIG.debug = !CONFIG.debug;
            saveConfig();
            alert(`Debug mode: ${CONFIG.debug ? 'ON' : 'OFF'}`);
        });

        GM_registerMenuCommand('🔄 Force Rescan', () => {
            // Reset all checked flags
            document.querySelectorAll('[data-yt-filter-checked]').forEach(el => {
                delete el.dataset.ytFilterChecked;
            });
            scanPage();
            alert(`Rescanned! Found ${filteredCount} items to filter.`);
        });

        GM_registerMenuCommand('📊 Show Statistics', () => {
            const filtered = document.querySelectorAll('.yt-feed-filtered');
            const reasons = {};
            filtered.forEach(el => {
                const r = el.dataset.ytFilterReason || 'unknown';
                r.split(',').forEach(reason => {
                    reasons[reason] = (reasons[reason] || 0) + 1;
                });
            });

            let msg = `Total filtered: ${filtered.length}\n\nBy type:\n`;
            Object.entries(reasons)
                .sort((a, b) => b[1] - a[1])
                .forEach(([reason, count]) => {
                    msg += `  ${reason}: ${count}\n`;
                });
            alert(msg);
        });

        GM_registerMenuCommand('🎬 Toggle: Shorts', () => {
            CONFIG.hideShorts = !CONFIG.hideShorts;
            saveConfig();
            alert(`Hide Shorts: ${CONFIG.hideShorts ? 'ON' : 'OFF'}\nRefresh page to apply.`);
        });

        GM_registerMenuCommand('📻 Toggle: Mix/Radio', () => {
            CONFIG.hideMix = !CONFIG.hideMix;
            saveConfig();
            alert(`Hide Mix: ${CONFIG.hideMix ? 'ON' : 'OFF'}\nRefresh page to apply.`);
        });

        GM_registerMenuCommand('🔴 Toggle: Live', () => {
            CONFIG.hideLive = !CONFIG.hideLive;
            saveConfig();
            alert(`Hide Live: ${CONFIG.hideLive ? 'ON' : 'OFF'}\nRefresh page to apply.`);
        });

        GM_registerMenuCommand('⏰ Toggle: Upcoming/Premiere', () => {
            CONFIG.hideUpcoming = !CONFIG.hideUpcoming;
            saveConfig();
            alert(`Hide Upcoming: ${CONFIG.hideUpcoming ? 'ON' : 'OFF'}\nRefresh page to apply.`);
        });

        GM_registerMenuCommand('📺 Toggle: Past Livestreams', () => {
            CONFIG.hideStreamed = !CONFIG.hideStreamed;
            saveConfig();
            alert(`Hide Streamed: ${CONFIG.hideStreamed ? 'ON' : 'OFF'}\nRefresh page to apply.`);
        });

        GM_registerMenuCommand('🔧 Reset to Defaults', () => {
            if (confirm('Reset all settings to defaults?')) {
                CONFIG = { ...DEFAULT_CONFIG };
                saveConfig();
                alert('Settings reset. Refresh page to apply.');
            }
        });
    }

    // Start
    init();

})();