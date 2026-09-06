# GitHub 项目发现配置

此文档保存 ModelDock 的公开介绍与主题标签，供维护者设置 GitHub About 使用。`github-metadata.json` 是配置记录，**提交这个文件不会自动修改 GitHub 的 Topics**。

## 简介

Open-source AI API client & LLM playground | Compare models, tokens & costs | 多模型 API 管理与对比平台

## Topics（20 个）

```text
ai llm llm-tools llm-comparison multi-model ai-playground api-client api-testing token-usage cost-tracking openai claude gemini deepseek openrouter ollama lm-studio local-first self-hosted typescript
```

在仓库首页右侧 **About → 齿轮 → Topics** 中逐个添加，最后保存。优先填写 `llm-comparison`、`ai-playground`、`api-client`、`ollama`、`local-first`，它们分别描述用途和使用方式；其余标签覆盖已接入的平台与技术。

## 文案中的搜索意图

| English | 中文 | 对应内容 |
| --- | --- | --- |
| AI API client / API testing | AI API 客户端、接口调试 | 服务商管理、连接测试、Playground |
| LLM playground / multi-model comparison | 大模型调试、多模型对比 | 同题并行请求、回答与延迟对照 |
| Token usage / cost tracking | Token 用量、调用成本 | 本地用量记录与费用估算 |
| Local LLM / Ollama / LM Studio | 本地大模型 | 本机服务接入 |

这些词已自然融入中英文 README 的标题、简介和功能说明；不使用尚未实现的 RAG、PDF、Agent、MCP 或团队功能作为当前功能标签。

## 后续传播

- 分享仓库链接时配真实界面截图，并说明“不需要密钥也能本地体验演示模式”。
- 有真实 API 体验后，补充可复现的对比案例，标明模型版本、日期和参数，避免把 Demo 数据作为测评。
- 定期整理用户遇到的连接问题，优先修复安装和第一次调用体验。
- 在适合的开发者社区分享项目；遵守社区规则，不批量发帖、刷 Star 或重复发布无内容更新。
- 发布记录应对应真实功能变更；目前的演示网址是私人实例，不应当作所有人可访问的公共 Demo 宣传。

GitHub 默认仓库搜索匹配名称、简介和主题标签；搜索 README 可使用 `in:readme`。标签帮助分类与查找，但不保证推荐、排名或流量。

依据：[GitHub 仓库主题说明](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)、[仓库搜索语法](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)。
