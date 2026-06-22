# Release Checklist

## Install steps

1. Download `vscode-exact-file-preview-0.1.0.vsix`.
2. In VS Code: **Extensions** → `...` → **Install from VSIX…**
   (or `code --install-extension vscode-exact-file-preview-0.1.0.vsix`).
3. Open a supported file and run **Exact File Preview: Open Preview**.

## Supported file types

- `.html` — sandboxed iframe (no scripts)
- `.svg` — image (no scripts)
- `.md` — basic Markdown
- `.json` — pretty-printed escaped text
- `.xml` — escaped text
- `.txt` — escaped text

## What it guarantees

- No server is started.
- No network access (CSP `default-src 'none'`).
- No previewed code is executed.
- No files are modified.
- Files over 2 MB show a size message instead of previewing.

## How to report bugs

Please include:

- VS Code version and OS
- the file type and a small sample if possible
- what the preview showed vs. what you expected

## What not to expect

- No Live Server / dev server
- No framework detection or routing
- No live reload
- No telemetry, account, or paid tier
- Not a broad preview suite — it does one thing
- Not on the VS Code Marketplace yet (install via `.vsix`)
