# Surge AI Auto Select

Surge module and cron script for testing AI candidate policies against the OpenAI API and automatically selecting the fastest usable policy.

## Files

- `AI-OpenAI-AutoSelect.sgmodule`: Surge module entry.
- `ai-openai-autoselect.js`: Cron script used by the module.

## Import URL

After pushing this repository to GitHub, import the raw module URL in Surge:

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-OpenAI-AutoSelect.sgmodule
```

The module loads the script from:

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/ai-openai-autoselect.js
```

## How It Works

The script runs every 10 minutes. It reads candidate policies from the `AI` policy group, tests each candidate through `https://api.openai.com/v1/models`, filters out blocked or failed policies, and switches the `AI` select group to the fastest usable policy.

Expected OpenAI responses without an API key:

- `401`: reachable, usually usable.
- `403`: likely region/IP blocked, excluded.
- `429`: reachable but rate limited, treated as usable.

## Requirements

- Surge Mac or Surge iOS with scripting enabled.
- A profile containing an `AI` select policy group.
- Candidate policies should be directly selectable policies or policy groups visible under `AI`.

## Notes

Surge `url-test` considers any HTTP response successful, so it cannot reliably distinguish OpenAI `403` region blocks from usable responses. This script checks status code and response content for a more realistic AI availability test.
