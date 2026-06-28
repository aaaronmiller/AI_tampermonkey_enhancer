# Installation Guide

## What's New
✅ Fixed Perplexity AI injection
✅ Enhanced all other providers (DeepSeek, Grok, ChatGLM, etc.)
✅ Added custom system prompts (per-provider, first message only)

---

## Quick Install (Recommended)

### **Step 1: Install the Main Script**
1. Open Tampermonkey dashboard
2. Click "Create new script"
3. Copy the entire contents of **`New_Gemini_enhancer_v19.js`**
4. Paste into the editor and save

### **Step 2: Test Perplexity**
1. Visit www.perplexity.ai
2. You should see the **π button** in the corner
3. Click the π icon to open the configuration panel
4. Set Level 1-12 and test a query

---

## Custom System Prompts Setup

### **Access the Feature**
1. Click the **π icon** (main toolbar)
2. Click **🎯 Custom Prompts** button
3. You'll see text areas for all 11 providers
4. Enter your custom instructions

### **Example Prompts**

**Perplexity (Web Research):**
```
You are a research assistant. Prioritize factual accuracy and cite sources. Flag uncertainty with [UNVERIFIED].
```

**Gemini (Technical):**
```
Focus on technical implementation details. Show code examples where relevant. Be explicit about edge cases.
```

**Claude (Concise):**
```
Be direct and concise. Use bullet points for lists. Avoid long introductions.
```

### **Save & Test**
1. Click **💾 Save** in the custom prompts modal
2. The π button will turn **yellow** (ready state)
3. Type your query in the AI chat
4. First message will include your custom prompt
5. Subsequent messages will be normal (dormant state)

---

## Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| **π: Blue glow** | CET level active |
| **π: Yellow glow** | Custom prompt ready (not used yet) |
| **π: No glow** | Inactive |
| **Status: "Custom: READY"** | Prompt waiting for first message |
| **Status: "Custom: used"** | Already injected this session |

---

## Provider Support

| Provider | Website | Status |
|----------|---------|--------|
| Gemini | gemini.google.com | ✅ |
| Claude | claude.ai | ✅ |
| ChatGPT | chatgpt.com | ✅ |
| Perplexity | www.perplexity.ai | ✅ Fixed! |
| DeepSeek | chat.deepseek.com | ✅ Enhanced |
| Grok | grok.x.ai | ✅ Enhanced |
| ChatGLM | chatglm.cn | ✅ Enhanced |
| ZhiPuAI | chat.zhipuai.cn | ✅ Enhanced |
| Kimi | kimi.moonshot.cn | ✅ Enhanced |
| Doubao | www.doubao.com | ✅ Enhanced |

---

## Troubleshooting

### **Problem: Prompts not injecting**
1. Open browser console (F12)
2. Look for `[CET]` messages
3. Check if input element is found
4. Use debug script (`perplexity_debug.js`)

### **Problem: Custom prompt not working first time**
1. Ensure you're in a **new tab/window**
2. Check π button is yellow (not used yet)
3. Verify prompt is saved in config
4. Reset session: `sessionStorage.clear()` then reload

### **Problem: Wrong provider detected**
1. Check console: `console.log(location.hostname)`
2. Update custom prompt for that hostname
3. Save and reload the page

---

## Debug Tools

### **Perplexity Debug Script**
Install `perplexity_debug.js` to:
- Find current selectors
- Monitor network requests
- Test injection manually

---

## Advanced Usage

### **Session Reset**
To test custom prompts multiple times:
```javascript
// Run in browser console
sessionStorage.removeItem('cet_session_' + location.hostname);
location.reload();
```

### **View Current Config**
```javascript
// See all settings
GM_getValue('cet_cfg', {});
```

---

## Uninstallation
1. Disable/remove script from Tampermonkey
2. Clear storage (optional): `GM_setValue('cet_cfg', {})`
3. Refresh any open AI chat tabs

---

**Support**: Check `enhancement_summary.md` for technical details