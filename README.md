# AI README Generator

> **The best AI README generator available inside VS Code — fast, free, accurate, and professional.**

![Version](https://img.shields.io/badge/Version-1.0.0-green?style=flat-square)
![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue?style=flat-square&logo=visualstudiocode)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

Generate professional, high-quality README files for your projects using AI (Gemini 2.0 Flash) — all within VS Code.

## ✨ Features

### 🚀 One-Click Generation
- Generate complete README with a single command
- **Sidebar panel** in Activity Bar for quick access
- Available from Command Palette or right-click context menu
- Keyboard shortcut: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### 📊 Sidebar Panel
- **Activity Bar icon** for instant access
- View project info, detected technologies at a glance
- Quick action buttons for Generate, History, Settings

### 🔍 Smart Project Analysis
- Automatically detects programming languages
- Identifies frameworks and libraries (React, Vue, Express, Django, etc.)
- Recognizes project type (Web App, Backend, Library, CLI, Mobile, etc.)
- Respects `.gitignore` and excludes sensitive files

### 📑 5 Professional Templates
| Template | Best For |
|----------|----------|
| 🌍 Open Source | Community projects with contribution focus |
| 📦 Library | npm packages, APIs, and SDKs |
| 🚀 Startup/SaaS | Product landing pages and marketing |
| 🎓 Academic | Research projects and coursework |
| 💼 Personal | Portfolio and personal projects |

### 📋 Customizable Sections
Toggle sections on/off:
- Title & Badges
- Description
- Features
- Installation
- Usage
- API Reference
- Contributing
- License
- And more...

### 🔄 Section-Wise Regeneration
Not happy with one section? Regenerate just that part without affecting the rest.

### 🌐 Language & Tone
- **Languages**: English, Simple English, Spanish, French, German, Chinese, Japanese, Hindi
- **Tones**: Professional, Friendly, Minimal, Technical

### 🏷️ Auto-Generated Badges
Automatic shields.io badges for:
- Language
- License
- Version
- TypeScript support
- And more...

### 🕒 History & Versioning
- All generated READMEs saved locally
- Rollback to any previous version
- Up to 20 versions retained

### 📊 Safe Diff Merging
- Side-by-side comparison before overwriting
- Uses VS Code's built-in diff viewer
- Never accidentally lose your existing README

### 📤 Export Options
- Markdown (.md)
- Plain Text (.txt)
- HTML (printable to PDF)

### 🔒 Privacy First
- **No telemetry**
- **No external data storage**
- API key stored securely using VS Code SecretStorage
- Your code never leaves your machine (except for API calls)

## 📦 Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "AI README Generator"
4. Click Install

## 🔑 Setup

1. Get a **free** Groq API key at [console.groq.com/keys](https://console.groq.com/keys)
2. Run command: `AI README: Set API Key` (or click "Set API Key" in the sidebar)
3. Paste your key (starts with `gsk_`) and press Enter

That's it! You're ready to generate READMEs.

## 💻 Usage

### Generate README for Current Workspace
```
Ctrl+Shift+P → "AI README: Generate README"
```

### Generate README for a Subfolder (Monorepo)
Right-click any folder → "Generate README for this folder"

### Keyboard Shortcut
`Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

## ⚙️ Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `ai-readme.defaultTemplate` | Default template | `openSource` |
| `ai-readme.defaultLanguage` | README language | `english` |
| `ai-readme.defaultTone` | Writing tone | `professional` |
| `ai-readme.enableBadges` | Include badges | `true` |

## 🤖 AI Model

This extension uses **Gemini 2.0 Flash** via Groq API:
- Model: `gemini-2.0-flash-exp`
- Provider: Groq
- Cost: **Free** (Fast inference)

## 📋 Commands

Access all commands by opening the **Command Palette** (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on Mac) and typing `AI README`:

| Command | Description |
|---------|-------------|
| `AI README: Generate README` | Open generator UI |
| `AI README: Set API Key` | Configure Groq API key |
| `AI README: View README History` | Browse and restore versions |
| `AI README: Export README` | Export to different formats |

## 🛡️ Privacy & Security

- ✅ No telemetry or analytics
- ✅ No external data storage
- ✅ API key encrypted with VS Code SecretStorage
- ✅ Code analysis happens locally
- ✅ Only README prompts sent to Groq API
- ✅ Complies with VS Code Marketplace policies

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ for developers who value great documentation.**
