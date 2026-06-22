# Exact File Preview 0.1.0 Beta

Tiny free VS Code extension for one job:

Preview the exact selected file in VS Code without starting a server or guessing
your framework.

It adds the command **Exact File Preview: Open Preview** (Command Palette, editor
title, and right-click menus). The file opens in a sandboxed side panel with a
`LOCAL EXACT PREVIEW` banner — no Live Server, no framework magic, no network.

## Validation status

- Automated tests pass: `npm test` (preview core + command flow).
- Every preview type was verified by rendering the exact webview output in a real
  Chromium browser:
  - `.html` renders with CSS applied; an embedded `<script>` did **not** execute.
  - `.svg` renders as an image; its `<script>` did **not** execute.
  - `.md` renders headings/bold/italic/code/lists; a `javascript:` link was
    stripped to plain text.
  - `.json` pretty-printed and escaped; `.xml`/`.txt` shown escaped.
  - Unsupported types show a clear message; files over 2 MB are refused safely.

## Download

- `vscode-exact-file-preview-0.1.0.vsix`

## Supported file types

`.html` · `.svg` · `.md` · `.json` · `.xml` · `.txt`

## Safety

- No backend, no server, no network (CSP `default-src 'none'`).
- No previewed code executes (sandboxed iframe / image, scripting disabled).
- No file is modified. No telemetry, account, or paid tier.

## Install

1. Download the `.vsix`.
2. VS Code → Extensions → `...` → **Install from VSIX…**
   (or `code --install-extension vscode-exact-file-preview-0.1.0.vsix`).
3. Open a supported file and run **Exact File Preview: Open Preview**.

## Bug reports

Please include VS Code version, OS, the file type, and what you saw vs. expected.

Docs included:

- `README.md`
- `PRIVACY.md`
- `KNOWN_LIMITS.md`
- `DEMO_SCRIPT.md`
- `RELEASE_CHECKLIST.md`
