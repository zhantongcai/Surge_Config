/*
 * Surge cron script: keep one AI select group on the best ChatGPT-capable node.
 *
 * Flow:
 * 1. Read candidates from the AI select group.
 * 2. Switch AI to each candidate.
 * 3. Pre-check Cloudflare trace from chat.openai.com to get loc/colo/warp.
 * 4. Confirm ChatGPT backend availability with chatgpt.com/backend-api/models.
 * 5. Select the fastest usable candidate; restore original selection if none works.
 */

const CONFIG = {
  group: "AI",
  timeout: 6,
  traceUrl: "http://chat.openai.com/cdn-cgi/trace",
  checkUrl: "https://chatgpt.com/backend-api/models",
  goodStatus: [200, 401, 429],
  notify: true,
  debug: true,
  badName: /(Remain|Expired|Expire|Expiry|Reset|Traffic|官网|网址|网站|订阅|链接|频道|群组|客服|工单|公告|通知|提示|如需|套餐|套餐到期|套餐重置|到期|过期|失效|有效期|重置|刷新|更新|剩余|已用|可用|流量|倍率|剩余流量|距离|去除|失联|续费|购买|用户|账号|账户|邮箱|TG|Telegram|QQ|微信|[0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}|[0-9]+(\\.[0-9]+)?\\s*(GB|MB|TB|G|M|T)\\b|[0-9]+(\\.[0-9]+)?\\s*[xX倍]|[0-9]+%)/i,
  regionFilter: /(美|美国|US|States|American|日|日本|JP|Japan|坡|新加坡|狮城|SG|Singapore|台|台湾|TW|Tai|英|英国|UK|United Kingdom|韩|韩国|KR|Korea)/i,
  allowedLoc: [
    "AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BD","BB","BE","BZ","BJ","BT","BA","BW","BR","BG","BF","CV","CA","CL","CO","KM","CR","HR","CY","DK","DJ","DM","DO","EC","SV","EE","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LV","LB","LS","LR","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PE","PH","PL","PT","QA","RO","RW","KN","LC","VC","WS","SM","ST","SN","RS","SC","SL","SG","SK","SI","SB","ZA","ES","LK","SR","SE","CH","TH","TG","TO","TT","TN","TR","TV","UG","AE","US","UY","VU","ZM","BO","BN","CG","CZ","VA","FM","MD","PS","KR","TW","TZ","TL","GB"
  ],
  blockedText: /(unsupported_country|unsupported country|not available|not supported|access denied|forbidden|blocked|not support|不支持|所在的地区|地区不支持)/i,
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

function uniq(items) {
  const seen = {};
  return items.filter((item) => {
    if (!item || seen[item]) return false;
    seen[item] = true;
    return true;
  });
}

async function selectPolicy(group, policy) {
  return api("POST", "/v1/policy_groups/select", { group_name: group, policy });
}

function parseTrace(text) {
  const out = {};
  String(text || "").split("\n").forEach((line) => {
    const idx = line.indexOf("=");
    if (idx > 0) out[line.slice(0, idx)] = line.slice(idx + 1);
  });
  return out;
}

function requestViaAI(url) {
  const started = Date.now();
  return new Promise((resolve) => {
    $httpClient.get({
      url,
      policy: CONFIG.group,
      timeout: CONFIG.timeout,
      headers: {
        "User-Agent": "Surge-AI-Health-AutoSelect/2.0",
        "Accept": "application/json,text/plain,*/*",
      },
      "auto-redirect": false,
    }, (error, response, data) => {
      resolve({
        error: error ? String(error) : "",
        status: response && response.status,
        body: typeof data === "string" ? data.slice(0, 2000) : "",
        latency: Date.now() - started,
      });
    });
  });
}

async function testCandidate(policy) {
  const selected = await selectPolicy(CONFIG.group, policy);
  if (selected && selected.error) {
    return { policy, usable: false, error: selected.error, latency: 0 };
  }

  const traceResp = await requestViaAI(CONFIG.traceUrl);
  const trace = parseTrace(traceResp.body);
  const loc = String(trace.loc || "").toUpperCase();
  const locAllowed = CONFIG.allowedLoc.indexOf(loc) >= 0;
  if (traceResp.error || !locAllowed) {
    return {
      policy,
      usable: false,
      status: traceResp.status,
      latency: traceResp.latency,
      loc,
      colo: trace.colo,
      warp: trace.warp,
      error: traceResp.error || `loc ${loc || "unknown"} not allowed`,
    };
  }

  const checkResp = await requestViaAI(CONFIG.checkUrl);
  const blocked = CONFIG.blockedText.test(checkResp.body) || checkResp.status === 403;
  const good = CONFIG.goodStatus.indexOf(checkResp.status) >= 0;
  return {
    policy,
    usable: !checkResp.error && good && !blocked,
    status: checkResp.status,
    latency: traceResp.latency + checkResp.latency,
    loc,
    colo: trace.colo,
    warp: trace.warp,
    error: checkResp.error || (blocked ? "blocked" : ""),
  };
}

(async () => {
  const current = await api("GET", `/v1/policy_groups/select?group_name=${encodeURIComponent(CONFIG.group)}`);
  const originalPolicy = current && current.policy;
  const payload = await api("GET", "/v1/policy_groups");
  const groups = groupList(payload);
  const aiGroup = groups.find((item) => item && item.name === CONFIG.group);
  const candidates = uniq(groupPolicies(aiGroup).map(policyName))
    .filter(Boolean)
    .filter((name) => !CONFIG.badName.test(name))
    .filter((name) => CONFIG.regionFilter.test(name));

  const results = [];
  for (const policy of candidates) {
    results.push(await testCandidate(policy));
  }

  const usable = results.filter((item) => item.usable).sort((a, b) => a.latency - b.latency);
  let summary;
  if (usable.length) {
    const best = usable[0];
    await selectPolicy(CONFIG.group, best.policy);
    summary = `AI: ${best.policy} (${best.loc || "??"}, ${best.status}, ${best.latency}ms)`;
  } else {
    if (originalPolicy) await selectPolicy(CONFIG.group, originalPolicy);
    summary = "AI: No usable ChatGPT policy";
  }

  const debugLines = CONFIG.debug ? results.slice(0, 16).map((r) => {
    const reason = r.error || r.status || "no-status";
    return `${r.policy}: ${r.loc || "??"}/${r.colo || "?"}, ${reason}, ${r.latency}ms`;
  }) : [];

  const checkedAt = new Date().toISOString();
  $persistentStore.write(JSON.stringify({ checkedAt, selected: usable[0] || null, results }), "ai.health.autoselect.last");
  console.log([summary].concat(debugLines).join("\n"));
  if (CONFIG.notify && !usable.length) {
    $notification.post("AI Health Auto Select", "No usable ChatGPT policy", debugLines.slice(0, 6).join("\n"));
  }
  $done();
})().catch((error) => {
  $notification.post("AI Health Auto Select", "Script error", String(error));
  $done();
});
