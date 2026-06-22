'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const Module = require('node:module');

// ---- mock the 'vscode' module so extension.js can be required in plain Node -

function makeVscode() {
  const calls = { warnings: [], errors: [], panels: [], commands: {} };
  const vscode = {
    ViewColumn: { Beside: -2 },
    window: {
      activeTextEditor: null,
      showWarningMessage: (m) => { calls.warnings.push(m); },
      showErrorMessage: (m) => { calls.errors.push(m); },
      createWebviewPanel: (id, title, col, opts) => {
        const panel = { id, title, col, opts, webview: { html: '' }, subscriptions: [] };
        calls.panels.push(panel);
        return panel;
      }
    },
    commands: {
      registerCommand: (name, fn) => { calls.commands[name] = fn; return { dispose() {} }; }
    },
    Uri: { file: (p) => ({ fsPath: p, scheme: 'file' }) }
  };
  return { vscode, calls };
}

function loadExtensionWith(vscode) {
  const orig = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'vscode') return vscode;
    return orig.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[require.resolve('../src/extension.js')];
    return require('../src/extension.js');
  } finally {
    Module._load = orig;
  }
}

const SAMPLES = path.join(__dirname, '..', 'samples');

test('activate registers the openPreview command', () => {
  const { vscode, calls } = makeVscode();
  const ext = loadExtensionWith(vscode);
  ext.activate({ subscriptions: [] });
  assert.ok(typeof calls.commands['exactFilePreview.openPreview'] === 'function');
});

test('previewing a supported HTML file opens a sandboxed webview panel', () => {
  const { vscode, calls } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const panel = ext.openPreview({ fsPath: path.join(SAMPLES, 'sample.html') });
  assert.ok(panel, 'a panel should be created');
  assert.strictEqual(panel.opts.enableScripts, false);
  assert.match(panel.webview.html, /LOCAL EXACT PREVIEW/);
  assert.match(panel.webview.html, /sample\.html/);
  assert.match(panel.webview.html, /<iframe class="efp-frame" sandbox=""/);
  assert.strictEqual(calls.warnings.length, 0);
});

test('previewing an unsupported file warns AND shows an unsupported panel', () => {
  const { vscode, calls } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const panel = ext.openPreview({ fsPath: path.join(SAMPLES, 'sample.unsupported.py') });
  assert.strictEqual(calls.warnings.length, 1);
  assert.match(calls.warnings[0], /unsupported file type/i);
  assert.match(panel.webview.html, /Unsupported file type/);
});

test('with no argument and no active editor, it warns instead of throwing', () => {
  const { vscode, calls } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const r = ext.openPreview(undefined);
  assert.strictEqual(r, undefined);
  assert.strictEqual(calls.warnings.length, 1);
  assert.match(calls.warnings[0], /open or select a file/i);
});

test('falls back to the active editor document when invoked from the palette', () => {
  const { vscode, calls } = makeVscode();
  vscode.window.activeTextEditor = {
    document: { uri: { fsPath: path.join(SAMPLES, 'sample.md'), scheme: 'file' } }
  };
  const ext = loadExtensionWith(vscode);
  const panel = ext.openPreview(undefined);
  assert.ok(panel);
  assert.match(panel.webview.html, /sample\.md/);
  assert.match(panel.webview.html, /efp-md/);
});
