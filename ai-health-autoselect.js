/*
 * Surge cron script: test AI policy candidates with real AI service endpoints,
 * then switch select groups to the fastest policies that are not region-blocked.
 *
 * Expected API outcomes without an API key:
 * - 200/401/429 usually mean the endpoint is reachable from this IP.
 * - 403 or region/country block text means the policy is excluded.
 */

const DEFAULT_CONFIG = {
  timeout: 6,
  concurrency: 4,
  notify: true,
  recursive: true,
  regionFilter: /(美|美国|US|States|American|日|日本|JP|Japan|坡|新加坡|狮城|SG|Singapore|港|香港|HK|Hong|台|台湾|TW|Tai)/i,
  badName: /(Remain|Expired|官网|如需|套餐|去除|剩余|距离|Reset|重置|流量)/i,
  blockedText: /(unsupported_country|unsupported country|country|region|not available|not supported|access denied|forbidden|blocked)/i,
  tasks: [
    {
      name: "OpenAI",
      targetGroup: "AI-OpenAI",
      sourceGroup: "AI-OpenAI",
      url: "https://api.openai.com/v1/models",
      goodStatus: [200, 401, 429],
    },
    {
      name: "Claude",
      targetGroup: "AI-Claude",
      sourceGroup: "AI-Claude",
      url: "https://api.anthropic.com/v1/models",
      goodStatus: [200, 401, 429],
    },
    {
      name: "Gemini",
      targetGroup: "AI-Gemini",
      sourceGroup: "AI-Gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/models",
      goodStatus: [200, 400, 401, 403, 429],
      blockedText: /(unsupported_country|unsupported country|not available|access denied|forbidden|blocked)/i,
    },
  ],
};

function api(method, path, body) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body || {}, (result) => resolve(result || {}));
  });
}

function groupList(payload) {
  if (Array.isArray(payload)) return payload;
  const source = payload.policy_groups || payload.groups || payload.data;
  if (source && !Array.isArray(source) && typeof source === "object") {
    return Object.keys(source).map((name) => ({ name, policies: source[name] }));
  }
  if (!source && payload && typeof payload === "object") {
    return Object.keys(payload).map((name) => ({ name, policies: payload[name] }));
  }
  return source || [];
}

function groupPolicies(group) {
  return (group && (group.policies || group.options || group.children || group.policy_names)) || [];
}

function policyName(item) {
  return typeof item === "string" ? item : item && item.name;
}

function isPolicyGroupItem(item) {
  return !!(item && typeof item === "object" && item.isGroup);
}

function uniq(items) {
  const seen = {};
  return items.filter((item) => {
    if (!item || seen[item]) return false;
    seen[item] = true;
    return true;
  });
}

function flattenCandidates(groups, groupName, config, visited) {
  if (visited[groupName]) return [];
  visited[groupName] = true;

  const group = groups.find((item) => item && item.name === groupName);
  if (!group) return [groupName];

  const type = String(group.type || group.group_type || "").toLowerCase();
  const policyItems = groupPolicies(group);
  const children = policyItems.map(policyName).filter(Boolean);
  const looksLikeProxyGroup = type && type !== "select" && type !== "url-test" && type !== "fallback" && type !== "load-balance" && type !== "smart";

  if (!config.recursive || looksLikeProxyGroup || !children.length) {
    return [groupName];
  }

  let out = [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isPolicyGroupItem(policyItems[i])) {
      out = out.concat(flattenCandidates(groups, child, config, visited));
    } else {
      out.push(child);
    }
  }
  return out;
}

function testPolicy(policy, task, config) {
  const started = Date.now();
  return new Promise((resolve) => {
    $httpClient.get({
      url: task.url,
      policy,
      timeout: config.timeout,
      headers: {
        "User-Agent": "Surge-AI-Health-AutoSelect/1.0",
        "Accept": "application/json,text/plain,*/*",
      },
      "auto-redirect": false,
    }, (error, response, data) => {
      const latency = Date.now() - started;
      const status = response && response.status;
      const body = typeof data === "string" ? data.slice(0, 1600) : "";
      const blockedPattern = task.blockedText || config.blockedText;
      const blocked = status === 403 && task.name !== "Gemini" || blockedPattern.test(body);
      const good = (task.goodStatus || [200, 401, 429]).indexOf(status) >= 0;
      const usable = !error && good && !blocked;
      resolve({ service: task.name, policy, usable, status, latency, error: error ? String(error) : "" });
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

async function runTask(task, groups, config) {
  const raw = flattenCandidates(groups, task.sourceGroup, config, {});
  const candidates = uniq(raw)
    .filter((name) => !config.badName.test(name))
    .filter((name) => config.regionFilter.test(name));

  if (!candidates.length) {
    return { task: task.name, selected: null, error: `No candidates in ${task.sourceGroup}` };
  }

  const results = await pool(candidates, config.concurrency, (policy) => testPolicy(policy, task, config));
  const usable = results.filter((item) => item && item.usable).sort((a, b) => a.latency - b.latency);

  if (!usable.length) {
    return { task: task.name, selected: null, results, error: "No usable policy" };
  }

  const best = usable[0];
  await api("POST", "/v1/policy_groups/select", {
    group_name: task.targetGroup,
    policy: best.policy,
  });
  return { task: task.name, selected: best, results };
}

(async () => {
  const config = DEFAULT_CONFIG;
  const payload = await api("GET", "/v1/policy_groups");
  const groups = groupList(payload);
  const summaries = [];

  for (const task of config.tasks) {
    summaries.push(await runTask(task, groups, config));
  }

  const ok = summaries.filter((item) => item.selected);
  const failed = summaries.filter((item) => !item.selected);
  const checkedAt = new Date().toISOString();
  $persistentStore.write(JSON.stringify({ checkedAt, summaries }), "ai.health.autoselect.last");

  const lines = summaries.map((item) => {
    if (!item.selected) return `${item.task}: ${item.error}`;
    return `${item.task}: ${item.selected.policy} (${item.selected.status}, ${item.selected.latency}ms)`;
  });

  console.log(lines.join("\n"));
  if (config.notify && failed.length) {
    $notification.post("AI Health Auto Select", `${ok.length}/${summaries.length} services updated`, lines.join("\n"));
  }
  $done();
})().catch((error) => {
  $notification.post("AI Health Auto Select", "Script error", String(error));
  $done();
});
