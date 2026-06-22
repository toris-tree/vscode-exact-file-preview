# VS Code Exact File Preview

> Preview the exact selected file in VS Code — no server, no framework guessing, no setup.

A tiny, free VS Code extension. Open any HTML, SVG, Markdown, JSON, XML, or text file
and see it exactly as it is in a sandboxed side panel. Works before your project toolchain
is set up. No Live Server required.

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/toris-tree.vscode-exact-file-preview?label=VS%20Code%20Marketplace&color=0ea5e9)](https://marketplace.visualstudio.com/items?itemName=toris-tree.vscode-exact-file-preview)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**[📦 Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=toris-tree.vscode-exact-file-preview)**
· [Report a bug](https://github.com/toris-tree/vscode-exact-file-preview/issues/new?labels=bug&template=bug.md)
· [Request a feature](https://github.com/toris-tree/vscode-exact-file-preview/issues/new?labels=enhancement)

---

## Quick start

**Option A — one click (recommended):**

1. Open VS Code → press `Ctrl+P` → paste:
   ```
   ext install toris-tree.vscode-exact-file-preview
   ```
   Or [open the Marketplace page](https://marketplace.visualstudio.com/items?itemName=toris-tree.vscode-exact-file-preview) and click **Install**.

**Option B — manual `.vsix`:**

1. [Download the `.vsix`](https://github.com/toris-tree/vscode-exact-file-preview/releases/latest) from the latest release.
2. In VS Code: **Extensions** → `...` menu → **Install from VSIX…**

Then open any supported file and run **Exact File Preview: Open Preview** from the Command Palette.

No account, no config, no server to start.

---

## Why not Live Server?

| | Exact File Preview | Live Server |
|---|---|---|
| Requires project setup | No | Often (routing, config) |
| Starts a local server | No | Yes (port 5500 by default) |
| Previews the exact file | Yes | Maybe (URL routing can differ) |
| Works before toolchain exists | Yes | Depends |
| Executes scripts in previewed file | No (sandboxed) | Yes |
| Framework assumptions | None | None by default |

Use this extension when you want to **see exactly what the file contains**, not what a
dev server decides to serve.

---

## What it does

- Adds one command: **Exact File Preview: Open Preview**
- Available from the Command Palette, editor title bar, or right-click menu in the
  editor and file explorer
- Opens a preview panel beside the editor with a banner: `LOCAL EXACT PREVIEW · <filename>`

## Supported file types

| Extension | Rendered as |
|-----------|-------------|
| `.html` | the page itself, in a fully sandboxed `<iframe>` (scripts blocked) |
| `.svg` | the image, via a `data:` `<img>` (scripts blocked) |
| `.md` | a basic, safe Markdown render |
| `.json` | pretty-printed, escaped text |
| `.xml` | escaped text |
| `.txt` | escaped text |

Any other file type shows a clear **"Unsupported file type"** message.
Files over 2 MB are refused with a readable error instead of freezing the panel.

## Safety model

- **No server.** Nothing starts, nothing listens on a port.
- **No network.** CSP is `default-src 'none'`; only inline styles and `data:` URIs allowed.
- **No script execution.** HTML/SVG are isolated in `sandbox=""` iframe / `<img>`, so
  scripts in the previewed file never run.
- **No file mutation.** All file I/O is read-only.

Verified: every preview type was rendered in a real Chromium browser; embedded scripts
confirmed NOT to execute.

---

## Privacy

Runs entirely on-device. No account, no telemetry, no network calls. See [PRIVACY.md](PRIVACY.md).

---

## Get involved

- **Found a bug?** [Open an issue](https://github.com/toris-tree/vscode-exact-file-preview/issues/new?labels=bug) — include VS Code version, OS, file type, and what you expected vs. what happened.
- **Want a feature?** [Open a feature request](https://github.com/toris-tree/vscode-exact-file-preview/issues/new?labels=enhancement) — especially if you need support for additional file types or custom rendering behavior.
- **Need a custom build or enterprise use?** [Open an issue labelled `commercial`](https://github.com/toris-tree/vscode-exact-file-preview/issues/new?labels=commercial&title=Custom+build+inquiry) and describe your use case.
- **If this saved you time**, a ⭐ on the repo helps others discover it.

---

## Development

```bash
npm test       # core + command-flow tests
npm run check  # syntax check
```

Status: packaged beta. Automated tests pass and every preview type was verified by rendering
the exact webview HTML in a real Chromium browser.
