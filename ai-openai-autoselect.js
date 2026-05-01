/*
 * Surge cron script: test candidate policies with a real OpenAI API endpoint,
 * then switch a select group to the fastest policy that is not region-blocked.
 *
 * Expected OpenAI outcomes without an API key:
 * - 401 usually means the endpoint is reachable from this IP.
 * - 403 often means region/IP policy blocked it.
 */

const DEFAULTS = {
  group: "AI",
  source: "AI",
  url: "https://api.openai.com/v1/models",
  timeout: "6",
  concurrency: "4",
};

const BAD_NAME = /(Remain|Expired|官网|如需|套餐|去除|剩余|距离|Reset|重置|流量)/i;
const GOOD_REGION = /(美|美国|US|States|American|日|日本|JP|Japan|坡|新加坡|狮城|SG|Singapore|港|香港|HK|Hong|台|台湾|TW|Tai)/i;

function parseArgument(text) {
  const out = { ...DEFAULTS };
  if (!text) return out;
  for (const part of text.split("&")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = decodeURIComponent(part.slice(0, idx));
    const value = decodeURIComponent(part.slice(idx + 1));
    if (key) out[key] = value;
  }
  return out;
}

function api(method, path, body) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body || {}, (result) => resolve(result || {}));
  });
}

function testPolicy(policy, url, timeout) {
  const started = Date.now();
  return new Promise((resolve) => {
    $httpClient.get({
      url,
      policy,
      timeout,
      headers: {
        "User-Agent": "Surge-AI-Policy-Checker/1.0",
        "Accept": "application/json",
      },
      "auto-redirect": false,
    }, (error, response, data) => {
      const latency = Date.now() - started;
      const status = response && response.status;
      const body = typeof data === "string" ? data.slice(0, 1200) : "";
      const blocked = status === 403 || /unsupported_country|country|region|not available/i.test(body);
      const usable = !error && !blocked && (status === 200 || status === 401 || status === 429);
      resolve({ policy, usable, status, latency, error: error ? String(error) : "" });
    });
  });
}

async function pool(items, limit, worker) {
  const results = [];
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

(async () => {
  const args = parseArgument(typeof $argument === "string" ? $argument : "");
  const timeout = Number(args.timeout) || 6;
  const concurrency = Number(args.concurrency) || 4;

  const groups = await api("GET", "/v1/policy_groups");
  const source = (groups.policy_groups || groups.groups || []).find((item) => item.name === args.source);
  const policies = ((source && (source.policies || source.options || source.children)) || [])
    .map((item) => typeof item === "string" ? item : item && item.name)
    .filter(Boolean)
    .filter((name) => !BAD_NAME.test(name))
    .filter((name) => GOOD_REGION.test(name));

  if (!policies.length) {
    $notification.post("AI Auto Select", "No candidate policies", `Group ${args.source} has no matching candidates.`);
    $done();
    return;
  }

  const results = await pool(policies, concurrency, (policy) => testPolicy(policy, args.url, timeout));
  const usable = results
    .filter((item) => item && item.usable)
    .sort((a, b) => a.latency - b.latency);

  if (!usable.length) {
    const sample = results.slice(0, 5).map((r) => `${r.policy}: ${r.status || r.error}`).join("\n");
    $notification.post("AI Auto Select", "No usable OpenAI policy", sample || "All candidates failed.");
    $done();
    return;
  }

  const best = usable[0];
  await api("POST", "/v1/policy_groups/select", {
    group_name: args.group,
    policy: best.policy,
  });

  $persistentStore.write(JSON.stringify({ selected: best, checkedAt: new Date().toISOString() }), "ai.openai.autoselect.last");
  console.log(`Selected ${best.policy}, status=${best.status}, latency=${best.latency}ms`);
  $done();
})().catch((error) => {
  $notification.post("AI Auto Select", "Script error", String(error));
  $done();
});
