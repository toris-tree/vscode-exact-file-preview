# Privacy

Exact File Preview runs entirely on-device inside VS Code.

- No backend or server.
- No account or sign-in.
- No telemetry or analytics.
- No network requests of any kind (the preview's Content-Security-Policy is
  `default-src 'none'`).
- It only reads the file you ask it to preview. It never writes to or modifies
  any file.
- It never executes the previewed file's code: HTML and SVG are isolated in a
  sandboxed frame / image with scripting disabled.

The extension stores no data and remembers nothing between sessions.
