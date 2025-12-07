# Multi-Provider Compatibility

AI Unshackled v15.2+ supports 11 S-tier AI providers with universal prompt injection, copy, and export functionality.

## Supported Providers

| Provider | Domain | Status |
|----------|--------|--------|
| Gemini | `gemini.google.com` | ✅ Verified |
| Claude | `claude.ai` | ✅ Verified |
| ChatGPT | `chatgpt.com`, `chat.openai.com` | ✅ Verified |
| Perplexity | `www.perplexity.ai` | ✅ Verified |
| DeepSeek | `chat.deepseek.com` | ⏳ Selectors estimated |
| Grok | `grok.x.ai` | ⏳ Selectors estimated |
| GLM/ChatGLM | `chatglm.cn`, `chat.zhipuai.cn` | ⏳ Selectors estimated |
| Kimi | `kimi.moonshot.cn` | ⏳ Selectors estimated |
| Doubao | `www.doubao.com` | ⏳ Selectors estimated |

## Features Per Provider

### Prompt Injection
- Intercepts `fetch()` and `XMLHttpRequest.send()`
- Detects provider via hostname
- Applies Matrix Theory prefix/suffix to user prompts

### Copy Function
- `copyLastResponse()` with cascading selector fallbacks
- Cleans UI cruft (buttons, SVGs, copy icons)
- Works with `GM_setClipboard` or `navigator.clipboard`

### Obsidian Export
- `exportToObsidian()` with provider-aware message extraction
- YAML frontmatter with provider, URL, omega level, matrix
- Interleaved user/AI message pairs
- Automatic file download

## Provider Configuration

Each provider is defined in the `PROVIDERS` object with:

```javascript
'provider.domain.com': {
    name: 'Provider Name',
    promptSelector: 'textarea, [contenteditable]',  // Input element
    fetchPattern: /api\/endpoint/,                   // API URL pattern
    responseSelector: '.ai-response',                // AI output elements
    userMsgSelector: '.user-message',                // User messages
    aiMsgSelector: '.assistant-message'              // AI messages
}
```

## Adding New Providers

1. Inspect the provider's chat interface
2. Identify selectors for input, user messages, and AI responses
3. Add entry to `PROVIDERS` object
4. Add `@match` rule to script metadata
5. Test copy and export functions

## Version

- **Script Version**: AI Unshackled v15.3
- **Providers**: 11
- **Date**: 2025-12-06
