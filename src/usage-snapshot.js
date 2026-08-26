"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function normalize(window) {
  if (!window || !Number.isFinite(Number(window.used_percent))) return null;
  const used = Math.max(0, Math.min(100, Number(window.used_percent)));
  return {
    remaining: 100 - used,
    resetAt: Number.isFinite(Number(window.reset_at))
      ? Number(window.reset_at)
      : null,
    resetAfterSeconds: Number.isFinite(Number(window.reset_after_seconds))
      ? Number(window.reset_after_seconds)
      : null,
  };
}

async function fetchUsage() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const auth = JSON.parse(
    fs.readFileSync(path.join(home, "auth.json"), "utf8"),
  );
  const token = auth.tokens && auth.tokens.access_token;
  if (!token) throw new Error("Codex access token is unavailable.");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "codex-native-controls/0.2.0",
  };
  if (auth.tokens.account_id)
    headers["chatgpt-account-id"] = auth.tokens.account_id;
  const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`Usage endpoint returned HTTP ${response.status}.`);
  const payload = await response.json();
  return {
    updatedAt: Date.now(),
    primary: normalize(payload.rate_limit && payload.rate_limit.primary_window),
    secondary: normalize(
      payload.rate_limit && payload.rate_limit.secondary_window,
    ),
  };
}

async function refreshUsageSnapshot(extensionPath, output) {
  const target = path.join(
    extensionPath,
    "webview",
    "assets",
    "codex-native-usage.json",
  );
  try {
    const usage = await fetchUsage();
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(usage));
    fs.renameSync(temporary, target);
    output &&
      output.appendLine(
        `[usage] refreshed ${new Date(usage.updatedAt).toISOString()}`,
      );
    return usage;
  } catch (error) {
    output &&
      output.appendLine(
        `[usage:error] ${error instanceof Error ? error.message : String(error)}`,
      );
    return null;
  }
}

module.exports = { fetchUsage, normalize, refreshUsageSnapshot };
