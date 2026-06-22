'use strict';
const test = require('node:test');
const assert = require('node:assert');
const core = require('../src/preview-core.js');

// ---- type detection --------------------------------------------------------

test('supported extensions are exactly the beta set', () => {
  assert.deepStrictEqual(core.SUPPORTED, ['.html', '.svg', '.md', '.txt', '.json', '.xml']);
  for (const n of ['a.html', 'b.SVG', 'c.md', 'd.txt', 'e.json', 'f.xml']) {
    assert.strictEqual(core.isSupported(n), true, n);
  }
});

test('unsupported extensions are rejected', () => {
  for (const n of ['a.py', 'b.js', 'c.png', 'noext', 'd.htmlx', '.bashrc']) {
    assert.strictEqual(core.isSupported(n), false, n);
  }
});

test('detectKind maps each type', () => {
  assert.strictEqual(core.detectKind('x.html'), 'html');
  assert.strictEqual(core.detectKind('x.svg'), 'svg');
  assert.strictEqual(core.detectKind('x.md'), 'markdown');
  assert.strictEqual(core.detectKind('x.json'), 'json');
  assert.strictEqual(core.detectKind('x.xml'), 'xml');
  assert.strictEqual(core.detectKind('x.txt'), 'text');
  assert.strictEqual(core.detectKind('x.py'), 'unsupported');
});

// ---- escaping --------------------------------------------------------------

test('escapeHtml neutralises markup', () => {
  assert.strictEqual(core.escapeHtml('<b>"x"&\'</b>'), '&lt;b&gt;&quot;x&quot;&amp;&#39;&lt;/b&gt;');
});

// ---- HTML preview: script must be encapsulated, not inline-executable ------

test('HTML preview wraps content in a sandboxed data: iframe', () => {
  const html = '<h1>hi</h1><script>alert(1)</script>';
  const out = core.buildPreviewDocument({ name: 'a.html', content: html });
  assert.strictEqual(out.kind, 'html');
  assert.match(out.html, /<iframe class="efp-frame" sandbox=""/);
  assert.match(out.html, /src="data:text\/html;charset=utf-8;base64,/);
  // the raw <script> must NOT appear as a live tag in the top-level document
  assert.ok(!out.html.includes('<script>alert(1)</script>'), 'raw script leaked into top document');
  // banner present
  assert.match(out.html, /LOCAL EXACT PREVIEW/);
  assert.match(out.html, /a\.html/);
});

test('webview document carries a strict CSP with no script-src', () => {
  const out = core.buildPreviewDocument({ name: 'a.html', content: '<p>x</p>' });
  assert.match(out.html, /Content-Security-Policy/);
  assert.match(out.html, /default-src 'none'/);
  assert.ok(!/script-src/.test(out.html), 'should not enable any script-src');
});

// ---- SVG preview as a non-executing image ---------------------------------

test('SVG preview renders via a data: <img> (no script execution context)', () => {
  const out = core.buildPreviewDocument({ name: 'logo.svg', content: '<svg><script>x()</script></svg>' });
  assert.strictEqual(out.kind, 'svg');
  assert.match(out.html, /<img class="efp-svg"[^>]*src="data:image\/svg\+xml;base64,/);
  assert.ok(!out.html.includes('<script>x()</script>'));
});

// ---- markdown --------------------------------------------------------------

test('markdown renders headings, emphasis, code and lists', () => {
  const md = '# Title\n\nsome **bold** and _em_ and `code`\n\n- one\n- two\n';
  const html = core.renderMarkdownBasic(md);
  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>em<\/em>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

test('markdown fenced code is escaped, not executed', () => {
  const html = core.renderMarkdownBasic('```\n<script>bad()</script>\n```');
  assert.match(html, /<pre class="efp-code"><code>&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});

test('markdown strips javascript: links but keeps safe ones', () => {
  const html = core.renderMarkdownBasic('[ok](https://example.com) [bad](javascript:alert(1))');
  assert.match(html, /<a href="https:\/\/example\.com"[^>]*>ok<\/a>/);
  assert.ok(!/javascript:/.test(html), 'javascript: URL must be stripped');
  assert.match(html, /bad/); // text kept, link removed
});

test('sanitizeUrl allows safe schemes, rejects dangerous ones', () => {
  assert.strictEqual(core.sanitizeUrl('https://x.com'), 'https://x.com');
  assert.strictEqual(core.sanitizeUrl('mailto:a@b.com'), 'mailto:a@b.com');
  assert.strictEqual(core.sanitizeUrl('#anchor'), '#anchor');
  assert.strictEqual(core.sanitizeUrl('./rel/path'), './rel/path');
  assert.strictEqual(core.sanitizeUrl('javascript:alert(1)'), '');
  assert.strictEqual(core.sanitizeUrl('data:text/html,<x>'), '');
});

// ---- json / xml / text -----------------------------------------------------

test('JSON preview is pretty-printed and escaped', () => {
  const out = core.buildPreviewDocument({ name: 'd.json', content: '{"b":"<x>","a":1}' });
  assert.strictEqual(out.kind, 'json');
  assert.match(out.html, /<pre class="efp-pre">/);
  assert.match(out.html, /&lt;x&gt;/);                 // escaped value
  assert.match(out.html, /&quot;a&quot;: 1/);          // pretty-printed (2-space), quotes escaped
  assert.match(out.html, /\n/);                        // multi-line (pretty-printed)
});

test('invalid JSON falls back to escaped raw text with a note', () => {
  const out = core.buildPreviewDocument({ name: 'd.json', content: '{not json' });
  assert.match(out.html, /not valid JSON/);
  assert.match(out.html, /\{not json/);
});

test('XML and TXT are shown as escaped <pre>', () => {
  const xml = core.buildPreviewDocument({ name: 'x.xml', content: '<a>&b</a>' });
  assert.strictEqual(xml.kind, 'xml');
  assert.match(xml.html, /&lt;a&gt;&amp;b&lt;\/a&gt;/);
  const txt = core.buildPreviewDocument({ name: 'x.txt', content: '<hi>' });
  assert.match(txt.html, /&lt;hi&gt;/);
});

// ---- unsupported + large guard --------------------------------------------

test('unsupported type produces a clear message document', () => {
  const out = core.buildPreviewDocument({ name: 'thing.py', content: 'print(1)' });
  assert.strictEqual(out.unsupported, true);
  assert.match(out.html, /Unsupported file type/);
  assert.match(out.html, /\.py/);
  assert.match(out.html, /Supported types/);
});

test('large files are refused with a readable message and no content', () => {
  const out = core.buildPreviewDocument({ name: 'big.html', content: '<h1>OVER-LIMIT-BODY</h1>', bytes: core.MAX_BYTES + 1 });
  assert.strictEqual(out.tooLarge, true);
  assert.match(out.html, /File too large to preview/);
  assert.match(out.html, /MB preview limit/);
  assert.ok(!out.html.includes('OVER-LIMIT-BODY'), 'must not embed content of an over-limit file');
});

test('formatBytes is human readable', () => {
  assert.strictEqual(core.formatBytes(512), '512 B');
  assert.strictEqual(core.formatBytes(2048), '2.0 KB');
  assert.strictEqual(core.formatBytes(3 * 1024 * 1024), '3.00 MB');
});
