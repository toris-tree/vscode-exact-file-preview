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
    vscode.commands.registerCommand('exactFilePreview.openPreview', openPreview)
  );
}

function deactivate() {}

module.exports = { activate: activate, deactivate: deactivate, openPreview: openPreview };
