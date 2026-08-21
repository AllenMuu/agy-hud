# agy-hud: Google Antigravity CLI 实时终端 HUD 状态行插件

[English](README.md) | [简体中文](README.zh-CN.md)

`agy-hud` 是专为 Google Antigravity (`agy`) CLI 打造的高性能、实时 Heads-Up Display (HUD) 状态行插件。

直接在终端输入框下方呈现直观的任务进度、上下文消耗、近期工具操作、子代理状态及 Git 指标：

```text
[Gemini 3.7 Flash] │ agy-hud git:(main*) [↑1] │ 上下文 █████░░░░░ 45% (45k/1.0M)
◐ Edit: layout.ts │ ✓ Read: package.json ×3 │ ✓ Grep: "statusLine" ×2 │ ◐ 子代理 [Researcher]
▸ 任务 [2/5] (40%) │ 5h █████░ 77%余 (2h 15m) │ 周 ██████ 96%余 │ 耗时 1m 30s
```

---

## 🌟 核心特性

- **📊 动态上下文与模型限额**：实时跟踪 Token 容量，并根据当前模型组（Gemini 模型 / Claude & GPT 模型）自动切换展示 5 小时限额与周限额及重置倒计时。
- **⚡ 高性能日志解析引擎**：采用尾部块倒序扫描（仅读取最后 64KB~128KB，毫秒级响应），附带 15ms 安全熔断保护。
- **🛠️ 实时工具活动追踪**：直观展示 Agent 正在进行的编辑、读取、搜索或终端执行。
- **🤖 子代理与后台任务监控**：实时感知运行中的 subagent 角色、耗时与 Todo 任务完成度。
- **🌿 Git / Jujutsu 仓库感知**：零进程快速解析 Git 分支、Dirty 状态 (`*`) 与 Ahead/Behind 计数。
- **🎛️ 交互式配置向导**：提供引导式 `setup` 与交互式 `configure` TUI，实时预览效果。
- **🌐 原生中英文多语言**：内置简体中文 (`zh-Hans`)、繁体中文 (`zh-Hant`) 与英文 (`en`)。
- **📦 零运行时依赖**：通过 `esbuild` 预打包为单文件 `dist/agy-hud.js`，无需安装任何额外 npm 包。

---

## 🚀 快速上手

### 1. 安装

下载最新版本归档包并安装：

```sh
curl -fsSL -o agy-hud.tar.gz https://github.com/AllenMuu/agy-hud/releases/latest/download/agy-hud.tar.gz
mkdir -p agy-hud && tar -xzf agy-hud.tar.gz -C agy-hud
agy plugin install ./agy-hud
```

### 2. 启用状态行

在 Antigravity CLI 中执行以下斜杠命令开启 HUD：

```text
/statusline ~/.gemini/config/plugins/agy-hud/hooks/status-line.sh
```

### 3. 交互式自定义配置

随时运行交互式配置命令调整预设与功能开关：

```bash
agy agy-hud:configure
# 或在终端直接运行：
node ~/.gemini/config/plugins/agy-hud/dist/agy-hud.js configure
```

---

## 🎛️ 预设模式

| 预设模式 | 行数 | 展示组件 |
|---|---|---|
| **Full (全功能)** | 3-4 行 | 模型徽标、项目路径、Git 状态、上下文条、近期工具操作、子代理状态、任务进度、用量与耗时 |
| **Essential (核心)** | 2 行 | 模型徽标、项目路径、Git 状态、上下文条、近期工具操作与子代理 |
| **Minimal (极简)** | 1 行 | 仅展示模型徽标与上下文进度条 |

---

## 🩺 健康诊断

自检当前 Node.js 环境、日志延迟及配置状态：

```bash
node ~/.gemini/config/plugins/agy-hud/dist/agy-hud.js doctor
```

---

## 📄 开源协议

MIT License © 2026 Allen Muu
