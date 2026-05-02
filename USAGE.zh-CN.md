# Surge 配置与 AI 模块使用说明

这个仓库提供一份脱敏 Surge 配置模板，以及一个用于 AI 节点自动优选的 Surge 模块。

## 直接链接

### 配置文件

Surge 自动更新配置文件建议使用 GitHub Raw 地址：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/Steve_WgetCloud_AI_Smart.conf
```

备用 CDN 地址：

```text
https://cdn.jsdelivr.net/gh/zhantongcai/Surge_Config@main/Steve_WgetCloud_AI_Smart.conf
```

注意：公开配置文件是脱敏模板，里面的订阅链接位置是 `输入你的订阅链接`。如果直接用这个地址自动更新，更新后仍然需要在本地替换成自己的订阅链接。不要把私人订阅链接提交到公开仓库。

### iOS 模块

iOS 推荐安装带版本号的模块，避免 CDN 或 Surge 本地缓存继续使用旧模块：

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

## iOS 安装步骤

1. 在 Surge iOS 中导入配置文件。
2. 把 `AllServer` 策略组里的 `输入你的订阅链接` 替换为自己的订阅链接。
3. 确认策略组里有 `AI` 组。
4. 从 URL 安装 iOS 模块 `AI-Health-AutoSelect-iOS-v1.2.5.sgmodule`。
5. 启用模块并应用配置。
6. 在 Surge 面板里找到 `AI Health`，点击刷新按钮即可手动检测。

## 模块功能

- 版本：`v1.2.5`
- 自动检测频率：每 6 小时一次
- 手动检测：iOS 面板 `AI Health` 点击刷新按钮
- 候选来源：`AI`、`United States`、`Japan`、`Singapore`、`Taiwan`、`United Kingdom`、`Korea`
- 订阅来源：`AI` 组自动引用主订阅节点组 `AllServer`，不需要重复填写订阅链接
- 检测方式：访问 `chat.openai.com/cdn-cgi/trace` 判断出口地区，只要出口地区在 OpenAI 支持列表内即视为可用
- 选择逻辑：自动切换 `AI` 组到最快的可用节点

## 常见问题

### 为什么 iOS 没更新？

优先检查你安装的 URL。旧的 `@main/AI-Health-AutoSelect-iOS.sgmodule` 可能被 CDN 或 Surge 缓存。建议改用带版本号的 iOS 模块：

```text
https://raw.githubusercontent.com/zhantongcai/Surge_Config/main/AI-Health-AutoSelect-iOS-v1.2.5.sgmodule
```

### 会测试全部节点吗？

不会。脚本会从 `AI` 和 6 个 AI 常用地区组收集候选节点，再过滤订阅元信息、套餐信息、更新时间等伪节点。

### 为什么公开配置不能直接放私人订阅？

这个仓库是公开的。私人订阅链接、MITM 证书、密码都不能提交到仓库。公开配置只在 `AllServer` 保留 `输入你的订阅链接` 占位符，`AI` 会自动引用 `AllServer`。
