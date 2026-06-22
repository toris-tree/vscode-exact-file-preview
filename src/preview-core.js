/*
 * Exact File Preview - preview core
 *
 * Pure, VS Code-free logic that turns a file's name + bytes + text into a
 * self-contained webview HTML document. Kept separate from the thin VS Code
 * glue so it can be unit-tested in plain Node.
 *
 * Safety principles:
 *   - Never starts a server, never touches the network, never executes the
 *     previewed file's code.
 *   - HTML/SVG are rendered inside a fully sandboxed iframe / <img> (no scripts).
 *   - A strict Content-Security-Policy blocks all network and script access.
 *   - Large files are refused with a readable message.
 */
'use strict';

var SUPPORTED = ['.html', '.svg', '.md', '.txt', '.json', '.xml'];
var MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function extname(name) {
  var n = String(name || '');
  var dot = n.lastIndexOf('.');
  if (dot <= 0) return '';
  return n.slice(dot).toLowerCase();
}

function isSupported(name) {
  return SUPPORTED.indexOf(extname(name)) !== -1;
}

function detectKind(name) {
  switch (extname(name)) {
    case '.html': return 'html';
    case '.svg': return 'svg';
    case '.md': return 'markdown';
    case '.json': return 'json';
    case '.xml': return 'xml';
    case '.txt': return 'text';
    default: return 'unsupported';
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function b64(str) {
  if (typeof Buffer !== 'undefined') return Buffer.from(String(str), 'utf8').toString('base64');
  /* istanbul ignore next - browser fallback, not used in node */
  return btoa(unescape(encodeURIComponent(String(str))));
}

function byteLength(str) {
  if (typeof Buffer !== 'undefined') return Buffer.byteLength(String(str), 'utf8');
  return new Blob([String(str)]).size;
}

// ---- markdown (basic, safe) ------------------------------------------------

function sanitizeUrl(href) {
  var h = String(href).trim();
  if (/^(https?:|mailto:)/i.test(h)) return h;     // explicit safe schemes
  if (/^[#./]/.test(h)) return h;                  // anchors / relative paths
  if (/^[a-z0-9._\-/?=&;%]+$/i.test(h)) return h;  // bare relative path/query
  return '';                                       // reject javascript:, data:, ...
}

function inline(s) {
  var t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, function (m, c) { return '<code>' + c + '</code>'; });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  t = t.replace(/(^|[^_])_([^_\s][^_]*)_/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, txt, href) {
    var safe = sanitizeUrl(href);
    return safe ? '<a href="' + safe + '" rel="noopener noreferrer nofollow">' + txt + '</a>' : txt;
  });
  return t;
}

function renderMarkdownBasic(md) {
  var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
  var html = '';
  var i = 0;
  var inUL = false, inOL = false;
  function closeLists() {
    if (inUL) { html += '</ul>'; inUL = false; }
    if (inOL) { html += '</ol>'; inOL = false; }
  }
  while (i < lines.length) {
    var line = lines[i];
    var fence = /^```/.test(line);
    if (fence) {
      closeLists();
      var code = ''; i++;
      while (i < lines.length && !/^```/.test(lines[i])) { code += lines[i] + '\n'; i++; }
      i++;
      html += '<pre class="efp-code"><code>' + escapeHtml(code) + '</code></pre>';
      continue;
    }
    var h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { closeLists(); var lvl = h[1].length; html += '<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>'; i++; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { closeLists(); html += '<hr>'; i++; continue; }
    var ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) { if (inOL) { html += '</ol>'; inOL = false; } if (!inUL) { html += '<ul>'; inUL = true; } html += '<li>' + inline(ul[1]) + '</li>'; i++; continue; }
    var ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) { if (inUL) { html += '</ul>'; inUL = false; } if (!inOL) { html += '<ol>'; inOL = true; } html += '<li>' + inline(ol[1]) + '</li>'; i++; continue; }
    if (/^\s*$/.test(line)) { closeLists(); i++; continue; }
    closeLists();
    var para = line; i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
           !/^(#{1,6})\s|^```|^\s*[-*+]\s|^\s*\d+\.\s/.test(lines[i])) { para += '\n' + lines[i]; i++; }
    html += '<p>' + inline(para).replace(/\n/g, '<br>') + '</p>';
  }
  closeLists();
  return html;
}

// ---- bodies ----------------------------------------------------------------

function frameBody(content, mime) {
  return '<iframe class="efp-frame" sandbox="" referrerpolicy="no-referrer" ' +
    'src="data:' + mime + ';charset=utf-8;base64,' + b64(content) + '" title="exact preview"></iframe>';
}

function svgBody(content, name) {
  return '<div class="efp-svgwrap"><img class="efp-svg" alt="SVG preview of ' +
    escapeHtml(name) + '" src="data:image/svg+xml;base64,' + b64(content) + '"></div>';
}

