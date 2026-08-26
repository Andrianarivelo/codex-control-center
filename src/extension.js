"use strict";

const path = require("node:path");
const vscode = require("vscode");
const { applyPatch, inspectPatch, restorePatch } = require("./patcher");
const { refreshUsageSnapshot } = require("./usage-snapshot");

let usageTimer;

function activate(context) {
  const output = vscode.window.createOutputChannel("Codex Native Controls");
  context.subscriptions.push(output);
  const codex = () => vscode.extensions.getExtension("openai.chatgpt");
  const assets = path.join(context.extensionPath, "resources");

  async function patch({ promptReload = true } = {}) {
    const extension = codex();
    if (!extension) {
      vscode.window.showErrorMessage(
        "The official OpenAI Codex extension is not installed.",
      );
      return null;
    }
    try {
      const result = applyPatch(extension.extensionPath, assets);
      output.appendLine(`[patch] ${JSON.stringify(result)}`);
      await refreshUsageSnapshot(extension.extensionPath, output);
      if (result.changed && promptReload) {
        const choice = await vscode.window.showInformationMessage(
          "Codex native controls were patched successfully. Reload the window to activate them.",
          "Reload Now",
          "Later",
        );
        if (choice === "Reload Now")
          await vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(`[patch:error] ${message}`);
      vscode.window.showErrorMessage(
        `Codex native controls were not applied: ${message}`,
      );
      return null;
    }
  }

  async function restore() {
    const extension = codex();
    if (!extension) return;
    const answer = await vscode.window.showWarningMessage(
      "Restore the untouched OpenAI Codex interface?",
      { modal: true },
      "Restore",
    );
    if (answer !== "Restore") return;
    const result = restorePatch(extension.extensionPath);
    output.appendLine(`[restore] ${JSON.stringify(result)}`);
    const choice = await vscode.window.showInformationMessage(
      "Original Codex UI restored.",
      "Reload Now",
    );
    if (choice === "Reload Now")
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }

  async function refreshUsage() {
    const extension = codex();
    if (extension) await refreshUsageSnapshot(extension.extensionPath, output);
  }

  function scheduleUsage() {
    if (usageTimer) clearInterval(usageTimer);
    const minutes = vscode.workspace
      .getConfiguration("codexControl")
      .get("updateIntervalMinutes", 5);
    usageTimer = setInterval(refreshUsage, Math.max(1, minutes) * 60 * 1000);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("codexControl.applyPatch", () => patch()),
    vscode.commands.registerCommand("codexControl.restoreOriginal", restore),
    vscode.commands.registerCommand("codexControl.refreshUsage", refreshUsage),
    vscode.commands.registerCommand("codexControl.showDiagnostics", () => {
      const extension = codex();
      output.appendLine(
        `[diagnostics] ${JSON.stringify(extension ? inspectPatch(extension.extensionPath) : { error: "Codex not installed" }, null, 2)}`,
      );
      output.show(true);
    }),
    vscode.extensions.onDidChange(() =>
      setTimeout(() => patch({ promptReload: true }), 1200),
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("codexControl.updateIntervalMinutes"))
        scheduleUsage();
    }),
    { dispose: () => usageTimer && clearInterval(usageTimer) },
  );

  if (
    vscode.workspace
      .getConfiguration("codexControl")
      .get("patchOnStartup", true)
  )
    setTimeout(() => patch({ promptReload: true }), 500);
  else refreshUsage();
  scheduleUsage();
}

function deactivate() {
  if (usageTimer) clearInterval(usageTimer);
}

module.exports = { activate, deactivate };
