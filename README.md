# agy-hud: Real-Time HUD Statusline for Google Antigravity CLI

[English](README.md) | [简体中文](README.zh-CN.md)

`agy-hud` is a high-performance, real-time Heads-Up Display (HUD) statusline plugin tailored for Google Antigravity (`agy`) CLI.

It provides instant situational awareness directly inside your terminal, showing model context usage, recent tool activities, subagent tracking, todo progress, and git status.

```text
[Gemini 3.7 Flash] │ agy-hud git:(main*) [↑1] │ Context █████░░░░░ 45% (45k/1.0M)
◐ Edit: layout.ts │ ✓ Read: package.json ×3 │ ✓ Grep: "statusLine" ×2 │ ◐ Agent [Researcher]
▸ Tasks [2/5] (40%) │ Usage ██░░░░░░░░ 28% │ Time 1m 30s
```

---

## 🌟 Key Features

- **📊 Context & Token Meter**: Visual gradient bar (green → yellow → red) tracking token capacity with zero guessing.
- **⚡ High-Performance Transcript Engine**: Fast tail-chunk reverse scanner (reads last 64KB~128KB in < 5ms) with a 15ms safety circuit breaker.
- **🛠️ Real-Time Tool Activity**: Shows recent file reads, edits, greps, and commands as they happen.
- **🤖 Subagents & Task Tracking**: Monitor background subagent roles, state, and planned todo milestones.
- **🌿 Git & VCS Integration**: Zero-subprocess fast branch & dirty status reader with ahead/behind counts.
- **🎛️ Interactive TUI Wizard**: Guided setup (`setup`) and visual configurator (`configure`) with live terminal preview.
- **🌐 Multilingual**: Built-in English, Simplified Chinese (`zh-Hans`), and Traditional Chinese (`zh-Hant`).
- **📦 Zero Runtime Dependencies**: Pre-bundled with `esbuild` into a single standalone file (`dist/agy-hud.js`).

---

## 🚀 Quick Start

### 1. Installation

Download and install the release archive:

```sh
curl -fsSL -o agy-hud.tar.gz https://github.com/AllenMuu/agy-hud/releases/latest/download/agy-hud.tar.gz
mkdir -p agy-hud && tar -xzf agy-hud.tar.gz -C agy-hud
agy plugin install ./agy-hud
```

### 2. Enable StatusLine

Enable the HUD inside Antigravity CLI by running:

```text
/statusline ~/.gemini/config/plugins/agy-hud/hooks/status-line.sh
```

### 3. Interactive Configuration

To customize presets and feature toggles interactively:

```bash
agy agy-hud:configure
# or from terminal
node ~/.gemini/config/plugins/agy-hud/dist/agy-hud.js configure
```

---

## 🎛️ Presets

| Preset | Lines | Display Elements |
|---|---|---|
| **Full** | 3-4 lines | Model Badge, Workspace, Git, Context Bar, Recent Tools, Subagents, Tasks/Todos, Quota, Duration |
| **Essential** | 2 lines | Model Badge, Workspace, Git, Context Bar, Recent Tool Activities & Subagents |
| **Minimal** | 1 line | Model Badge and Context Bar only |

---

## 🩺 Diagnostics

To verify system environment, transcript latency, and statusline health:

```bash
node ~/.gemini/config/plugins/agy-hud/dist/agy-hud.js doctor
```

---

## 📄 License

MIT License © 2026 Allen Muu