function jsonBody(content) {
  var pretty = content, note = '';
  try { pretty = JSON.stringify(JSON.parse(content), null, 2); }
  catch (e) { note = '<p class="efp-note">Showing raw text (not valid JSON: ' + escapeHtml(e.message) + ').</p>'; }
  return note + '<pre class="efp-pre">' + escapeHtml(pretty) + '</pre>';
}

function unsupportedBody(name, ext) {
  return '<div class="efp-msg">' +
    '<h2>Unsupported file type</h2>' +
    '<p><strong>' + escapeHtml(name) + '</strong> has extension <code>' + escapeHtml(ext || '(none)') + '</code>, ' +
    'which Exact File Preview does not support in this beta.</p>' +
    '<p>Supported types: <code>' + SUPPORTED.join('</code> <code>') + '</code></p>' +
    '</div>';
}

function tooLargeBody(name, bytes) {
  return '<div class="efp-msg">' +
    '<h2>File too large to preview</h2>' +
    '<p><strong>' + escapeHtml(name) + '</strong> is ' + formatBytes(bytes) + ', ' +
    'which exceeds the ' + formatBytes(MAX_BYTES) + ' preview limit.</p>' +
    '<p>This limit keeps the preview fast and safe. Open the file in the editor instead.</p>' +
    '</div>';
}

function formatBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(2) + ' MB';
}

var STYLE =
  ':root{color-scheme:light dark}' +
  'body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif}' +
  '.efp-banner{position:sticky;top:0;display:flex;align-items:center;gap:10px;padding:8px 12px;' +
  'background:#0969da;color:#fff;font-size:12px}' +
  '.efp-badge{font-weight:700;letter-spacing:.04em;background:rgba(255,255,255,.18);padding:2px 8px;border-radius:999px}' +
  '.efp-name{font-weight:600;opacity:.95;word-break:break-all}' +
  '.efp-body{padding:0}' +
  '.efp-frame{width:100%;height:calc(100vh - 38px);border:0;background:#fff}' +
  '.efp-svgwrap{padding:16px;text-align:center}' +
  '.efp-svg{max-width:100%;height:auto}' +
  '.efp-pre,.efp-code{margin:16px;padding:12px;background:rgba(127,127,127,.12);border-radius:6px;' +
  'overflow:auto;white-space:pre-wrap;word-break:break-word;font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}' +
  '.efp-md{padding:16px 20px;max-width:900px}' +
  '.efp-md code{background:rgba(127,127,127,.15);padding:.1em .35em;border-radius:4px;font-family:ui-monospace,Consolas,monospace}' +
  '.efp-md pre code{background:none;padding:0}' +
  '.efp-msg{padding:24px}.efp-msg h2{margin-top:0}.efp-note{margin:16px 16px 0;color:#9a6700}';

function docShell(name, body) {
  var csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src data:;";
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="' + csp + '">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Preview: ' + escapeHtml(name) + '</title><style>' + STYLE + '</style></head><body>' +
    '<header class="efp-banner"><span class="efp-badge">LOCAL EXACT PREVIEW</span>' +
    '<span class="efp-name">' + escapeHtml(name) + '</span></header>' +
    '<main class="efp-body">' + body + '</main></body></html>';
}

/**
 * Build the full webview HTML document for a file.
 * @param {Object} opts
 * @param {string} opts.name     file name (with extension)
 * @param {string} [opts.ext]    extension override (".html" etc.)
 * @param {string} [opts.content] file text (omit/empty if too large/unsupported)
 * @param {number} [opts.bytes]  byte size on disk (defaults to content length)
 * @returns {{kind:string, html:string, unsupported?:boolean, tooLarge?:boolean}}
 */
function buildPreviewDocument(opts) {
  opts = opts || {};
  var name = opts.name || 'file';
  var ext = (opts.ext || extname(name)).toLowerCase();
  var kind = detectKind(name);
  var content = opts.content || '';
  var bytes = typeof opts.bytes === 'number' ? opts.bytes : byteLength(content);

  if (kind === 'unsupported') {
    return { kind: kind, unsupported: true, html: docShell(name, unsupportedBody(name, ext)) };
  }
  if (bytes > MAX_BYTES) {
    return { kind: kind, tooLarge: true, html: docShell(name, tooLargeBody(name, bytes)) };
  }

  var body;
  if (kind === 'html') body = frameBody(content, 'text/html');
  else if (kind === 'svg') body = svgBody(content, name);
  else if (kind === 'markdown') body = '<div class="efp-md">' + renderMarkdownBasic(content) + '</div>';
  else if (kind === 'json') body = jsonBody(content);
  else body = '<pre class="efp-pre">' + escapeHtml(content) + '</pre>'; // xml, text

  return { kind: kind, html: docShell(name, body) };
}

module.exports = {
  SUPPORTED: SUPPORTED,
  MAX_BYTES: MAX_BYTES,
  extname: extname,
  isSupported: isSupported,
  detectKind: detectKind,
  escapeHtml: escapeHtml,
  sanitizeUrl: sanitizeUrl,
  renderMarkdownBasic: renderMarkdownBasic,
  formatBytes: formatBytes,
  buildPreviewDocument: buildPreviewDocument
};
