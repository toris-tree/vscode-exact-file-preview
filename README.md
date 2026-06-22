# Exact File Preview

Preview the exact selected file in VS Code without starting a server or guessing your framework.

A tiny, free VS Code extension. It opens the currently selected file in a
sandboxed side panel and shows it **exactly as it is** — no Live Server, no
framework detection, no URL rewriting, no routing assumptions, no project setup.

Status: packaged beta. Automated tests pass (`npm test`) and every preview type
was verified by rendering the exact webview output in a real Chromium browser,
confirming HTML/SVG render correctly and that embedded scripts do **not** execute.

## What it does

- Adds one command: **Exact File Preview: Open Preview**.
- Run it from the Command Palette, the editor title bar, or the right-click menu
  in the editor / file explorer (for supported files).
- Opens a preview beside your editor with a banner: `LOCAL EXACT PREVIEW · <file name>`.

## Supported file types (beta)

| Extension | Rendered as                                              |
| --------- | ------------------------------------------------------- |
| `.html`   | the page itself, in a fully sandboxed `<iframe>` (no JS) |
| `.svg`    | the image, via a `data:` `<img>` (no JS)                |
| `.md`     | a basic, safe Markdown render                           |
| `.json`   | pretty-printed, escaped text                            |
| `.xml`    | escaped text                                            |
| `.txt`    | escaped text                                            |

Any other file type shows a clear **"Unsupported file type"** message.

## Safety model

- **No server.** Nothing is started or listened on.
- **No network.** The webview's Content-Security-Policy is `default-src 'none'`;
  only inline styles, `data:` images, and `data:` frames are allowed.
- **No code execution.** HTML and SVG are isolated in a `sandbox=""` iframe / an
  `<img>`, so scripts in the previewed file never run. The webview itself has
  scripting disabled.
- **No file mutation.** Files are read-only; nothing is ever written back.
- **Large files** (over 2 MB) are refused with a readable message instead of
  freezing the preview.

## Install (beta)

From the `.vsix`:

1. Download `vscode-exact-file-preview-0.1.0.vsix` from the release.
2. In VS Code: **Extensions** view → `...` menu → **Install from VSIX…**, or run
   `code --install-extension vscode-exact-file-preview-0.1.0.vsix`.
3. Open a supported file and run **Exact File Preview: Open Preview**.

## Privacy

Runs entirely on-device. No account, no telemetry, no network. See
[PRIVACY.md](PRIVACY.md).

## Report a bug

Please include your VS Code version, OS, the file type, and what you saw vs. what
you expected.

## Development

```bash
npm test       # core + command-flow tests
npm run check  # syntax check
```
