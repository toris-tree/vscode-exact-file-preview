# Known Limits

- Supported file types in this beta are exactly: `.html`, `.svg`, `.md`, `.txt`,
  `.json`, `.xml`. Everything else shows an "Unsupported file type" message.
- Because the preview runs with **no network and no scripts**, HTML files that
  rely on external CSS/JS/images, fonts from the web, or JavaScript to render
  will look incomplete. This is intentional: it is an exact *static* preview, not
  a browser or a dev server.
- SVG is shown as an image, so script-driven or externally-referenced SVG
  features will not run.
- Markdown rendering is basic on purpose: headings, bold/italic, inline code,
  fenced code blocks, lists, links (sanitized), and horizontal rules. It is not a
  full CommonMark/GFM engine (no tables, footnotes, or embedded HTML).
- `javascript:` and other non-safe link schemes in Markdown are stripped to plain
  text.
- Files larger than 2 MB are not previewed; you get a size message instead.
- There is no live reload. Re-run the command to refresh the preview.
- No framework detection, no routing, no URL rewriting, and no project-wide
  behavior — by design.
- Not published to the VS Code Marketplace yet; install via the `.vsix`.
