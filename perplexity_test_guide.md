# Perplexity Injection Fix - Testing Guide

## What Was Fixed

The Perplexity AI injection was broken due to:
1. **Outdated CSS selectors** that no longer match Perplexity's current DOM
2. **Incomplete event handling** for modern React/Vue frameworks
3. **Missing retry logic** for dynamic SPA navigation
4. **Limited network patterns** for API interception

## Files Modified

| File | Approach | What Changed |
|------|----------|--------------|
| `New_Gemini_enhancer_v19.js` | DOM Manipulation | Enhanced selectors, event triggering, retry logic |
| `Gemini_enhancer.js` | Network Interception | Expanded fetch patterns, better error handling |
| `perplexity_debug.js` | Diagnostic Tool | New debugging script (use this first!) |

## Quick Start Test

### Step 1: Install the Debug Script
1. Copy `perplexity_debug.js` into Tampermonkey
2. Visit `www.perplexity.ai`
3. You should see a debug panel in the top-left
4. Click "Find Elements" to see if selectors work

### Step 2: Test with Your Main Script
1. Install either `New_Gemini_enhancer_v19.js` OR `Gemini_enhancer.js`
2. Visit Perplexity
3. Set Level (click the π icon, then set L1 through L12)
4. Type a test prompt like: "hello world"
5. Press Enter or click Submit
6. **Success**: The prompt should get enhanced with CET instructions

## Expected Behaviors

### ✅ Success Indicators
- Console shows `[CET] Injecting prompt: {length...}` or `[AI Unshackled] Voltron L1...`
- Input field gets populated with enhanced text (has XML tags like `<instruction>`)
- Toast notification shows `💉 L1` or `💉 L1 + CEO Council`
- The enhanced prompt gets submitted to Perplexity

### ❌ Failure Indicators
- No console logs from the script
- Prompt unchanged (no XML tags)
- No toast notification
- Console shows errors about missing elements

## Debugging Steps

### If Nothing Happens:
```javascript
// 1. Check if script is running
console.log('[TEST] Script check:', typeof CET_Enhancer !== 'undefined' ? '✅ Running' : '❌ Not loaded');

// 2. Check if you're on Perplexity
console.log('[TEST] Hostname:', location.hostname);

// 3. Check if selectors work
const testInput = document.querySelector('textarea[placeholder*="Ask"],textarea[placeholder*="Search"],div[contenteditable="true"]');
console.log('[TEST] Input found:', testInput ? '✅ Yes' : '❌ No');

// 4. Try manual injection
if (testInput) {
    testInput.value = 'TEST: Enhanced Prompt ✓';
    testInput.dispatchEvent(new Event('input', { bubbles: true }));
    console.log('[TEST] Manual injection complete');
}
```

### If Injection Works But Submit Fails:
```javascript
// Check submit button
const submitBtn = document.querySelector('button[aria-label="Submit"],button[class*="send"],button[type="submit"]');
console.log('Submit button:', submitBtn);

// Try manual submit
if (submitBtn) {
    submitBtn.click();
    console.log('Manual submit triggered');
}
```

## Advanced Debugging

### Network Interception Debug (v17.7)
```javascript
// Monitor fetch calls
const nativeFetch = window.fetch;
window.fetch = async function(url, init) {
    const urlStr = url.toString();
    if (urlStr.includes('perplexity') || urlStr.includes('/query/')) {
        console.log('📡 FETCH CAPTURED:', {
            url: urlStr,
            body: init?.body,
            headers: init?.headers
        });
    }
    return nativeFetch.apply(this, arguments);
};
```

### DOM Inspection Commands
```javascript
// Find all potential inputs
const allInputs = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], input'));
console.log('All potential inputs:', allInputs.map(el => ({
    tag: el.tagName,
    type: el.type,
    placeholder: el.placeholder,
    editable: el.contentEditable
})));

// Find all potential buttons
const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
console.log('All potential buttons:', allButtons.map(el => ({
    tag: el.tagName,
    text: el.textContent?.substring(0,20),
    aria: el.ariaLabel,
    disabled: el.disabled
})));
```

## Specific Perplexity Patterns to Test

### Current Known Selectors
```javascript
// Input (check which ones exist)
document.querySelector('textarea[placeholder*="Ask"]')        // Primary
document.querySelector('textarea[placeholder*="Search"]')     // Alternate
document.querySelector('div[contenteditable="true"]')         // ContentEditable
document.querySelector('div[class*="input"]')                // Class-based

// Submit Buttons
document.querySelector('button[aria-label="Submit"]')         // Primary
document.querySelector('button[type="submit"]')               // Standard
document.querySelector('button[class*="send"]')               // Class-based
document.querySelector('button:not([disabled])')              // Generic
```

## File Contents to Verify

### Check v19 File Has:
```javascript
// Provider config should include these:
inputSel: 'textarea[placeholder*="Ask"],textarea[placeholder*="Search"],div[contenteditable="true"]...'
setContent: (el, txt) => {
    // Should have multiple event dispatchers
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('keyup', { bubbles: true }));
}
```

### Check v17.7 File Has:
```javascript
// Provider config:
fetchPattern: /query|api\/query|completions|chat/  // Multiple patterns
promptSelector: 'textarea[placeholder*="Ask"],textarea[placeholder*="Search"]...'  // Multiple selectors
```

## Reporting Issues

If the fix doesn't work, please provide:
1. **Console output** from the debug script
2. **Screenshot** of the Perplexity input field (with dev tools open)
3. **Browser version** and Tampermonkey version
4. **Which script** you're using (v19 or v17.7)

## Performance Notes

- The debug script adds ~500ms to load time
- v19 (DOM) is faster for most users
- v17.7 (Network) is more reliable but requires `@grant unsafeWindow`
- Perplexity-specific delays are set to 800ms (vs 500ms default)