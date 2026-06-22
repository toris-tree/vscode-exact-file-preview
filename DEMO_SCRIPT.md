# 30-Second Demo Script

1. Open a folder with a few files: an `.html`, an `.svg`, and a `.md`.
2. Right-click the `.html` file in the Explorer → **Exact File Preview: Open Preview**.
3. The page renders beside the editor with a `LOCAL EXACT PREVIEW` banner — exactly
   as written, with CSS applied and no dev server started.
4. Point out that any `<script>` in the file did **not** run (sandboxed).
5. Run the command on the `.svg` — it renders as an image.
6. Run it on the `.md` — basic Markdown renders (headings, bold, lists, code).
7. Run it on an unsupported file (e.g. `.py`) — a clear "Unsupported file type"
   message appears.
8. End with: "It previews the exact file, locally, with no server and no
   framework guessing."
