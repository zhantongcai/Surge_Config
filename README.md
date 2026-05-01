# Surge Config

Surge profile template plus an AI auto-select module.

## Files

- `Steve_WgetCloud_AI_Smart.conf`: Sanitized Surge profile template. Replace `输入你的订阅链接` with your own subscription URL before use.
- `AI-Health-AutoSelect.sgmodule`: Surge module entry.
- `ai-health-autoselect.js`: Cron script used by the module.

## Import URL

After pushing this repository to GitHub, import the raw module URL in Surge:

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@main/AI-Health-AutoSelect.sgmodule
```

The module loads the script from:

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@main/ai-health-autoselect.js
```

## How It Works

The script runs every 10 minutes. It reads candidate policies from the single `AI` select group, then:

1. Switches `AI` to each candidate.
2. Checks `http://chat.openai.com/cdn-cgi/trace` for Cloudflare `loc`.
3. Skips unsupported ChatGPT regions.
4. Checks `https://chatgpt.com/backend-api/models`.
5. Selects the fastest usable candidate.

Expected OpenAI responses without an API key:

- `401`: reachable, usually usable.
- `403`: likely region/IP blocked, excluded.
- `429`: reachable but rate limited, treated as usable.

## Requirements

- Surge Mac or Surge iOS with scripting enabled.
- A profile containing one `AI` select policy group.
- Candidate policies should be directly visible under `AI`.

## Notes

Surge `url-test` considers any HTTP response successful, so it cannot reliably distinguish ChatGPT region blocks from usable responses. This script checks Cloudflare trace, status code, and response content for a more realistic AI availability test.
