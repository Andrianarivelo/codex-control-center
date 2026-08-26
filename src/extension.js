'use strict';

const fs = require('node:fs');
const vscode = require('vscode');
const { EFFORTS, configPath, getEffort, getModel, setEffort } = require('./config');
const { fetchUsage, formatReset } = require('./usage');
const { panelHtml } = require('./panel');

let panel;
let effortItem;
let usageItem;
let compactItem;
let usage;
let usageError = '';
let timer;

function titleCase(value) {
  return value === 'xhigh' ? 'X-High' : value.charAt(0).toUpperCase() + value.slice(1);
}

function state() {
  return {
    effort: getEffort(),
    model: getModel(),
    usage,
    usageError,
    primaryReset: usage && usage.primary ? formatReset(usage.primary.resetSeconds) : '',
    secondaryReset: usage && usage.secondary ? formatReset(usage.secondary.resetSeconds) : ''
  };
}

function render() {
  const current = state();
  effortItem.text = `$(lightbulb) ${titleCase(current.effort)}`;
  effortItem.tooltip = `Codex reasoning effort: ${current.effort}\nClick to open the slider.`;
  if (current.usage && current.usage.primary) {
    const remaining = current.usage.primary.remaining;
    const filled = Math.round(remaining / 20);
    usageItem.text = `$(pulse) ${'▰'.repeat(filled)}${'▱'.repeat(5 - filled)} ${remaining.toFixed(0)}%`;
    usageItem.tooltip = `Codex allowance remaining\n5-hour: ${remaining.toFixed(1)}% (${current.primaryReset})\nWeekly: ${current.usage.secondary ? `${current.usage.secondary.remaining.toFixed(1)}% (${current.secondaryReset})` : 'Unavailable'}\nClick to refresh.`;
    usageItem.color = remaining <= 10 ? new vscode.ThemeColor('errorForeground') : remaining <= 25 ? new vscode.ThemeColor('editorWarning.foreground') : undefined;
  } else {
    usageItem.text = usageError ? '$(warning) Usage' : '$(sync~spin) Usage';
    usageItem.tooltip = usageError || 'Loading Codex usage...';
  }
  usageItem.command = 'codexControl.refreshUsage';
  usageItem.show();
  if (!vscode.workspace.getConfiguration('codexControl').get('showUsageInStatusBar', true)) usageItem.hide();
  if (panel) panel.webview.html = panelHtml(current);
}

async function changeEffort(effort) {
  setEffort(effort);
  render();
  vscode.window.setStatusBarMessage(`Codex reasoning set to ${titleCase(effort)}`, 2500);
}

async function selectEffort() {
  const current = getEffort();
  const choice = await vscode.window.showQuickPick(EFFORTS.map((effort) => ({
    label: `${effort === current ? '$(check)' : '$(circle-outline)'} ${titleCase(effort)}`,
    description: effort === current ? 'Current' : '',
    effort
  })), { placeHolder: 'Select Codex reasoning effort', title: 'Codex Control Center' });
  if (choice) await changeEffort(choice.effort);
}

async function compactConversation() {
  const config = vscode.workspace.getConfiguration('codexControl');
  if (config.get('confirmCompaction', false)) {
    const answer = await vscode.window.showWarningMessage('Open the Codex compaction action for the active conversation?', { modal: true }, 'Continue');
    if (answer !== 'Continue') return;
  }
  try {
    await vscode.commands.executeCommand('chatgpt.openSidebar');
    await vscode.commands.executeCommand('chatgpt.openCommandMenu');
  } catch {
    await vscode.env.clipboard.writeText('/compact');
    vscode.window.showInformationMessage('The Codex command menu was unavailable. /compact was copied to your clipboard.');
  }
}

async function refreshUsage(notifyOnError = true) {
  usageError = '';
  render();
  try {
    usage = await fetchUsage();
  } catch (error) {
    usage = null;
    usageError = error instanceof Error ? error.message : String(error);
    if (notifyOnError) vscode.window.showWarningMessage(`Codex usage could not be refreshed: ${usageError}`);
  }
  render();
}

function openPanel(context) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
    render();
    return;
  }
  panel = vscode.window.createWebviewPanel('codexControl.center', 'Codex Control Center', vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.svg');
  panel.onDidDispose(() => { panel = undefined; });
  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.type === 'effort') await changeEffort(message.value);
    if (message.type === 'compact') await compactConversation();
    if (message.type === 'refresh') await refreshUsage();
  });
  render();
}

function scheduleUsageRefresh() {
  if (timer) clearInterval(timer);
  const minutes = vscode.workspace.getConfiguration('codexControl').get('updateIntervalMinutes', 5);
  timer = setInterval(() => refreshUsage(false), Math.max(1, minutes) * 60 * 1000);
}

function activate(context) {
  effortItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 103);
  effortItem.command = 'codexControl.open';
  effortItem.show();
  compactItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 102);
  compactItem.text = '$(archive) Compact';
  compactItem.tooltip = 'Open the Codex command menu to compact the active conversation.';
  compactItem.command = 'codexControl.compact';
  compactItem.show();
  usageItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 101);

  context.subscriptions.push(
    effortItem,
    compactItem,
    usageItem,
    vscode.commands.registerCommand('codexControl.open', () => openPanel(context)),
    vscode.commands.registerCommand('codexControl.selectEffort', selectEffort),
    vscode.commands.registerCommand('codexControl.compact', compactConversation),
    vscode.commands.registerCommand('codexControl.refreshUsage', () => refreshUsage()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codexControl')) {
        scheduleUsageRefresh();
        render();
      }
    })
  );

  try {
    const watcher = fs.watch(configPath(), { persistent: false }, () => setTimeout(render, 80));
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch {
    // The configuration file may not exist before the first Codex run.
  }
  render();
  refreshUsage(false);
  scheduleUsageRefresh();
}

function deactivate() {
  if (timer) clearInterval(timer);
}

module.exports = { activate, deactivate };
