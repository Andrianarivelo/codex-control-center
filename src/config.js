'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];

function codexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function configPath() {
  return path.join(codexHome(), 'config.toml');
}

function authPath() {
  return path.join(codexHome(), 'auth.json');
}

function readEffort(text) {
  const match = text.match(/^model_reasoning_effort\s*=\s*["']([^"']+)["']/m);
  return match && EFFORTS.includes(match[1]) ? match[1] : 'medium';
}

function writeEffortText(text, effort) {
  if (!EFFORTS.includes(effort)) {
    throw new Error(`Unsupported reasoning effort: ${effort}`);
  }
  const line = `model_reasoning_effort = "${effort}"`;
  if (/^model_reasoning_effort\s*=.*$/m.test(text)) {
    return text.replace(/^model_reasoning_effort\s*=.*$/m, line);
  }
  const modelLine = /^model\s*=.*$/m;
  if (modelLine.test(text)) {
    return text.replace(modelLine, (value) => `${value}\n${line}`);
  }
  return `${line}\n${text}`;
}

function getEffort() {
  try {
    return readEffort(fs.readFileSync(configPath(), 'utf8'));
  } catch {
    return 'medium';
  }
}

function setEffort(effort) {
  const target = configPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const previous = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  const next = writeEffortText(previous, effort);
  const temporary = `${target}.codex-control.tmp`;
  fs.writeFileSync(temporary, next, 'utf8');
  fs.renameSync(temporary, target);
}

function getModel() {
  try {
    const text = fs.readFileSync(configPath(), 'utf8');
    const match = text.match(/^model\s*=\s*["']([^"']+)["']/m);
    return match ? match[1] : 'Codex default';
  } catch {
    return 'Codex default';
  }
}

module.exports = {
  EFFORTS,
  authPath,
  configPath,
  getEffort,
  getModel,
  readEffort,
  setEffort,
  writeEffortText
};
