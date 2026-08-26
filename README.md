# agy-hud: Real-Time HUD Statusline for Google Antigravity CLI

[![npm version](https://img.shields.io/npm/v/@allenmuu/agy-hud.svg?style=flat-square)](https://www.npmjs.com/package/@allenmuu/agy-hud)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org)

[English](README.md) | [简体中文](README.zh-CN.md)

`agy-hud` is a high-performance, real-time Heads-Up Display (HUD) statusline plugin tailored for Google Antigravity (`agy`) CLI.

It provides instant situational awareness directly inside your terminal, showing model context usage, recent tool activities, subagent tracking, todo progress, and git status.

```text
[Gemini 3.7 Flash] │ agy-hud git:(main*) [↑1] │ Context █████░░░░░ 45% (45k/1.0M)
◐ Edit: layout.ts │ ✓ Read: package.json ×3 │ ✓ Grep: "statusLine" ×2 │ ◐ Agent [Researcher]
▸ Tasks [2/5] (40%) │ 5h █████░ 77% rem. (2h 15m) │ Wk ██████ 96% rem. │ Time 1m 30s
```

---

## 🌟 Key Features

- **📊 Dynamic Context & Multi-Model Rate Limits**: Visual token meter plus automated switching between Gemini and Claude/GPT 5-hour and weekly quotas with reset countdowns.
- **⚡ High-Performance Transcript Engine**: Fast tail-chunk reverse scanner (reads last 64KB~128KB in < 5ms) with a 15ms safety circuit breaker.
- **🛠️ Real-Time Tool Activity**: Shows recent file reads, edits, greps, and commands as they happen.
- **🤖 Subagents & Task Tracking**: Monitor background subagent roles, state, and planned todo milestones.
- **🌿 Git & VCS Integration**: Zero-subprocess fast branch & dirty status reader with ahead/behind counts.
- **🎛️ Interactive TUI Wizard**: Guided setup (`setup`) and visual configurator (`configure`) with live terminal preview.
- **🌐 Multilingual**: Built-in English, Simplified Chinese (`zh-Hans`), and Traditional Chinese (`zh-Hant`).
- **📦 Zero Runtime Dependencies**: Pre-bundled with `esbuild` into a single standalone file (`dist/agy-hud.js`).

---

## 🚀 Quick Start
 
### 1. One-Click Installation (Recommended)

No need to manually download archives or edit config files. Simply run:

```bash
npx @allenmuu/agy-hud install
```
> Or run `npx @allenmuu/agy-hud`. The installer deploys the plugin bundle, creates default configs, and automatically registers the statusLine in Antigravity CLI settings.

If you prefer a global npm install:
```bash
npm install -g @allenmuu/agy-hud
agy-hud setup
```

### 2. Activation

- If Antigravity CLI is not yet running, simply start `agy` to enjoy the real-time HUD!
- If Antigravity CLI is already open, run this slash command to activate immediately:
```text
/statusline ~/.gemini/config/plugins/agy-hud/hooks/status-line.sh
```

### 3. Interactive Configuration

Customize presets (Full / Essential / Minimal), language, and feature toggles anytime:

```bash
npx @allenmuu/agy-hud configure
# or from inside Antigravity CLI:
agy agy-hud:configure
```

---

### 4. Uninstallation

To cleanly remove `agy-hud` and deregister the statusline from Antigravity:

```bash
# Clean uninstall (removes statusline hook & plugin files, preserves config)
npx @allenmuu/agy-hud uninstall

# Complete purge (removes plugin files, config, and quota cache)
npx @allenmuu/agy-hud uninstall --purge

# Or from inside Antigravity CLI:
agy agy-hud:uninstall
```

---

### 📦 Alternative: Manual Archive Install

If not using npm/npx, you can download the release archive:

```sh
curl -fsSL -o agy-hud.tar.gz https://github.com/AllenMuu/agy-hud/releases/latest/download/agy-hud.tar.gz
mkdir -p agy-hud && tar -xzf agy-hud.tar.gz -C agy-hud
agy plugin install ./agy-hud
```

---

## 🎛️ Presets

| Preset | Lines | Display Elements |
|---|---|---|
| **Full** | 3-4 lines | Model Badge, Workspace, Git, Context Bar, Recent Tools, Subagents, Tasks/Todos, Quota, Duration |
| **Essential** | 2 lines | Model Badge, Workspace, Git, Context Bar, Recent Tool Activities & Subagents |
| **Minimal** | 1 line | Model Badge and Context Bar only |

---

## 🩺 Diagnostics & Health Check

To verify Node.js version, plugin deployment, Antigravity settings registration, and transcript tail scan latency:

```bash
npx @allenmuu/agy-hud doctor
# or inside Antigravity CLI:
agy agy-hud:doctor
```

---

## ⌨️ CLI Commands Cheatsheet

| Command | Description |
|---|---|
| `npx @allenmuu/agy-hud` | Launch interactive terminal management menu |
| `npx @allenmuu/agy-hud install` | One-click install and register statusline in `settings.json` |
| `npx @allenmuu/agy-hud configure` | Visual configurator for presets, language, and components |
| `npx @allenmuu/agy-hud doctor` | Run environment and statusline health diagnostics |
| `npx @allenmuu/agy-hud preview` | Render live preview of HUD statusline in terminal |
| `npx @allenmuu/agy-hud update-quota` | Update quota cache from `/usage` output text |
| `npx @allenmuu/agy-hud quota` | Inspect current cached multi-model rate limits |
| `npx @allenmuu/agy-hud uninstall` | Cleanly remove plugin and deregister statusline (`--purge` to remove config) |

---

## 📊 Multi-Model Quota Synchronization

When you run `/usage` inside Antigravity CLI, pipe or paste the output into `agy-hud` to enable real-time 5-hour & weekly rate limit progress meters:

```bash
npx @allenmuu/agy-hud update-quota "<paste /usage output text>"
```

---

## 📄 License

MIT License © 2026 Allen Muu
