# Surge AI Health Auto Select

Surge module and cron script for testing AI candidate policies against real AI service APIs and automatically selecting the fastest usable policies.

## Files

- `AI-Health-AutoSelect.sgmodule`: Surge module entry.
- `ai-health-autoselect.js`: Cron script used by the module.
- `AI-OpenAI-AutoSelect.sgmodule`: Compatibility URL for the old module name.

## Import URL

After pushing this repository to GitHub, import the raw module URL in Surge:

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect.sgmodule
```

The module loads the script from:

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/ai-health-autoselect.js
```

## How It Works

The script runs every 10 minutes. It reads candidate policies from AI service policy groups, tests each candidate through real API endpoints, filters out blocked or failed policies, and switches each service group to the fastest usable policy.

Default service groups:

- `AI-OpenAI` -> `https://api.openai.com/v1/models`
- `AI-Claude` -> `https://api.anthropic.com/v1/models`
- `AI-Gemini` -> `https://generativelanguage.googleapis.com/v1beta/models`

Expected OpenAI responses without an API key:

- `401`: reachable, usually usable.
- `403`: likely region/IP blocked, excluded.
- `429`: reachable but rate limited, treated as usable.

## Requirements

- Surge Mac or Surge iOS with scripting enabled.
- A profile containing `AI-OpenAI`, `AI-Claude`, and `AI-Gemini` select or url-test policy groups.
- Candidate policies should be visible under those service groups, directly or through nested policy groups.

## Notes

Surge `url-test` considers any HTTP response successful, so it cannot reliably distinguish OpenAI `403` region blocks from usable responses. This script checks status code and response content for a more realistic AI availability test.
