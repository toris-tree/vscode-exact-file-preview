/*
 * Exact File Preview - VS Code glue (thin).
 *
 * All preview HTML is built by ./preview-core (pure, unit-tested). This file
 * only wires the command to a sandboxed webview panel and reads the file from
 * disk. It never starts a server, never makes network calls, never executes
 * the previewed file, and never writes to disk.
 */
'use strict';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const core = require('./preview-core');

// ---- one-time first-use feedback prompt ------------------------------------

var FEEDBACK_KEY = 'exactFilePreview.feedbackShown';
var FEEDBACK_DELAY_MS = 2000;

var FEEDBACK_MSG = 'Exact File Preview: saved you time? ⭐ Star the repo or share what file type you use.';
var FEEDBACK_STAR = 'Star on GitHub';
var FEEDBACK_SHARE = 'Share file type';
var REPO_URL = 'https://github.com/toris-tree/vscode-exact-file-preview';
var FEEDBACK_ISSUE_URL = REPO_URL + '/issues/new?labels=feedback&title=Feedback%3A+what+I+use+this+for' +
  '&body=I+use+Exact+File+Preview+for%3A%0A%0A(describe+your+workflow+or+file+type+here)';

function _showFeedbackPromptNow() {
  if (!vscode.window || typeof vscode.window.showInformationMessage !== 'function') {
    return Promise.resolve();
  }
  return vscode.window.showInformationMessage(FEEDBACK_MSG, FEEDBACK_STAR, FEEDBACK_SHARE)
    .then(function (sel) {
      if (!vscode.env || !vscode.env.openExternal || !vscode.Uri || !vscode.Uri.parse) return;
      if (sel === FEEDBACK_STAR) {
        vscode.env.openExternal(vscode.Uri.parse(REPO_URL));
      } else if (sel === FEEDBACK_SHARE) {
        vscode.env.openExternal(vscode.Uri.parse(FEEDBACK_ISSUE_URL));
      }
    });
}

function _maybeScheduleFeedback(context, panel) {
  if (!panel) return;
  if (!context || !context.globalState) return;
  if (context.globalState.get(FEEDBACK_KEY)) return;
  context.globalState.update(FEEDBACK_KEY, true);
  setTimeout(_showFeedbackPromptNow, FEEDBACK_DELAY_MS);
}

function resolveTarget(arg) {
  // From the explorer/editor context menu we get a Uri; from the palette we
  // fall back to the active editor's document.
  if (arg && arg.fsPath) return arg;
  const ed = vscode.window.activeTextEditor;
  if (ed && ed.document && ed.document.uri && ed.document.uri.scheme === 'file') return ed.document.uri;
  return null;
}

function openPreview(arg) {
  try {
    const target = resolveTarget(arg);
    if (!target) {
      vscode.window.showWarningMessage('Exact File Preview: open or select a file first.');
      return;
    }
    const fsPath = target.fsPath;
    const name = path.basename(fsPath);
    const ext = path.extname(name).toLowerCase();

    if (!core.isSupported(name)) {
      vscode.window.showWarningMessage(
        'Exact File Preview: unsupported file type "' + (ext || '(none)') + '". Supported: ' + core.SUPPORTED.join(', ')
      );
      // Still open a panel so the unsupported state is clearly visible.
    }

    let bytes = 0;
    try { bytes = fs.statSync(fsPath).size; } catch (e) { bytes = 0; }

    let content = '';
    if (core.isSupported(name) && bytes <= core.MAX_BYTES) {
      content = fs.readFileSync(fsPath, 'utf8');
    }

    const doc = core.buildPreviewDocument({ name: name, ext: ext, content: content, bytes: bytes });

    const panel = vscode.window.createWebviewPanel(
      'exactFilePreview',
      'Preview: ' + name,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: false,        // webview document runs no JS
        enableCommandUris: false,
        localResourceRoots: [],      // no local file access from the webview
        retainContextWhenHidden: false
      }
    );
    panel.webview.html = doc.html;
    return panel;
  } catch (e) {
    vscode.window.showErrorMessage('Exact File Preview: ' + (e && e.message ? e.message : String(e)));
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('exactFilePreview.openPreview', function (arg) {
      var panel = openPreview(arg);
      _maybeScheduleFeedback(context, panel);
    })
  );
}

function deactivate() {}

module.exports = {
  activate: activate,
  deactivate: deactivate,
  openPreview: openPreview,
  _maybeScheduleFeedback: _maybeScheduleFeedback,
  _showFeedbackPromptNow: _showFeedbackPromptNow,
  FEEDBACK_KEY: FEEDBACK_KEY,
};
