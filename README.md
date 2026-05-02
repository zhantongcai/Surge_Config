# Surge Config

Surge 配置模板与 AI 节点自动优选模块。

## 中文使用说明

完整使用说明见：

[USAGE.zh-CN.md](./USAGE.zh-CN.md)

## GitHub 自动更新链接

仓库主页：

[https://github.com/zhantongcai/Surge_Config](https://github.com/zhantongcai/Surge_Config)

### 配置文件

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/Steve_WgetCloud_AI_Smart.conf
```

### iOS 模块

推荐使用带版本号的 iOS 模块地址：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect-iOS-v1.2.5.sgmodule
```

固定版本地址：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/32ceaf1/AI-Health-AutoSelect-iOS-v1.2.5.sgmodule
```

### Mac 模块

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect.sgmodule
```

注意：公开配置文件是脱敏模板，订阅链接位置是 `输入你的订阅链接`。如果用公开配置做自动更新，本地私人订阅链接可能需要重新填入；不要把私人订阅链接提交到公开仓库。

## 文件说明

- `Steve_WgetCloud_AI_Smart.conf`：已脱敏的 Surge 配置模板。使用前只需要把 `AllServer` 里的 `输入你的订阅链接` 替换成自己的订阅链接。
- `AI-Health-AutoSelect.sgmodule`：Surge Mac 模块入口。
- `AI-Health-AutoSelect-iOS.sgmodule`：Surge iOS 专用模块入口。
- `ai-health-autoselect.js`：模块使用的定时检测脚本。

## 模块版本

- 当前版本：`v1.2.6`
- 适用目标：单一 `AI` 策略组
- 检测标准：以 ChatGPT / OpenAI 网页可用性为准

## 导入地址 Mac

在 Surge Mac 的模块页面中选择“从 URL 安装模块”，填入：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect.sgmodule
```

## 导入地址 iOS

在 Surge iOS 的模块页面中选择“从 URL 安装模块”，填入：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect-iOS-v1.2.5.sgmodule
```

iOS 也保留通用模块地址 `AI-Health-AutoSelect-iOS.sgmodule`，但如果 CDN 缓存没有刷新，优先使用带版本号的模块地址。

Mac 模块会加载 `main` 分支脚本，用于 6 小时定时检测：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/ai-health-autoselect.js
```

iOS 模块会加载 `main` 分支脚本，用于共享定时检测和面板手动检测逻辑：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/ai-health-autoselect.js
```

## 使用步骤

1. 导入 `Steve_WgetCloud_AI_Smart.conf`。
2. 将 `AllServer` 策略组里的 `输入你的订阅链接` 替换为自己的 Surge 订阅链接。
3. 确认配置里存在一个名为 `AI` 的 `select` 策略组。
4. 在 Surge 中安装 `AI-Health-AutoSelect.sgmodule`。
5. 启用模块并应用配置。
6. 脚本会每 6 小时自动检测并切换 `AI` 组的最优节点。

### iOS 使用步骤

1. 先在 iOS Surge 中导入并启用 `Steve_WgetCloud_AI_Smart.conf`。
2. 将 `AllServer` 策略组里的 `输入你的订阅链接` 替换为自己的订阅链接，或使用你已经在 Mac 上验证过的个人配置。
3. 确认策略组里存在名为 `AI` 的 `select` 组，且里面能看到候选节点。
4. 从 URL 安装 `AI-Health-AutoSelect-iOS.sgmodule`。
5. 启用模块，保存并应用配置。
6. 保持 Surge 运行。iOS 后台执行受系统限制，定时任务可能不会像 Mac 一样稳定准点；打开 Surge 或网络活跃时更容易触发。

### 手动触发

- Mac：官方 `Information Panel` 文档标注为 iOS Only，因此 Mac 不使用 `[Panel]` 手动刷新。Mac 端请在脚本页面手动运行，或使用 Surge Mac CLI：

```sh
/Applications/Surge.app/Contents/Applications/surge-cli script evaluate /path/to/ai-health-autoselect.js cron 90
```

- iOS：安装 iOS 专版模块后，在 Surge 面板里找到 `AI Health`，点击右上角刷新按钮即可手动检测并自动切换；也可以进入脚本列表长按 `ai-health-autoselect` 运行，或通过系统 Shortcuts 调用 Surge 脚本。

## 工作原理

脚本每 6 小时运行一次。它会读取单一 `AI` 策略组中的候选节点，然后：

1. Reads candidates from `AI`, `United States`, `Japan`, `Singapore`, `Taiwan`, `United Kingdom`, and `Korea`.
2. Switches `AI` to each candidate.
3. Checks `http://chat.openai.com/cdn-cgi/trace` for Cloudflare `loc`.
4. Skips unsupported ChatGPT regions.
5. Treats the candidate as usable if `loc` is in OpenAI supported countries/regions.
6. Selects the fastest usable candidate.

中文解释：

- 先逐个切换 `AI` 组里的候选节点。
- 候选节点至少来自美国、日本、新加坡、台湾、英国、韩国这 6 个地区组。
- `AI` 组会自动引用主订阅节点组 `AllServer`，不需要重复填写订阅链接。
- 先访问 `http://chat.openai.com/cdn-cgi/trace`，读取 Cloudflare 判断出的出口地区 `loc`。
- 如果地区不在 ChatGPT 支持列表内，直接跳过。
- 只要出口地区在 OpenAI 支持列表内，就加入可用候选。
- 排除网络错误、超时、无法获取出口地区、出口地区不在 OpenAI 支持列表内的节点。
- 从可用节点中选择延迟最低的一个。

判断标准：

- `cdn-cgi/trace` 能返回 `loc`。
- `loc` 在 OpenAI 支持国家/地区列表内。
- 在可用候选中按 trace 延迟选择最快节点。

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

### v1.2.6

- 更正 Mac 手动触发说明：官方 `Information Panel` 文档标注为 iOS Only，Mac 模块不再声明 `[Panel]`。
- Mac 仍保留 6 小时自动检测；手动触发建议使用脚本页面或 Surge Mac CLI。

### v1.2.5

- 修复误判：不再使用 `chatgpt.com/backend-api/models` 作为二次硬检测，避免未登录、Cloudflare 或风控导致可用节点被误判不可用。
- 判断逻辑改为 CFGPT 思路：以 `chat.openai.com/cdn-cgi/trace` 返回的出口 `loc` 是否在 OpenAI 支持列表内为准。
- 补齐 ChatGPT 规则依赖：`auth0.com`、`arkoselabs`、`statsig`、`intercom`、`stripe`、`sentry`、`livekit`、`oaistatic`、`oaiusercontent` 等统一走 `AI`。
- 将 AI 规则提前到广告/拒绝规则之前，避免远程 reject 规则误拦截 `events.statsigapi.net`、`bzr.openai.com` 等 OpenAI 依赖域名。
- 补充 `chatgpt.com`、`oaistatic.com`、`oaiusercontent.com`、`auth0.com` 的 DNS 指定，降低依赖域名被本地/国内 DNS 解析干扰的概率。
- 补齐 Claude、Gemini、Perplexity、Midjourney、Poe、OpenRouter、Grok、Meta AI、Dify、Jasper、Clipdrop、JetBrains AI、Hugging Face 等主流 AI 服务规则。
- 增加 iOS 带版本号模块 `AI-Health-AutoSelect-iOS-v1.2.5.sgmodule`。

### v1.2.4

- 脚本候选来源扩展为 `AI`、`United States`、`Japan`、`Singapore`、`Taiwan`、`United Kingdom`、`Korea`。
- 配置模板补充 `United Kingdom` 和 `Korea` 两个地区节点组。
- Mac 模块也改为加载 `@main` 脚本，确保和 iOS 共享最新检测逻辑。
- 增加 iOS 带版本号模块 `AI-Health-AutoSelect-iOS-v1.2.4.sgmodule`，避免 jsDelivr `@main` 旧缓存影响安装。

### v1.2.3

- iOS 专版增加 `AI Health` 面板，点击面板刷新按钮即可手动运行检测。
- 面板会展示上次检测时间、当前选中的 AI 节点、出口地区、状态码、延迟和前几条候选节点结果。
- iOS 专版模块改为从 `@main` 加载脚本，方便面板与定时任务共享同一份最新逻辑。
- iOS 模块头补充中文名称、版本号和完整功能介绍，方便在 Surge 模块列表里识别。

### v1.2.2

- 将 Mac 和 iOS 模块自动检测频率从每 10 分钟调整为每 6 小时一次。
- 补充手动触发说明：iOS 可长按脚本或使用系统 Shortcuts 运行。

### v1.2.1

- 增加 iOS 专用模块 `AI-Health-AutoSelect-iOS.sgmodule`，使用官方 `#!requirement=SYSTEM = 'iOS'` 平台限制。
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
