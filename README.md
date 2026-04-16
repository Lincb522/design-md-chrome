# TypeUI DESIGN.md Extractor (Chrome Extension) - 汉化版

> **注意：此项目为进阶中文本地化版本**
>
> 我们不仅全面支持了基于官方 `i18n` 的中英文自动切换，还在最新版本完美介入了底层 File System Access API。
> 现在不仅支持原生 `DESIGN.md` 和 `SKILL.md`，更**史诗级支持了将近 14 种主流 AI IDE / CLI 工具的全局系统级配置文件（如 `.geminirules`、`.cursorrules`、`.clinerules` 等）的无痛一键导出**！

This Chrome extension extract styles and information from any given site and generates a `DESIGN.md` or `SKILL.md` file that you can use with tools such as Google Stitch, Claude Code, Codex, and others to build websites with a given design system blueprint. The file is based on the open-source [TypeUI DESIGN.md](https://www.typeui.sh/design-md) format.

<img width="1280" height="800" alt="screenshot" src="https://github.com/user-attachments/assets/a8f307ed-8c8e-43c4-b3b8-bcfea5874c17" />

## Getting started

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this project folder

## Curated design skills

Check out curated design systems at [typeui.sh/design-skills](https://www.typeui.sh/design-skills).

## Available actions

| Action | Description |
| --- | --- |
| Auto-extract | Reads styles from the active tab (typography, colors, spacing, radius, shadows, motion). |
| Generate `DESIGN.md` | Produces design-system documentation markdown from extracted signals. |
| Generate `SKILL.md` | Produces agent-ready skill markdown from extracted signals. |
| Refresh | Re-runs extraction for the current page state. |
| Download | Saves generated output as `DESIGN.md` or `SKILL.md`. |
| Export for AI IDE | **[NEW]** An interactive dropdown menu seamlessly exports the design system explicitly named after rules required by AI IDEs (Supports `Gemini/Antigravity`, `Cursor`, `Windsurf`, `GitHub Copilot`, `RooCode/Cline`, `Claude Code`, `Trae`, `PearAI`, `Aider`, `Devin`, `MarsCode`, `Bolt.new`, `Continue.dev`, `v0` etc.) directly as hidden files (.dotfiles). |
| Explain (`?`) | Shows how the file was generated, with TypeUI reference. |

## Generated file structure

The generated markdown follows this structure:

| Section | What it does |
| --- | --- |
| `Mission` | Defines the design-system objective for the extracted site. |
| `Brand` | Captures product/brand context, URL, audience, and product surface. |
| `Style Foundations` | Lists inferred visual tokens and foundations. |
| `Accessibility` | Applies WCAG 2.2 AA requirements and interaction constraints. |
| `Writing Tone` | Sets guidance tone for implementation-ready output. |
| `Rules: Do` | Lists required implementation practices. |
| `Rules: Don't` | Lists anti-patterns and prohibited behavior. |
| `Guideline Authoring Workflow` | Defines ordered guideline authoring steps. |
| `Required Output Structure` | Enforces consistent output sections. |
| `Component Rule Expectations` | Defines required interaction/state details. |
| `Quality Gates` | Adds testable quality and consistency checks. |

## Local development

Run tests locally:

```bash
node tests/run-tests.mjs
```

## License

This project is open-source under the MIT License.
