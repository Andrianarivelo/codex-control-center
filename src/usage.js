'use strict';

const fs = require('node:fs');
const { authPath } = require('./config');

function normalizeWindow(window) {
  if (!window || !Number.isFinite(Number(window.used_percent))) return null;
  const used = Math.max(0, Math.min(100, Number(window.used_percent)));
  const resetAt = Number(window.reset_at);
  const resetAfter = Number(window.reset_after_seconds);
  const seconds = Number.isFinite(resetAfter)
    ? resetAfter
    : Number.isFinite(resetAt)
      ? Math.max(0, resetAt - Date.now() / 1000)
      : null;
  return { used, remaining: 100 - used, resetSeconds: seconds };
}

async function fetchUsage() {
  const auth = JSON.parse(fs.readFileSync(authPath(), 'utf8'));
  const token = auth.tokens && auth.tokens.access_token;
  if (!token) throw new Error('Sign in to Codex first. Authentication token was not found.');
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'User-Agent': 'codex-control-center-vscode/0.1.1'
  };
  if (auth.tokens.account_id) headers['chatgpt-account-id'] = auth.tokens.account_id;
  const response = await fetch('https://chatgpt.com/backend-api/wham/usage', {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Usage service returned HTTP ${response.status}.`);
  const payload = await response.json();
  const limits = payload.rate_limit || {};
  return {
    primary: normalizeWindow(limits.primary_window),
    secondary: normalizeWindow(limits.secondary_window)
  };
}

function formatReset(seconds) {
  if (!Number.isFinite(seconds)) return 'Reset time unavailable';
  const minutes = Math.max(0, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

module.exports = { fetchUsage, formatReset, normalizeWindow };
