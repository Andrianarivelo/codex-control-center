"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { version: PATCH_VERSION } = require("../package.json");

const BEGIN = "<!-- CODEX_NATIVE_CONTROLS_BEGIN -->";
const END = "<!-- CODEX_NATIVE_CONTROLS_END -->";
const INJECTION = `${BEGIN}\n    <link rel="stylesheet" href="./assets/codex-native-controls.css?v=${PATCH_VERSION}" />\n    <script type="module" src="./assets/codex-native-controls.js?v=${PATCH_VERSION}" data-codex-control-version="${PATCH_VERSION}"></script>\n    ${END}`;
const INJECTION_PATTERN = new RegExp(`${BEGIN}[\\s\\S]*?${END}`, "g");
const ASSETS = ["codex-native-controls.css", "codex-native-controls.js"];
const CLEANUP_ASSETS = [...ASSETS, "codex-native-usage.json"];

function paths(extensionPath) {
  const webview = path.join(extensionPath, "webview");
  return {
    html: path.join(webview, "index.html"),
    backup: path.join(webview, "index.html.codex-native-controls.backup"),
    assets: path.join(webview, "assets"),
  };
}

function atomicWrite(target, data) {
  const temporary = `${target}.codex-native-controls.tmp`;
  fs.writeFileSync(temporary, data);
  fs.renameSync(temporary, target);
}

function patchHtml(html) {
  const hasBegin = html.includes(BEGIN);
  const hasEnd = html.includes(END);
  if (hasBegin !== hasEnd)
    throw new Error(
      "A partial Codex Native Controls marker was found. Restore the original UI before repairing the patch.",
    );
  if (hasBegin) return html.replace(INJECTION_PATTERN, INJECTION);
  if (
    !html.includes("<!-- PROD_CSP_TAG_HERE -->") ||
    !html.includes("</head>") ||
    !html.includes('id="root"')
  ) {
    throw new Error(
      "This Codex webview version does not match the validated HTML structure. No files were changed.",
    );
  }
  return html.replace("</head>", `${INJECTION}\n  </head>`);
}

function unpatchHtml(html) {
  return html.replace(
    new RegExp(`${BEGIN}[\\s\\S]*?${END}\\s*`, "g"),
    "",
  );
}

function validateExtension(extensionPath) {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionPath, "package.json"), "utf8"),
  );
  if (manifest.publisher !== "openai" || manifest.name !== "chatgpt")
    throw new Error(
      "Refusing to patch a directory that is not the official openai.chatgpt extension.",
    );
  return manifest.version;
}

function applyPatch(extensionPath, sourceAssetDirectory) {
  const version = validateExtension(extensionPath);
  const target = paths(extensionPath);
  const original = fs.readFileSync(target.html, "utf8");
  const patched = patchHtml(original);
  const sourceAssets = Object.fromEntries(
    ASSETS.map((asset) => {
      const source = path.join(sourceAssetDirectory, asset);
      if (!fs.existsSync(source))
        throw new Error(`Patch asset is missing: ${asset}`);
      return [asset, fs.readFileSync(source)];
    }),
  );
  const htmlChanged = patched !== original;
  const assetsChanged = ASSETS.some((asset) => {
    const destination = path.join(target.assets, asset);
    return (
      !fs.existsSync(destination) ||
      !fs.readFileSync(destination).equals(sourceAssets[asset])
    );
  });
  fs.mkdirSync(target.assets, { recursive: true });
  if (!fs.existsSync(target.backup))
    atomicWrite(target.backup, Buffer.from(unpatchHtml(original), "utf8"));
  for (const asset of ASSETS)
    atomicWrite(path.join(target.assets, asset), sourceAssets[asset]);
  if (htmlChanged) atomicWrite(target.html, Buffer.from(patched, "utf8"));
  const inspection = inspectPatch(extensionPath);
  if (!inspection.valid)
    throw new Error(
      "Post-write validation failed. Use Restore Original Codex UI.",
    );
  return {
    changed: htmlChanged || assetsChanged,
    htmlChanged,
    assetsChanged,
    version,
    ...inspection,
  };
}

function inspectPatch(extensionPath) {
  const target = paths(extensionPath);
  const html = fs.existsSync(target.html)
    ? fs.readFileSync(target.html, "utf8")
    : "";
  const injected = html.includes(BEGIN) && html.includes(END);
  const assets = Object.fromEntries(
    ASSETS.map((asset) => [
      asset,
      fs.existsSync(path.join(target.assets, asset)),
    ]),
  );
  return {
    extensionPath,
    injected,
    backupExists: fs.existsSync(target.backup),
    assets,
    valid: injected && Object.values(assets).every(Boolean),
  };
}

function restorePatch(extensionPath) {
  validateExtension(extensionPath);
  const target = paths(extensionPath);
  if (!fs.existsSync(target.html)) return { changed: false };
  const current = fs.readFileSync(target.html, "utf8");
  const restored = fs.existsSync(target.backup)
    ? fs.readFileSync(target.backup)
    : Buffer.from(unpatchHtml(current), "utf8");
  atomicWrite(target.html, restored);
  for (const asset of CLEANUP_ASSETS) {
    const file = path.join(target.assets, asset);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  if (fs.existsSync(target.backup)) fs.unlinkSync(target.backup);
  return { changed: true, extensionPath };
}

module.exports = {
  ASSETS,
  BEGIN,
  END,
  PATCH_VERSION,
  applyPatch,
  inspectPatch,
  patchHtml,
  restorePatch,
  unpatchHtml,
};
