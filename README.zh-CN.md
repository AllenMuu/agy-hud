# agy-hud: Google Antigravity CLI 实时终端 HUD 状态行插件

[![npm version](https://img.shields.io/npm/v/@allenmuu/agy-hud.svg?style=flat-square)](https://www.npmjs.com/package/@allenmuu/agy-hud)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org)

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

### 1. 一键安装 (推荐)

无需手动下载压缩包或配置，在终端直接执行：

```bash
npx @allenmuu/agy-hud install
```
> 或执行 `npx @allenmuu/agy-hud`。安装程序会自动部署插件文件、初始化配置文件并为 Antigravity CLI 注册 HUD 状态行。

如果你更喜欢全局安装：
```bash
npm install -g @allenmuu/agy-hud
agy-hud setup
```

### 2. 生效与使用

- 如果你的 Antigravity CLI 尚未启动，直接运行 `agy` 即可看到全新的 HUD 状态行。
- 若 Antigravity 已在运行中，可在会话内运行以下命令立即刷新：
```text
/statusline ~/.gemini/config/plugins/agy-hud/hooks/status-line.sh
```

### 3. 自定义配置

随时调整预设模式、语言与展示组件：

```bash
npx @allenmuu/agy-hud configure
# 或在 Antigravity 会话内直接运行：
agy agy-hud:configure
```

---

### 📦 备选：手动归档包安装

若不使用 npm / npx，也可以通过 Release 压缩包手动安装：

```sh
curl -fsSL -o agy-hud.tar.gz https://github.com/AllenMuu/agy-hud/releases/latest/download/agy-hud.tar.gz
mkdir -p agy-hud && tar -xzf agy-hud.tar.gz -C agy-hud
agy plugin install ./agy-hud
```

---

## 🎛️ 预设模式

| 预设模式 | 行数 | 展示组件 |
|---|---|---|
| **Full (全功能)** | 3-4 行 | 模型徽标、项目路径、Git 状态、上下文条、近期工具操作、子代理状态、任务进度、用量与耗时 |
| **Essential (核心)** | 2 行 | 模型徽标、项目路径、Git 状态、上下文条、近期工具操作与子代理 |
| **Minimal (极简)** | 1 行 | 仅展示模型徽标与上下文进度条 |

---

## 🩺 健康诊断与环境自检

自检当前 Node.js 环境、插件文件部署、Antigravity 状态行注册及日志读取延迟：

```bash
npx @allenmuu/agy-hud doctor
# 或在 Antigravity 会话内直接运行：
agy agy-hud:doctor
```

---

## ⌨️ CLI 常用指令速查

| 指令 | 说明 |
|---|---|
| `npx @allenmuu/agy-hud` | 打开交互式终端管理面板（包含安装、配置、诊断、预览及卸载） |
| `npx @allenmuu/agy-hud install` | 极速一键安装插件并自动注册 `statusLine` 到 Antigravity `settings.json` |
| `npx @allenmuu/agy-hud configure` | 交互式配置向导（切换 Full/Essential/Minimal 预设、语言及组件开关） |
| `npx @allenmuu/agy-hud doctor` | 运行系统环境、插件部署与状态行健康自检 |
| `npx @allenmuu/agy-hud preview` | 在终端实时预览当前配置的 HUD 样式 |
| `npx @allenmuu/agy-hud update-quota` | 同步模型限额缓存（支持管道输入或直接粘贴 `/usage` 输出文本） |
| `npx @allenmuu/agy-hud quota` | 查看当前缓存的模型限额与重置倒计时 |
| `npx @allenmuu/agy-hud uninstall` | 干净卸载插件并从 `settings.json` 注销状态行 |

---

## 📊 同步模型用量与限额 (Quota)

在 Antigravity CLI 中执行 `/usage` 命令后，将输出文本同步给 `agy-hud` 即可实时显示 5 小时与周限额进度条：

```bash
npx @allenmuu/agy-hud update-quota "<粘贴 /usage 输出文本>"
```

---

## 📄 开源协议

MIT License © 2026 Allen Muu
