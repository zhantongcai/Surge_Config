# Surge Config

Surge 配置模板与 AI 节点自动优选模块。

## 文件说明

- `Steve_WgetCloud_AI_Smart.conf`：已脱敏的 Surge 配置模板。使用前请把 `输入你的订阅链接` 替换成自己的订阅链接。
- `AI-Health-AutoSelect.sgmodule`：Surge 模块入口。
- `ai-health-autoselect.js`：模块使用的定时检测脚本。

## 模块版本

- 当前版本：`v1.2.1`
- 适用目标：单一 `AI` 策略组
- 检测标准：以 ChatGPT / OpenAI 网页可用性为准

## 导入地址

在 Surge 的模块页面中选择“从 URL 安装模块”，填入：

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@main/AI-Health-AutoSelect.sgmodule
```

固定版本地址：

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@e702dbd/AI-Health-AutoSelect.sgmodule
```

模块会加载脚本：

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@main/ai-health-autoselect.js
```

## 使用步骤

1. 导入 `Steve_WgetCloud_AI_Smart.conf`。
2. 将配置中的 `输入你的订阅链接` 替换为自己的 Surge 订阅链接。
3. 确认配置里存在一个名为 `AI` 的 `select` 策略组。
4. 在 Surge 中安装 `AI-Health-AutoSelect.sgmodule`。
5. 启用模块并应用配置。
6. 脚本会每 10 分钟自动检测并切换 `AI` 组的最优节点。

## 工作原理

脚本每 10 分钟运行一次。它会读取单一 `AI` 策略组中的候选节点，然后：

1. Switches `AI` to each candidate.
2. Checks `http://chat.openai.com/cdn-cgi/trace` for Cloudflare `loc`.
3. Skips unsupported ChatGPT regions.
4. Checks `https://chatgpt.com/backend-api/models`.
5. Selects the fastest usable candidate.

中文解释：

- 先逐个切换 `AI` 组里的候选节点。
- 先访问 `http://chat.openai.com/cdn-cgi/trace`，读取 Cloudflare 判断出的出口地区 `loc`。
- 如果地区不在 ChatGPT 支持列表内，直接跳过。
- 再访问 `https://chatgpt.com/backend-api/models` 做真实可用性确认。
- 排除 `403`、地区封锁、网络错误、超时等节点。
- 从可用节点中选择延迟最低的一个。

预期响应：

- `401`：通常表示后端可达，只是未登录或无凭据，可视为可用。
- `403`：通常表示地区或 IP 被阻止，会排除。
- `429`：通常表示可达但限流，暂时视为可用。

## 订阅信息过滤

很多机场订阅会把以下信息伪装成节点：

- 套餐到期日期
- 套餐重置日期
- 剩余流量
- 官网 / 订阅 / 客服 / 群组
- 倍率 / 百分比 / 日期

配置和脚本都已经加入过滤逻辑，避免这些非节点项目进入 AI 自动选择候选。

## 要求

- Surge Mac or Surge iOS with scripting enabled.
- A profile containing one `AI` select policy group.
- Candidate policies should be directly visible under `AI`.

## 注意事项

Surge 原生 `url-test` 只判断是否收到 HTTP 响应，无法可靠区分 ChatGPT 地区封锁和真实可用。这个模块会结合 Cloudflare trace、HTTP 状态码和响应内容进行更贴近真实使用的检测。

公开配置文件不包含个人订阅链接和 MITM 证书信息。请不要把自己的真实订阅链接、证书、密码提交到公开仓库。

## 更新记录

### v1.2.1

- 增加 `订阅获取时间`、`获取时间`、`更新时间`、`Subscription`、`Updated` 等订阅元信息过滤。
- 地区组不再通过国旗 emoji 匹配节点，降低把订阅提示误识别为地区节点的概率。

### v1.2.0

- 简化为单一 `AI` 策略组。
- 使用 CFGPT 思路加入 Cloudflare `cdn-cgi/trace` 地区预筛。
- 使用 `chatgpt.com/backend-api/models` 做真实可用性确认。
- 增强订阅元信息过滤，排除套餐、流量、日期、官网、群组等伪节点。

### v1.1.0

- 支持自动切换 Surge `select` 策略组。
- 增加 OpenAI / Claude / Gemini 多组检测实验。

### v1.0.0

- 初版 AI 节点自动检测脚本。
