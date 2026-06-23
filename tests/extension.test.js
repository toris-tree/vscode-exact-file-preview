'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const Module = require('node:module');

// ---- mock the 'vscode' module so extension.js can be required in plain Node -

function makeVscode() {
  const calls = { warnings: [], errors: [], panels: [], commands: {}, infos: [], opened: [] };
  const vscode = {
    ViewColumn: { Beside: -2 },
    window: {
      activeTextEditor: null,
      showWarningMessage: (m) => { calls.warnings.push(m); },
      showErrorMessage: (m) => { calls.errors.push(m); },
      showInformationMessage: (msg, ...buttons) => {
        calls.infos.push({ msg, buttons });
        return Promise.resolve(undefined);
      },
      createWebviewPanel: (id, title, col, opts) => {
        const panel = { id, title, col, opts, webview: { html: '' }, subscriptions: [] };
        calls.panels.push(panel);
        return panel;
      }
    },
    commands: {
      registerCommand: (name, fn) => { calls.commands[name] = fn; return { dispose() {} }; }
    },
    env: {
      openExternal: (uri) => { calls.opened.push(String(uri)); return Promise.resolve(true); }
    },
    Uri: {
      file: (p) => ({ fsPath: p, scheme: 'file', toString: () => 'file://' + p }),
      parse: (s) => ({ toString: () => s }),
    }
  };
  return { vscode, calls };
}

function makeContext() {
  const state = {};
  return {
    subscriptions: [],
    globalState: {
      get: (k) => state[k],
      update: (k, v) => { state[k] = v; },
      _state: state,
    }
  };
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

// ---- feedback prompt tests --------------------------------------------------

test('_maybeScheduleFeedback marks globalState on first call with a real panel', () => {
  const { vscode } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const ctx = makeContext();
  const fakePanel = { webview: { html: '' } };

  assert.strictEqual(ctx.globalState.get(ext.FEEDBACK_KEY), undefined);
  ext._maybeScheduleFeedback(ctx, fakePanel);
  assert.strictEqual(ctx.globalState.get(ext.FEEDBACK_KEY), true);
});

test('_maybeScheduleFeedback is idempotent — does not re-mark when already shown', () => {
  const { vscode } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const ctx = makeContext();
  const fakePanel = { webview: { html: '' } };

  ctx.globalState.update(ext.FEEDBACK_KEY, true);
  // Should be a no-op: already set, nothing should throw or change the state
  ext._maybeScheduleFeedback(ctx, fakePanel);
  assert.strictEqual(ctx.globalState.get(ext.FEEDBACK_KEY), true);
});

test('_maybeScheduleFeedback is a no-op when panel is null (failed preview)', () => {
  const { vscode } = makeVscode();
  const ext = loadExtensionWith(vscode);
  const ctx = makeContext();

  ext._maybeScheduleFeedback(ctx, null);
  assert.strictEqual(ctx.globalState.get(ext.FEEDBACK_KEY), undefined);
});

test('_showFeedbackPromptNow opens repo URL when "Star on GitHub" is selected', async () => {
  const { vscode, calls } = makeVscode();
  vscode.window.showInformationMessage = (_msg, ...buttons) => {
    calls.infos.push({ buttons });
    return Promise.resolve('Star on GitHub');
  };
  const ext = loadExtensionWith(vscode);
  await ext._showFeedbackPromptNow();
  assert.strictEqual(calls.opened.length, 1);
  assert.match(calls.opened[0], /github\.com\/toris-tree\/vscode-exact-file-preview/);
  assert.ok(!calls.opened[0].includes('issues'), 'repo root URL, not issues URL');
});

test('_showFeedbackPromptNow opens feedback issue URL when "Share file type" is selected', async () => {
  const { vscode, calls } = makeVscode();
  vscode.window.showInformationMessage = (_msg, ...buttons) => {
    calls.infos.push({ buttons });
    return Promise.resolve('Share file type');
  };
  const ext = loadExtensionWith(vscode);
  await ext._showFeedbackPromptNow();
  assert.strictEqual(calls.opened.length, 1);
  assert.match(calls.opened[0], /issues\/new/);
  assert.match(calls.opened[0], /labels=feedback/);
});
